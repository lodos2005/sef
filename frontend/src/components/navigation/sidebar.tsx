"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  AlertCircle,
  MessageCirclePlusIcon,
  MessageSquare,
  Trash2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useUserSessions } from "@/hooks/useUserSessions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

import { Icons } from "../ui/icons"

export function Sidebar({ className }: { className?: string }) {
  const { sessions, isLoading, error, deleteSession } = useUserSessions()
  const [hoveredSession, setHoveredSession] = useState<number | null>(null)
  const router = useRouter()

  const getSessionTitle = (session: any) => {
    if (session.messages && session.messages.length > 0) {
      const firstUserMessage = session.messages.find(
        (msg: any) => msg.role === "user"
      )
      if (firstUserMessage) {
        return firstUserMessage.content.length > 30
          ? firstUserMessage.content.substring(0, 30) + "..."
          : firstUserMessage.content
      }
    }
    return `Chat with ${session.chatbot?.name || "Assistant"}`
  }

  const handleNewChat = () => {
    // For now, redirect to home page to start new chat
    router.push("/")
  }

  const handleDeleteSession = async (
    e: React.MouseEvent,
    sessionId: number
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm("Bu sohbeti silmek istediğinize emin misiniz?")) {
      await deleteSession(sessionId)
    }
  }

  return (
    <div
      className={cn(
        "fixed z-30 w-full shrink-0 overflow-y-auto bg-background md:sticky md:block print:hidden",
        className
      )}
    >
      {/* Conversations List */}
      <ScrollArea
        style={{
          height: "var(--container-height)",
        }}
      >
        {/* New Chat Button */}
        <div className="p-4 border-b h-18">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            variant="default"
          >
            <MessageCirclePlusIcon className="h-4 w-4" />
            Yeni Sohbet
          </Button>
        </div>
        <div className="p-2">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {error && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Konuşmalar yüklenirken hata oluştu: {error}
                </AlertDescription>
              </Alert>
            </div>
          )}
          {!isLoading && !error && sessions.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Henüz konuşma yok</p>
              <p className="text-xs text-muted-foreground">Başlamak için yeni bir sohbet başlatın</p>
            </div>
          )}
          {!isLoading &&
            !error &&
            sessions.map((session) => (
              <div
                key={session.id}
                className="relative group"
                onMouseEnter={() => setHoveredSession(session.id)}
                onMouseLeave={() => setHoveredSession(null)}
              >
                <Link href={`/chat/${session.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {getSessionTitle(session)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          session.created_at || ""
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
                {hoveredSession === session.id && (
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
        </div>
        <div className="aciklab flex items-center justify-center py-4 absolute bottom-0 w-full pointer-events-none">
          <Icons.aciklab className="h-8 w-48 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-0 w-full"></div>
        </div>
      </ScrollArea>
    </div>
  )
}
