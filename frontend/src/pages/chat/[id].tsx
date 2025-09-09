"use client"

import { useState, useCallback } from "react"
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

  const { session, isLoading: sessionLoading, error: sessionError } = useChatSession(sessionId)
  const { messages, setMessages, isLoading: messagesLoading, error: messagesError } = useMessages(sessionId)
  const { sendMessage, isGenerating, error: sendError } = useSendMessage(sessionId, setMessages)

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
    <div className="flex flex-col h-[calc(100vh-4.03rem)] p-0">
      <ErrorBanner error={error} />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
          <Chat
            messages={messages}
            handleSubmit={handleSubmit}
            input={input}
            handleInputChange={handleInputChange}
            isGenerating={isGenerating}
            setMessages={setMessages}
            className="h-screen"
          />
        </div>
      </div>
    </div>
  )
}
