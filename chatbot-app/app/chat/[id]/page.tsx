"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { Chat } from "@/components/ui/chat"
import { Message } from "@/components/ui/chat-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ChatSession {
  id: number
  title: string
  chatbot: {
    id: number
    name: string
    description: string
  }
}

interface ApiMessage {
  id: number
  role: "user" | "assistant"
  content: string
  created_at: string
}

export default function ChatPage() {
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [input, setInput] = useState("")
  
  // Use ref to track current assistant message content
  const currentAssistantContent = useRef<string>("")
  const currentAssistantId = useRef<string>("")

  // Load session and messages
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadSession(), loadMessages()])
    }
    loadData()
  }, [sessionId])

  // Use effect to track content changes
  useEffect(() => {
    const assistantMessage = messages.find(msg => msg.role === 'assistant' && msg.content)
  }, [messages])

  const loadSession = async () => {
    try {
      console.log("Loading session for ID:", sessionId)
      const response = await fetch(`/api/v1/chats/${sessionId}`)
      console.log("Session response status:", response.status)
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.status}`)
      }
      const data = await response.json()
      console.log("Session data:", data)
      setSession(data.session)
    } catch (err) {
      console.error("Session load error:", err)
      setError(err instanceof Error ? err.message : "Failed to load session")
    }
  }

  const loadMessages = async () => {
    try {
      console.log("Loading messages for session ID:", sessionId)
      const response = await fetch(`/api/v1/chats/${sessionId}/messages`)
      console.log("Messages response status:", response.status)
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`)
      }
      const data = await response.json()
      const formattedMessages: Message[] = data.messages.map((msg: ApiMessage) => ({
        id: msg.id.toString(),
        role: msg.role,
        content: msg.content,
        createdAt: new Date(msg.created_at),
      }))
      setMessages(formattedMessages)
    } catch (err) {
      console.error("Messages load error:", err)
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = useCallback(async (event?: any, options?: { experimental_attachments?: FileList }) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }

    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      createdAt: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsGenerating(true)
    setError(null)

    // Clear input immediately
    const messageContent = input.trim()
    setInput("")

    try {
      const response = await fetch(`/api/v1/chats/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content: messageContent,
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
                console.log("Stream completed")
                break
              }
            } catch (e) {
              console.error("Failed to parse JSON line:", e, "Line:", line)
            }
          }
        }
      }

    } catch (err) {
      console.error("Error in handleSubmit:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
      // Remove the failed assistant message
      setMessages(prev => prev.filter(msg => msg.id !== (Date.now() + 1).toString()))
    } finally {
      setIsGenerating(false)
    }
  }, [sessionId, input])

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 w-full"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg">{session?.title || "Chat"}</h1>
            {session?.chatbot && (
              <span className="text-sm text-muted-foreground">
                with {session.chatbot.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 px-4 py-2">
          <Alert className="mx-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
            <Chat
              messages={messages}
              handleSubmit={handleSubmit}
              input={input}
              handleInputChange={handleInputChange}
              isGenerating={isGenerating}
              setMessages={setMessages}
              className="h-full"
            />
        </div>
      </div>
    </div>
  )
}