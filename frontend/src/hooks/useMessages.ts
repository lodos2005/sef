import { useState, useEffect } from "react"
import { Message, ApiMessage } from "@/types/chat"

export function useMessages(sessionId: string | string[] | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/v1/sessions/${sessionId}/messages`)
        if (!response.ok) {
          throw new Error(`Failed to load messages: ${response.status}`)
        }
        const data = await response.json()
        const formattedMessages: Message[] = data.map((msg: ApiMessage) => ({
          id: msg.id.toString(),
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.created_at),
        }))
        setMessages(formattedMessages)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages")
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [sessionId])

  return { messages, setMessages, isLoading, error }
}
