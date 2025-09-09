import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/hooks/auth/useCurrentUser"
import { useUserSessions } from "@/hooks/useUserSessions"
import { http, sessionsService } from "@/services"
import { IChatbot } from "@/types/chatbot"
import { Bot, Clock, MessageSquare, Plus } from "lucide-react"
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
    <div
      className="flex flex-col gap-6 p-8 overflow-x-hidden"
      style={{ height: "var(--container-height)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title", "Pano")}</h1>
          <p className="text-muted-foreground">
            Hoş geldiniz, {currentUser.name || currentUser.username}!
          </p>
        </div>
        <div className="text-right text-muted-foreground font-medium">
          <DateTimeView />
        </div>
      </div>

      {/* Chatbots Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Kullanılabilir Asistanlar
          </CardTitle>
          <CardDescription>
            Yeni bir sohbet başlatmak için bir asistan seçin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chatbotsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : chatbots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chatbots.map((chatbot) => (
                <Card key={chatbot.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{chatbot.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {chatbot.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{chatbot.model_name}</Badge>
                      {chatbot.provider && (
                        <Badge variant="outline">{chatbot.provider.name}</Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => handleCreateSession(chatbot.id)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Sohbet Başlat
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Henüz hiç chatbot bulunmuyor.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Son Oturumlar
          </CardTitle>
          <CardDescription>
            Önceki sohbetlerinize devam edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleContinueSession(session.id)}
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {session.chatbot?.name || "Chatbot"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.created_at || '').toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} • {session.messages?.length || 0} mesaj
                    </div>
                    {session.messages && session.messages.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {session.messages[session.messages.length - 1].content.substring(0, 120)}...
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleContinueSession(session.id)
                    }}
                  >
                    Devam Et
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Henüz hiç oturum başlatmadınız.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Yukarıdaki asistanlardan birini seçerek sohbetinizi başlatın.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
