"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/router"
import { Chat } from "@/components/ui/chat"
import { useChatSession } from "@/hooks/useChatSession"
import { useMessages } from "@/hooks/useMessages"
import { useSendMessage } from "@/hooks/useSendMessage"
import { ChatHeader, ErrorBanner, LoadingSpinner, ErrorPage } from "@/components/chat"

export default function ChatPage() {
  const router = useRouter()
  const { id: sessionId } = router.query

  const [input, setInput] = useState("")
  const [isPollingForSummary, setIsPollingForSummary] = useState(false)

  const { 
    session, 
    isLoading: sessionLoading, 
    error: sessionError, 
    refreshSession, 
    startSummaryPolling 
  } = useChatSession(sessionId)
  const { messages, setMessages, isLoading: messagesLoading, error: messagesError } = useMessages(sessionId)
  
  const handleMessageComplete = useCallback(() => {
    // Only start polling if there's no summary yet
    if (session && !session.summary) {
      setIsPollingForSummary(true)
      startSummaryPolling()
      // Stop polling indicator after 30 seconds max
      setTimeout(() => setIsPollingForSummary(false), 30000)
    }
    // Also refresh sidebar sessions
    window.dispatchEvent(new Event('refreshSessions'))
  }, [startSummaryPolling, session])
  
  const { sendMessage, isGenerating, error: sendError } = useSendMessage(sessionId, setMessages, handleMessageComplete)

  // Stop polling indicator when summary appears
  useEffect(() => {
    if (session?.summary) {
      setIsPollingForSummary(false)
    }
  }, [session?.summary])

  const isLoading = sessionLoading || messagesLoading
  const error = sessionError || messagesError || sendError

  const handleSubmit = useCallback(async (event?: any, options?: { experimental_attachments?: FileList }) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }

    if (!input.trim()) return

    await sendMessage(input.trim())
    setInput("")
  }, [input, sendMessage])

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }, [])

  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  if (isLoading) {
    return <LoadingSpinner isLoading={true} />
  }

  if (error && !session) {
    return <ErrorPage error={error} onRetry={handleRetry} />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.05rem)] p-0">
      <ChatHeader session={session || undefined} isPolling={isPollingForSummary} />
      <ErrorBanner error={error} />

      <div className="flex-1 min-h-0">
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
  )
}
