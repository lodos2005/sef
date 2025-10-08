import { FileText } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

import CreateDocument from "@/components/settings/create-document"
import EditDocument from "@/components/settings/edit-document"
import { DocumentRowActions } from "@/components/settings/document-actions"
import { Badge } from "@/components/ui/badge"
import AsyncDataTable from "@/components/ui/data-table/async-data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import PageHeader from "@/components/ui/page-header"
import { DivergentColumn } from "@/types/table"
import { useEmitter } from "@/hooks/useEmitter"

interface IDocument {
  id: number
  title: string
  description?: string
  file_name: string
  file_size: number
  file_type?: string
  chunk_count: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
  created_at: string
  chatbots?: { id: number; name: string }[]
}

export default function DocumentSettingsPage() {
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const columns: DivergentColumn<IDocument, string>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("documents.title_field")} />
      ),
      title: t("documents.title_field"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{row.original.title}</span>
            {row.original.description && (
              <span className="text-xs text-muted-foreground truncate max-w-md">
                {row.original.description}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "file_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("documents.file_name")} />
      ),
      title: t("documents.file_name"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.original.file_name}</span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(row.original.file_size)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("documents.status")} />
      ),
      title: t("documents.status"),
      cell: ({ row }) => {
        const status = row.original.status
        const variant = 
          status === 'ready' ? 'success' :
          status === 'processing' || status === 'pending' ? 'default' :
          status === 'failed' ? 'destructive' : 'outline'
        
        return (
          <Badge variant={variant as any}>
            {t(`documents.status_${status}`)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "chunk_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("documents.chunks")} />
      ),
      title: t("documents.chunks"),
      cell: ({ row }) => (
        <div className="text-center">{row.original.chunk_count}</div>
      ),
    },
    {
      accessorKey: "chatbots",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("documents.chatbots")} />
      ),
      title: t("documents.chatbots"),
      cell: ({ row }) => {
        const chatbots = row.original.chatbots || []
        if (chatbots.length === 0) {
          return <span className="text-muted-foreground text-sm">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {chatbots.slice(0, 2).map((chatbot) => (
              <Badge key={chatbot.id} variant="outline" className="text-xs">
                {chatbot.name}
              </Badge>
            ))}
            {chatbots.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{chatbots.length - 2}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("documents.created_at")} />
      ),
      title: t("documents.created_at"),
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return (
          <div className="text-sm text-muted-foreground">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <DocumentRowActions row={row} />
        </div>
      ),
    },
  ]

  useEffect(() => {
    emitter.on("REFETCH_DOCUMENTS", () => {
      setRefetchTrigger((prev) => prev + 1)
    })
    return () => emitter.off("REFETCH_DOCUMENTS")
  }, [emitter])

  return (
    <>
      <PageHeader
        title={t("documents.title")}
        description={t("documents.description")}
      />

      <AsyncDataTable<IDocument, string>
        columns={columns}
        endpoint="/documents"
        refetchTrigger={refetchTrigger}
      >
        <div className="flex gap-3">
          <CreateDocument />
          <EditDocument />
        </div>
      </AsyncDataTable>
    </>
  )
}
