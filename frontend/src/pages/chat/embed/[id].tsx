"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { Chat } from "@/components/ui/chat"
import { useChatSession } from "@/hooks/useChatSession"
import { useMessages } from "@/hooks/useMessages"
import { useSendMessage } from "@/hooks/useSendMessage"
import { AlertCircle, Loader2, Bot, ArrowLeft, History, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { http } from "@/services"
import { sessionsService } from "@/services"
import { IChatbot } from "@/types/chatbot"
import { ISession } from "@/types/session"

type ViewMode = "chatbot-selection" | "session-history" | "chat"

const STORAGE_KEY = "sef_embed_sessions"

interface StoredSession {
  id: number
  chatbotId: number
  chatbotName: string
  summary?: string
  timestamp: number
}

export default function EmbedChatPage() {
  const router = useRouter()
  const { id: routeSessionId } = router.query
  const { t } = useTranslation(["common", "dashboard"])

  if (typeof window === 'undefined') {
    return
  }

  const [viewMode, setViewMode] = useState<ViewMode>("chatbot-selection")
  const [currentSessionId, setCurrentSessionId] = useState<string | number | null>(null)
  const [chatbots, setChatbots] = useState<IChatbot[]>([])
  const [chatbotsLoading, setChatbotsLoading] = useState(true)
  const [storedSessions, setStoredSessions] = useState<StoredSession[]>([])
  const [creatingSession, setCreatingSession] = useState(false)

  // Default prompt suggestions - memoize to prevent recreating on every render
  const defaultSuggestions = useMemo(() => [
    t("common:chat.default_suggestion_1"),
    t("common:chat.default_suggestion_2"),
    t("common:chat.default_suggestion_3"),
  ], [t])

  // Load stored sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setStoredSessions(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load stored sessions:", error)
    }
  }, [])

  // Load chatbots
  useEffect(() => {
    const loadChatbots = async () => {
      try {
        const response = await http.get("/chatbots")
        setChatbots(response.data.records || [])
      } catch (error) {
        console.error("Failed to load chatbots:", error)
      } finally {
        setChatbotsLoading(false)
      }
    }

    loadChatbots()
  }, [])

  // Handle route session ID
  useEffect(() => {
    if (routeSessionId && typeof routeSessionId === "string") {
      // If session ID is underscore, show chatbot selection
      if (routeSessionId === "_") {
        setViewMode("chatbot-selection")
        setCurrentSessionId(null)
      } else {
        // Otherwise, load the specific session
        setCurrentSessionId(routeSessionId)
        setViewMode("chat")
      }
    }
  }, [routeSessionId])

  // Save session to localStorage
  const saveSession = useCallback((session: ISession) => {
    const newSession: StoredSession = {
      id: session.id,
      chatbotId: session.chatbot_id,
      chatbotName: session.chatbot?.name || "Unknown",
      summary: session.summary,
      timestamp: Date.now(),
    }

    const updated = [newSession, ...storedSessions.filter(s => s.id !== session.id)].slice(0, 10)
    setStoredSessions(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [storedSessions])

  // Create new session
  const handleCreateSession = async (chatbotId: number) => {
    setCreatingSession(true)
    try {
      const response = await sessionsService.createSession({ chatbot_id: chatbotId })
      const newSessionId = response.data.id
      setCurrentSessionId(newSessionId)
      saveSession(response.data)
      setViewMode("chat")
      
      // Notify parent window
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'session-created', sessionId: newSessionId }, '*')
      }
    } catch (error) {
      console.error("Failed to create session:", error)
    } finally {
      setCreatingSession(false)
    }
  }

  // Load existing session
  const handleLoadSession = (sessionId: number) => {
    setCurrentSessionId(sessionId)
    setViewMode("chat")
  }

  // Back to chatbot selection
  const handleBackToChatbots = () => {
    setCurrentSessionId(null)
    setViewMode("chatbot-selection")
  }

  // Show session history
  const handleShowHistory = () => {
    setViewMode("session-history")
  }

  // Render chatbot selection screen
  const renderChatbotSelection = () => (
    <div className="flex flex-col h-screen w-full bg-background p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold flex gap-2">
          <Bot className="h-5 w-5 mt-1" />
          {t("dashboard:select_assistant")}
        </h2>
        {storedSessions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 px-0"
            onClick={handleShowHistory}
          >
            <History className="h-4 w-4 mr-2" />
            {t("common:chat.view_history")}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {chatbotsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : chatbots.length > 0 ? (
          <div className="space-y-3">
            {chatbots.map((chatbot) => (
              <Card 
                key={chatbot.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => !creatingSession && handleCreateSession(chatbot.id)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-base">{chatbot.name}</CardTitle>
                  {chatbot.description && (
                    <CardDescription className="text-sm line-clamp-2">
                      {chatbot.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("dashboard:no_chatbots")}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // Render session history screen
  const renderSessionHistory = () => (
    <div className="flex flex-col h-screen w-full bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToChatbots}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common:common.back")}
        </Button>
        <h2 className="text-lg font-semibold flex items-center gap-2 flex-1">
          <History className="h-5 w-5" />
          {t("common:chat.session_history")}
        </h2>
      </div>

      <Button
        variant="outline"
        className="mb-4"
        onClick={handleBackToChatbots}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t("common:chat.new_session")}
      </Button>

      <ScrollArea className="flex-1">
        {storedSessions.length > 0 ? (
          <div className="space-y-3">
            {storedSessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleLoadSession(session.id)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-medium">
                    {session.summary || session.chatbotName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {session.chatbotName} • {new Date(session.timestamp).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("common:chat.no_history")}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // Chat view component - extract hooks to top level to prevent re-initialization
  const sessionIdForHooks = useMemo(() => currentSessionId?.toString(), [currentSessionId])
  
  const { 
    session, 
    isLoading: sessionLoading, 
    error: sessionError, 
  } = useChatSession(viewMode === "chat" ? sessionIdForHooks : undefined)
  
  const { messages, setMessages, isLoading: messagesLoading, error: messagesError } = useMessages(viewMode === "chat" ? sessionIdForHooks : undefined)
  
  // Local input state for chat
  const [input, setInput] = useState("")
  
  const handleMessageComplete = useCallback(() => {
    // Update stored session with latest data
    if (session) {
      const sessionToStore: ISession = {
        id: session.id,
        user_id: session.user_id,
        chatbot_id: session.chatbot_id,
        summary: session.summary,
        chatbot: session.chatbot as any, // Type compatibility
      }
      saveSession(sessionToStore)
    }
    
    // Trigger refresh event for parent window if embedded
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'chat-message-complete', sessionId: currentSessionId }, '*')
    }
  }, [currentSessionId, session, saveSession])
  
  const { sendMessage, isGenerating, error: sendError } = useSendMessage(
    viewMode === "chat" ? sessionIdForHooks : undefined, 
    setMessages, 
    handleMessageComplete
  )

  const handleSubmit = useCallback(async (event?: any, options?: { experimental_attachments?: FileList }) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }

    if (!input.trim()) return

    const messageText = input.trim()
    setInput("") // Clear input immediately
    await sendMessage(messageText)
  }, [input, sendMessage])

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }, [])

  const handleAppend = useCallback(async (message: { role: "user"; content: string }) => {
    await sendMessage(message.content)
    setInput("")
  }, [sendMessage])

  // Memoize prompt suggestions to prevent recreation
  const promptSuggestions = useMemo(() => {
    return session?.chatbot?.prompt_suggestions && session.chatbot.prompt_suggestions.length > 0
      ? session.chatbot.prompt_suggestions
      : defaultSuggestions
  }, [session?.chatbot?.prompt_suggestions, defaultSuggestions])

  // Render chat view
  const renderChatView = () => {
    const isLoading = sessionLoading || messagesLoading
    const error = sessionError || messagesError || sendError

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen w-full bg-background">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("common:chat.loading_session")}</p>
          </div>
        </div>
      )
    }

    if (error && !session) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-background p-4">
          <Alert className="border-red-200 bg-red-50 text-red-900 max-w-md mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleBackToChatbots}>
            {t("common:common.back")}
          </Button>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-screen w-full bg-background">
        {/* Header with back button */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/95 backdrop-blur">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToChatbots}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common:common.new")}
          </Button>
          {storedSessions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowHistory}
            >
              <History className="h-4 w-4 mr-2" />
              {t("common:chat.history")}
            </Button>
          )}
          {session?.chatbot && (
            <div className="flex-1 text-sm font-medium truncate ml-2">
              {session.chatbot.name}
            </div>
          )}
        </div>

        {/* Compact error banner */}
        {error && (
          <div className="px-3 pt-3">
            <Alert className="border-red-200 bg-red-50 text-red-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Chat area - full height */}
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
            className="h-full"
          />
        </div>
      </div>
    )
  }

  // Render based on view mode
  if (creatingSession) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("common:chat.creating_session")}</p>
        </div>
      </div>
    )
  }

  if (viewMode === "chatbot-selection") {
    return renderChatbotSelection()
  }

  if (viewMode === "session-history") {
    return renderSessionHistory()
  }

  return renderChatView()
}

// Disable the layout for this page
EmbedChatPage.getLayout = (page: React.ReactElement) => page
