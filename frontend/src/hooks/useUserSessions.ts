import { useState, useEffect, useCallback, useRef } from "react"
import { ISession } from "@/types/session"
import { sessionsService } from "@/services"

export function useUserSessions() {
  const [sessions, setSessions] = useState<ISession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      const response = await sessionsService.getUserSessions()
      setSessions(response.data.records)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshSessions = useCallback(async () => {
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
  }, [])

  // Debounced refresh to avoid multiple rapid calls
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    refreshTimeoutRef.current = setTimeout(() => {
      refreshSessions()
    }, 1000) // 1 second delay
  }, [refreshSessions])

  useEffect(() => {
    loadSessions()

    const handleRefresh = () => {
      debouncedRefresh()
    }

    const handleSessionUpdate = () => {
      debouncedRefresh()
    }

    window.addEventListener('refreshSessions', handleRefresh)
    window.addEventListener('sessionUpdated', handleSessionUpdate)

    return () => {
      window.removeEventListener('refreshSessions', handleRefresh)
      window.removeEventListener('sessionUpdated', handleSessionUpdate)
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [loadSessions, debouncedRefresh])

  const deleteSession = async (id: number) => {
    try {
      await sessionsService.deleteSession(id)
      setSessions(prev => prev.filter(session => session.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session")
    }
  }

  return { sessions, isLoading, error, deleteSession, refreshSessions }
}
