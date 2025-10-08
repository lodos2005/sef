import { http } from "@/services"
import { Row } from "@tanstack/react-table"
import { MoreHorizontal, Trash, FileText, Eye, Edit } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEmitter } from "@/hooks/useEmitter"
import { useToast } from "@/components/ui/use-toast"

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

export function DocumentRowActions({ row }: { row: Row<IDocument> }) {
  const document = row.original
  const [deleteDialog, setDeleteDialog] = useState(false)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex size-5 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => emitter.emit("EDIT_DOCUMENT", document)}>
            <Edit className="mr-2 size-3.5" />
            {t("documents.edit_menu")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDeleteDialog(true)}>
            <Trash className="mr-2 size-3.5" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDialog open={deleteDialog} setOpen={setDeleteDialog} document={document} />
    </>
  )
}

function DeleteDialog({
  open,
  setOpen,
  document,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  document: IDocument
}) {
  const emitter = useEmitter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation("settings")

  const handleDelete = async () => {
    setLoading(true)
    try {
      await http.delete(`/api/v1/documents/${document.id}`)

      toast({
        description: t("documents.delete.success"),
      })
      emitter.emit("REFETCH_DOCUMENTS")
      setOpen(false)
    } catch (error) {
      toast({
        description: t("documents.delete.error"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("documents.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("documents.delete.message", { title: document.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("documents.delete.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? t("documents.delete.deleting") : t("documents.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
