import { MoreHorizontal, Pencil, Trash2, Play } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/router"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useEmitter } from "@/hooks/useEmitter"
import { http } from "@/services"
import { ITool } from "@/types/tool"

interface ToolRowActionsProps {
  row: {
    original: ITool
  }
}

export function ToolRowActions({ row }: ToolRowActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const emitter = useEmitter()
  const router = useRouter()
  const { t } = useTranslation("settings")

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await http.delete(`/tools/${row.original.id}`)
      emitter.emit("REFETCH_TOOLS")
    } catch (error) {
      console.error("Failed to delete tool:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTest = () => {
    router.push(`/settings/tools/${row.original.id}/test`)
  }

  const handleEdit = () => {
    router.push(`/settings/tools/${row.original.id}/edit`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("tools.actions", "Actions")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          {t("tools.edit", "Edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTest}>
          <Play className="mr-2 h-4 w-4" />
          {t("tools.test", "Test")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("tools.delete", "Delete")}
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("tools.delete_confirm_title", "Delete Tool")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("tools.delete_confirm_description", "Are you sure you want to delete this tool? This action cannot be undone.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("tools.cancel", "Cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? t("tools.deleting", "Deleting...") : t("tools.delete", "Delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
