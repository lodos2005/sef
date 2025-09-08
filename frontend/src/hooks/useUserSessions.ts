import { useState, useEffect } from "react"
import { ISession } from "@/types/session"
import { sessionsService } from "@/services"

export function useUserSessions() {
  const [sessions, setSessions] = useState<ISession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await sessionsService.getUserSessions()
        setSessions(response.data.records)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions")
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [])

  return { sessions, isLoading, error }
}
