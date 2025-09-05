import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

import CreateProvider from "@/components/settings/create-provider"
import EditProvider from "@/components/settings/edit-provider"
import { ProviderRowActions } from "@/components/settings/provider-actions"
import { Badge } from "@/components/ui/badge"
import AsyncDataTable from "@/components/ui/data-table/async-data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import PageHeader from "@/components/ui/page-header"
import { DivergentColumn } from "@/types/table"
import { IProvider } from "@/types/provider"
import { useEmitter } from "@/hooks/useEmitter"

export default function ProviderSettingsPage() {
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const columns: DivergentColumn<IProvider, string>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("providers.name")} />
      ),
      title: t("providers.name"),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("providers.type")} />
      ),
      title: t("providers.type"),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("providers.description_field")} />
      ),
      title: t("providers.description_field"),
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.description}>
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: "base_url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("providers.base_url")} />
      ),
      title: t("providers.base_url"),
      cell: ({ row }) => (
        <div className="flex items-center">
          <Globe className="size-4 mr-2" />
          <span className="truncate max-w-xs" title={row.original.base_url}>
            {row.original.base_url}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ProviderRowActions row={row} />
        </div>
      ),
    },
  ]

  useEffect(() => {
    emitter.on("REFETCH_PROVIDERS", () => {
      setRefetchTrigger((prev) => prev + 1)
    })
    return () => emitter.off("REFETCH_PROVIDERS")
  }, [])

  return (
    <>
      <PageHeader
        title={t("providers.title")}
        description={t("providers.description")}
      />

      <AsyncDataTable<IProvider, string>
        columns={columns}
        endpoint="/providers"
        refetchTrigger={refetchTrigger}
      >
        <div className="flex gap-3">
          <CreateProvider />
          <EditProvider />
        </div>
      </AsyncDataTable>
    </>
  )
}
