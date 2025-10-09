import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

import { Badge } from "@/components/ui/badge"
import AsyncDataTable from "@/components/ui/data-table/async-data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import PageHeader from "@/components/ui/page-header"
import { DivergentColumn } from "@/types/table"
import { useEmitter } from "@/hooks/useEmitter"
import { ITool } from "@/types/tool"
import { Button } from "@/components/ui/button"
import { PlusCircleIcon, Upload } from "lucide-react"
import Link from "next/link"
import ToolImportDialog from "@/components/settings/tools/ToolImportDialog"
import { ToolRowActions } from "@/components/settings/tool-actions"

export default function ToolSettingsPage() {
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const columns: DivergentColumn<ITool, string>[] = [
    {
      accessorKey: "display_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("tools.display_name", "Display Name")} />
      ),
      title: t("tools.display_name", "Display Name"),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("tools.name", "Name")} />
      ),
      title: t("tools.name", "Name"),
      cell: ({ row }) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">
          {row.original.name}
        </code>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("tools.description_field", "Description")} />
      ),
      title: t("tools.description_field", "Description"),
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.description}>
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("tools.type", "Type")} />
      ),
      title: t("tools.type", "Type"),
      cell: ({ row }) => (
        <Badge variant="outline">
          {t(`tools.types.${row.original.type}`, row.original.type)}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <ToolRowActions row={row} />,
    },
  ]

  useEffect(() => {
    emitter.on("REFETCH_TOOLS", () => {
      setRefetchTrigger((prev) => prev + 1)
    })
    return () => emitter.off("REFETCH_TOOLS")
  }, [])

  return (
    <>
      <PageHeader
        title={t("tools.title", "Tools")}
        description={t("tools.description", "Manage your AI tools and their configurations")}
      />

      <AsyncDataTable<ITool, string>
        columns={columns}
        endpoint="/tools"
        refetchTrigger={refetchTrigger}
      >
        <div className="flex gap-2">
          <Link href="/settings/tools/create">
            <Button variant="outline" size="sm" className="h-8 lg:flex">
              <PlusCircleIcon className="mr-2 size-4" />
              {t("providers.create.button")}
            </Button>
          </Link>
          <ToolImportDialog>
            <Button variant="outline" size="sm" className="h-8 lg:flex">
              <Upload className="mr-2 size-4" />
              {t("tools.import.button", "Import")}
            </Button>
          </ToolImportDialog>
        </div>
      </AsyncDataTable>
    </>
  )
}
