"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { Chat } from "@/components/ui/chat"
import { useChatSession } from "@/hooks/useChatSession"
import { useMessages } from "@/hooks/useMessages"
import { useSendMessage } from "@/hooks/useSendMessage"
import { ChatHeader, ErrorBanner, LoadingSpinner, ErrorPage } from "@/components/chat"

export default function ChatPage() {
  const router = useRouter()
  const { id: sessionId } = router.query
  const { t } = useTranslation("common")

  const [input, setInput] = useState("")
  const [isPollingForSummary, setIsPollingForSummary] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)

  // Default prompt suggestions if none are provided by the chatbot
  const defaultSuggestions = [
    t("chat.default_suggestion_1"),
    t("chat.default_suggestion_2"),
    t("chat.default_suggestion_3"),
  ]

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

  const handleWebSearchToggle = useCallback((enabled: boolean) => {
    setWebSearchEnabled(enabled)
  }, [])

  const isLoading = sessionLoading || messagesLoading
  const error = sessionError || messagesError || sendError

  const handleSubmit = useCallback(async (event?: any, options?: { experimental_attachments?: FileList }) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }

    if (!input.trim()) return

    await sendMessage(input.trim(), webSearchEnabled)
    setInput("")
    setWebSearchEnabled(false) // Reset web search toggle after sending
  }, [input, sendMessage, webSearchEnabled])

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }, [])

  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  // Handle prompt suggestion click
  const handleAppend = useCallback((message: { role: "user"; content: string }) => {
    setInput(message.content)
    // Trigger submit with the new content
    sendMessage(message.content)
  }, [sendMessage])

  // Get prompt suggestions from chatbot or use defaults
  const promptSuggestions = session?.chatbot?.prompt_suggestions && session.chatbot.prompt_suggestions.length > 0
    ? session.chatbot.prompt_suggestions
    : defaultSuggestions

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
          append={handleAppend}
          suggestions={promptSuggestions}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={handleWebSearchToggle}
          chatbotSupportsWebSearch={session?.chatbot?.web_search_enabled}
          className="h-full"
        />
      </div>
    </div>
  )
}
