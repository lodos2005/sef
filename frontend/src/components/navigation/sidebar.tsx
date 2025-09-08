"use client"

import { useAutoAnimate } from "@formkit/auto-animate/react"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { opacityAnimation } from "@/lib/anim"
import { Icons } from "../ui/icons"
import { useUserSessions } from "@/hooks/useUserSessions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, AlertCircle } from "lucide-react"

export function Sidebar({ className }: { className?: string }) {
  const [parent] = useAutoAnimate(opacityAnimation)
  const { sessions, isLoading, error } = useUserSessions()

  return (
    <div
      className={cn(
        "fixed z-30 w-full shrink-0 overflow-y-auto bg-background md:sticky md:block print:hidden",
        className
      )}
    >
      <ScrollArea
        style={{
          height: "var(--container-height)",
        }}
      >
        <div className="space-y-4 py-4 pb-[60px]">
          <div className="px-4 py-2" ref={parent}>
            <h5 className="text-sm uppercase font-semibold mb-4 text-muted-foreground">Geçmiş Sohbetler</h5>
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Sohbetler yüklenirken hata oluştu: {error}
                </AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && sessions.length === 0 && (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  Henüz hiç sohbet başlatmadınız. Yeni bir sohbet başlatmak için ana sayfaya gidin.
                </AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && sessions.map((session) => (
              <Link key={session.id} href={`/chat/${session.id}`}>
                <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {session.chatbot?.name || "Chatbot"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(session.created_at || "").toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.messages?.length || 0} mesaj
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div className="aciklab flex items-center justify-center py-4 absolute bottom-0 w-full pointer-events-none">
          <Icons.aciklab className="h-8 w-48 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-0 w-full"></div>
        </div>
      </ScrollArea>
    </div>
  )
}
