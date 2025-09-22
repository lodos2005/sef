import { useState, useEffect, useCallback, useRef } from "react"
import { ChatSession } from "@/types/chat"

export function useChatSession(sessionId: string | string[] | undefined) {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollCountRef = useRef(0)

  const loadSession = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/v1/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.status}`)
      }
      const data = await response.json()
      setSession(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session")
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  const refreshSession = useCallback(() => {
    loadSession()
  }, [loadSession])

  // Polling function for summary updates
  const startSummaryPolling = useCallback(() => {
    if (!sessionId || !session) return

    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/sessions/${sessionId}`)
        if (!response.ok) return

        const data = await response.json()
        
        // Check if summary was generated
        if (data.summary && (!session.summary || data.summary !== session.summary)) {
          setSession(data)
          // Stop polling once summary is found
          if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current)
          }
          pollCountRef.current = 0
          
          // Trigger sidebar refresh and session update events
          window.dispatchEvent(new Event('refreshSessions'))
          window.dispatchEvent(new Event('sessionUpdated'))
          return
        }

        // Continue polling with exponential backoff (max 30 seconds)
        pollCountRef.current++
        if (pollCountRef.current < 10) { // Max 10 attempts
          const delay = Math.min(2000 * Math.pow(1.5, pollCountRef.current), 30000)
          pollTimeoutRef.current = setTimeout(poll, delay)
        }
      } catch (err) {
        console.warn("Session polling failed:", err)
      }
    }

    // Start polling after a short delay
    pollTimeoutRef.current = setTimeout(poll, 3000)
  }, [sessionId, session])

  const stopSummaryPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
    }
    pollCountRef.current = 0
  }, [])

  useEffect(() => {
    if (!sessionId) return

    loadSession()

    // Listen for session refresh events
    const handleRefresh = () => {
      refreshSession()
    }

    window.addEventListener('refreshSession', handleRefresh)

    return () => {
      window.removeEventListener('refreshSession', handleRefresh)
      stopSummaryPolling()
    }
  }, [sessionId, loadSession, refreshSession, stopSummaryPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSummaryPolling()
    }
  }, [stopSummaryPolling])

  return { 
    session, 
    isLoading, 
    error, 
    refreshSession, 
    startSummaryPolling, 
    stopSummaryPolling 
  }
}
