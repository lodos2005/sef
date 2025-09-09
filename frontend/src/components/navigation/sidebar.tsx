"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  AlertCircle,
  MessageCirclePlusIcon,
  MessageSquare,
  MoreHorizontal,
  Trash2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useUserSessions } from "@/hooks/useUserSessions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Icons } from "../ui/icons"

export function Sidebar({ className }: { className?: string }) {
  const { sessions, isLoading, error, deleteSession } = useUserSessions()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({})
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
    return `${session.chatbot?.name || "Assistant"} ile Sohbet`
  }

  const handleNewChat = () => {
    // For now, redirect to home page to start new chat
    router.push("/")
  }

  return (
    <div
      className={cn(
        "fixed z-30 w-full shrink-0 overflow-y-auto md:sticky md:block print:hidden",
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
        <div className="p-4 h-18">
          <Button
            onClick={handleNewChat}
            className="w-full gap-2"
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
              >
                <Link href={`/chat/${session.id}`}>
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors",
                    router.asPath === `/chat/${session.id}` && "bg-primary/10 text-primary hover:bg-primary/10"
                  )}>
                    <MessageSquare className={cn(
                      "h-4 w-4 flex-shrink-0",
                      router.asPath === `/chat/${session.id}` ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {getSessionTitle(session)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          session.created_at || ""
                        ).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                </Link>
                <DropdownMenu open={dropdownOpen[session.id] || false} onOpenChange={(open) => setDropdownOpen(prev => ({ ...prev, [session.id]: open }))}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 transition-opacity h-8 w-8 p-0",
                        (dropdownOpen[session.id] || false) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSessionToDelete(session.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
        </div>
        <div className="aciklab flex items-center justify-center py-4 absolute bottom-0 w-full pointer-events-none">
          <Icons.aciklab className="h-8 w-48 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-0 w-full"></div>
        </div>
      </ScrollArea>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sohbeti Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sohbeti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (sessionToDelete) {
                  await deleteSession(sessionToDelete)
                  setDeleteDialogOpen(false)
                  setSessionToDelete(null)
                }
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
