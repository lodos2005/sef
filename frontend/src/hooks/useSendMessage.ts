import { useState, useCallback } from "react"
import { Message } from "@/types/chat"

export function useSendMessage(sessionId: string | string[] | undefined, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) {
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

    try {
      const response = await fetch(`/api/v1/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      // Handle JSON streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""
      let assistantMessageId = (Date.now() + 1).toString()
      let buffer = ""

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
                break
              }
            } catch (e) {
              console.error("Failed to parse JSON line:", e, "Line:", line)
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
      // Remove the failed assistant message
      setMessages(prev => prev.filter(msg => msg.id !== (Date.now() + 1).toString()))
    } finally {
      setIsGenerating(false)
    }
  }, [sessionId, setMessages])

  return { sendMessage, isGenerating, error }
}
