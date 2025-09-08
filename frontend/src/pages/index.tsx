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
    } catch (error) {
      console.error("Failed to create session:", error)
    }
  }

  const handleContinueSession = (sessionId: number) => {
    router.push(`/chat/${sessionId}`)
  }

  return (
    <div
      className="flex flex-col gap-6 p-8"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Chatbot</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chatbotsLoading ? <Skeleton className="h-8 w-16" /> : chatbots.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Oturum</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessionsLoading ? <Skeleton className="h-8 w-16" /> : sessions.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Son Aktivite</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.length > 0 ? (
                new Date(sessions[0].updated_at || sessions[0].created_at || '').toLocaleDateString('tr-TR')
              ) : (
                "Yok"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chatbots Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Kullanılabilir Chatbot'lar
          </CardTitle>
          <CardDescription>
            Yeni bir sohbet başlatmak için bir chatbot seçin
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
            <MessageSquare className="h-5 w-5" />
            Son Oturumlar
          </CardTitle>
          <CardDescription>
            Önceki sohbetlerinize devam edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {session.chatbot?.name || "Chatbot"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(session.created_at || '').toLocaleDateString('tr-TR')} • 
                          {session.messages?.length || 0} mesaj
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleContinueSession(session.id)}
                      >
                        Devam Et
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Henüz hiç oturum başlatmadınız.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
