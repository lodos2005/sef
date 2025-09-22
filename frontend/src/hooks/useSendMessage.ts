import { useState, useCallback } from "react"
import { Message } from "@/types/chat"

export function useSendMessage(
  sessionId: string | string[] | undefined, 
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  onMessageComplete?: () => void
) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      createdAt: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsGenerating(true)
    setError(null)

    let retryCount = 0
    const maxRetries = 3
    let assistantMessageId = (Date.now() + 1).toString()

    while (retryCount < maxRetries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout

        const response = await fetch(`/api/v1/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            content: content.trim(),
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error("Mesaj gönderilirken hata oluştu")
        }

        // Handle JSON streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let assistantContent = ""
        let buffer = ""
        let lastActivityTime = Date.now()

        // Add empty assistant message
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          createdAt: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            lastActivityTime = Date.now()
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || "" // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === "") continue
              try {
                const parsed = JSON.parse(line)
                if (parsed.type === "chunk") {
                  assistantContent += parsed.data
                  // Update the assistant message in real-time
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  ))
                } else if (parsed.type === "done") {
                  setIsGenerating(false) // Set generating to false when done
                  // Trigger callback for session updates (summary polling)
                  if (onMessageComplete) {
                    onMessageComplete()
                  }
                  return // Success - exit retry loop
                } else if (parsed.type === "ping") {
                  // Keep-alive ping, do nothing
                  continue
                }
              } catch (e) {
                console.error("Failed to parse JSON line:", e, "Line:", line)
              }
            }
          }
        }
        setIsGenerating(false) // Set generating to false when stream completes successfully
        // Trigger callback for session updates (summary polling)
        if (onMessageComplete) {
          onMessageComplete()
        }
        return // Success - exit retry loop

      } catch (err) {
        console.error(`Attempt ${retryCount + 1} failed:`, err)
        retryCount++
        
        if (retryCount < maxRetries) {
          // Remove the failed assistant message before retrying
          setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
          assistantMessageId = (Date.now() + retryCount + 1).toString()
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
          continue
        } else {
          // All retries failed
          setError(err instanceof Error ? err.message : "Mesaj gönderilirken hata oluştu")
          // Remove the failed assistant message
          setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
        }
      }
    }
    
    setIsGenerating(false)
  }, [sessionId, setMessages, onMessageComplete])

  return { sendMessage, isGenerating, error }
}
