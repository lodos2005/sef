import { MessageSquare } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

import { Badge } from "@/components/ui/badge"
import AsyncDataTable from "@/components/ui/data-table/async-data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import PageHeader from "@/components/ui/page-header"
import { DivergentColumn } from "@/types/table"
import { ISession } from "@/types/session"
import { useEmitter } from "@/hooks/useEmitter"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MessageList } from "@/components/ui/message-list"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Message } from "@/components/ui/chat-message"

export default function SessionSettingsPage() {
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const columns: DivergentColumn<ISession, string>[] = [
    {
      accessorKey: "user.username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("sessions.user")} />
      ),
      title: t("sessions.user"),
      cell: ({ row }) => (
        <div className="flex items-center">
          <span>{row.original.user?.username || "N/A"}</span>
        </div>
      ),
    },
    {
      accessorKey: "chatbot.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("sessions.chatbot")} />
      ),
      title: t("sessions.chatbot"),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.chatbot?.name || "N/A"}
        </Badge>
      ),
    },
    {
      accessorKey: "messages",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("sessions.messages_count")} />
      ),
      title: t("sessions.messages_count"),
      cell: ({ row }) => (
        <span>{row.original.messages?.length || 0}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("sessions.created_at")} />
      ),
      title: t("sessions.created_at"),
      cell: ({ row }) => (
        <span>{new Date(row.original.created_at || "").toLocaleString("tr-TR")}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ChatHistoryDialog session={row.original} />
        </div>
      ),
    },
  ]

  useEffect(() => {
    emitter.on("REFETCH_SESSIONS", () => {
      setRefetchTrigger((prev) => prev + 1)
    })
    return () => emitter.off("REFETCH_SESSIONS")
  }, [])

  return (
    <>
      <PageHeader
        title={t("sessions.title")}
        description={t("sessions.description")}
      />

      <AsyncDataTable<ISession, string>
        columns={columns}
        endpoint="/sessions/admin"
        refetchTrigger={refetchTrigger}
      />
    </>
  )
}

function ChatHistoryDialog({ session }: { session: ISession }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation("settings")

  // Convert session messages to Message format
  const messages: Message[] = (session.messages || [])
    .sort((a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime())
    .map((msg) => ({
      id: msg.id?.toString() || "",
      role: msg.role as "user" | "assistant",
      content: msg.content,
      createdAt: msg.created_at ? new Date(msg.created_at) : undefined,
    }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="mr-2 size-4" />
          {t("sessions.view_conversation")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[72rem!important] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t("sessions.conversation_history")} - {session.user?.username} & {session.chatbot?.name}
          </DialogTitle>
          <DialogDescription>
            {t("sessions.conversation_between", { 
              user: session.user?.username, 
              chatbot: session.chatbot?.name 
            })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 -mx-6">
          {messages.length > 0 ? (
            <ScrollArea className="h-full px-6">
              <div className="space-y-4 py-4">
                <MessageList
                  messages={messages}
                  showTimeStamps={true}
                  isTyping={false}
                  isGenerating={false}
                />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              {t("sessions.no_messages")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
