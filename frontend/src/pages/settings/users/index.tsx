import { User2, UserCog2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

import CreateUser from "@/components/settings/create-user"
import EditUser from "@/components/settings/edit-user"
import { UserRowActions } from "@/components/settings/user-actions"
import { Badge } from "@/components/ui/badge"
import AsyncDataTable from "@/components/ui/data-table/async-data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import PageHeader from "@/components/ui/page-header"
import { DivergentColumn } from "@/types/table"
import { IUser } from "@/types/user"
import { useEmitter } from "@/hooks/useEmitter"

export default function UserSettingsPage() {
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const columns: DivergentColumn<IUser, string>[] = [
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("users.username")} />
      ),
      title: t("users.username"),
    },
    {
      accessorKey: "super_admin",
      accessorFn: (row) => {
        return row.super_admin ? "1" : "0"
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("users.status")}
          filterPresets={[
            {
              key: t("users.admin"),
              value: "1",
            },
            {
              key: t("users.user"),
              value: "0",
            },
          ]}
        />
      ),
      title: t("users.status"),
      cell: ({ row }) => (
        <>
          {row.original.super_admin === true ? (
            <div className="flex items-center">
              <UserCog2 className="size-5" />
              <Badge className="ml-2" variant="outline">
                {t("users.admin")}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center">
              <User2 className="size-5" />
              <Badge className="ml-2" variant="outline">
                {t("users.user")}
              </Badge>
            </div>
          )}
        </>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <UserRowActions row={row} />
        </div>
      ),
    },
  ]

  useEffect(() => {
    emitter.on("REFETCH_USERS", () => {
      setRefetchTrigger((prev) => prev + 1)
    })
    return () => emitter.off("REFETCH_USERS")
  }, [])

  return (
    <>
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
      />

      <AsyncDataTable<IUser, string>
        columns={columns}
        endpoint="/users"
        refetchTrigger={refetchTrigger}
      >
        <div className="flex gap-3">
          <CreateUser />
          <EditUser />
        </div>
      </AsyncDataTable>
    </>
  )
}