import { Bot } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

import CreateChatbot from "@/components/settings/create-chatbot"
import EditChatbot from "@/components/settings/edit-chatbot"
import { ChatbotRowActions } from "@/components/settings/chatbot-actions"
import { Badge } from "@/components/ui/badge"
import AsyncDataTable from "@/components/ui/data-table/async-data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import PageHeader from "@/components/ui/page-header"
import { DivergentColumn } from "@/types/table"
import { IChatbot } from "@/types/chatbot"
import { useEmitter } from "@/hooks/useEmitter"

export default function ChatbotSettingsPage() {
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const columns: DivergentColumn<IChatbot, string>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("chatbots.name")} />
      ),
      title: t("chatbots.name"),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("chatbots.description_field")} />
      ),
      title: t("chatbots.description_field"),
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.description}>
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: "provider.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("chatbots.provider")} />
      ),
      title: t("chatbots.provider"),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.provider?.name || "N/A"}
        </Badge>
      ),
    },
    {
      accessorKey: "model_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("chatbots.model_name")} />
      ),
      title: t("chatbots.model_name"),
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.model_name}
        </Badge>
      ),
    },
    {
      accessorKey: "tools",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("chatbots.tools")} />
      ),
      title: t("chatbots.tools"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tools ? row.original.tools.length : 0}
        </div>
      ),
    },
    {
      accessorKey: "documents",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("chatbots.documents")} />
      ),
      title: t("chatbots.documents"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.documents ? row.original.documents.length : 0}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ChatbotRowActions row={row} />
        </div>
      ),
    },
  ]

  useEffect(() => {
    emitter.on("REFETCH_CHATBOTS", () => {
      setRefetchTrigger((prev) => prev + 1)
    })
    return () => emitter.off("REFETCH_CHATBOTS")
  }, [])

  return (
    <>
      <PageHeader
        title={t("chatbots.title")}
        description={t("chatbots.description")}
      />

      <AsyncDataTable<IChatbot, string>
        columns={columns}
        endpoint="/chatbots"
        refetchTrigger={refetchTrigger}
      >
        <div className="flex gap-3">
          <CreateChatbot />
          <EditChatbot />
        </div>
      </AsyncDataTable>
    </>
  )
}
