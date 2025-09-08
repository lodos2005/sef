import { useState, useEffect } from "react"
import { ChatSession } from "@/types/chat"

export function useChatSession(sessionId: string | string[] | undefined) {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const loadSession = async () => {
      try {
        const response = await fetch(`/api/v1/sessions/${sessionId}`)
        if (!response.ok) {
          throw new Error(`Failed to load session: ${response.status}`)
        }
        const data = await response.json()
        setSession(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session")
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId])

  return { session, isLoading, error }
}
