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

  const deleteSession = async (id: number) => {
    try {
      await sessionsService.deleteSession(id)
      setSessions(prev => prev.filter(session => session.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session")
    }
  }

  const refreshSessions = async () => {
    setIsLoading(true)
    try {
      const response = await sessionsService.getUserSessions()
      setSessions(response.data.records)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions")
    } finally {
      setIsLoading(false)
    }
  }

  return { sessions, isLoading, error, deleteSession, refreshSessions }
}
