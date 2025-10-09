import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/hooks/auth/useCurrentUser"
import { useUserSessions } from "@/hooks/useUserSessions"
import { http, sessionsService } from "@/services"
import { IChatbot } from "@/types/chatbot"
import { Bot, Clock, MessageSquare, Plus, Sparkles, ArrowRight } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

const DateTimeView = dynamic(() => import("@/components/dashboard/date-time"), {
  ssr: false,
})

export default function IndexPage() {
  const { t } = useTranslation("dashboard")
  const router = useRouter()
  const currentUser = useCurrentUser()
  const { sessions, isLoading: sessionsLoading } = useUserSessions()
  const [chatbots, setChatbots] = useState<IChatbot[]>([])
  const [chatbotsLoading, setChatbotsLoading] = useState(true)

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

  const handleCreateSession = async (chatbotId: number) => {
    try {
      const response = await sessionsService.createSession({ chatbot_id: chatbotId })
      router.push(`/chat/${response.data.id}`)
      // Trigger sidebar refresh
      window.dispatchEvent(new Event('refreshSessions'))
    } catch (error) {
      console.error("Failed to create session:", error)
    }
  }

  const handleContinueSession = (sessionId: number) => {
    router.push(`/chat/${sessionId}`)
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative flex flex-col md:flex-row items-center justify-between p-8 md:p-12 gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center gap-2 text-primary mb-2 justify-center md:justify-start">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">{t("title", "Pano")}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t("welcome", { name: currentUser.name || currentUser.username })}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t("hero_subtitle", "AI asistanlarınızla sohbete başlayın")}
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 backdrop-blur-sm border">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                <DateTimeView />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chatbots Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                {t("available_assistants")}
              </CardTitle>
              <CardDescription className="mt-2">
                {t("select_assistant")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chatbotsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : chatbots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chatbots.map((chatbot) => (
                <Card 
                  key={chatbot.id} 
                  className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-primary/50 flex flex-col"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="relative flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {chatbot.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-2">
                          {chatbot.description}
                        </CardDescription>
                      </div>
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-4">
                      <Badge variant="secondary" className="font-medium">
                        {chatbot.model_name}
                      </Badge>
                      {chatbot.provider && (
                        <Badge variant="outline" className="font-medium">
                          {chatbot.provider.name}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="relative pt-0">
                    <Button
                      onClick={() => handleCreateSession(chatbot.id)}
                      className="w-full group-hover:shadow-lg transition-all duration-300"
                      size="lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("start_chat")}
                      <ArrowRight className="h-4 w-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {t("no_chatbots")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                {t("recent_sessions")}
              </CardTitle>
              <CardDescription className="mt-2">
                {t("continue_previous")}
              </CardDescription>
            </div>
            {sessions.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/sessions')}
                className="gap-1"
              >
                {t("view_all", "Tümünü Gör")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
                  <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-28" />
                </div>
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-4 p-4 border rounded-xl hover:border-primary/50 hover:bg-accent transition-all duration-300 cursor-pointer"
                  onClick={() => handleContinueSession(session.id)}
                >
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {session.summary || session.chatbot?.name || "Chatbot"}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.created_at || '').toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      <span className="text-muted-foreground/50">•</span>
                      <MessageSquare className="h-3 w-3" />
                      {session.messages?.length || 0} {t("messages")}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleContinueSession(session.id)
                    }}
                  >
                    {t("continue")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium text-lg">
                {t("no_sessions")}
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {t("start_first_session")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
