import { http } from "@/services"
import { Row } from "@tanstack/react-table"
import { Edit2, MoreHorizontal, Trash } from "lucide-react"
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
import { IChatbot } from "@/types/chatbot"

import { Icons } from "../ui/icons"
import { useToast } from "../ui/use-toast"

export function ChatbotRowActions({ row }: { row: Row<IChatbot> }) {
  const chatbot = row.original
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
          <DropdownMenuItem onClick={() => emitter.emit("EDIT_CHATBOT", chatbot)}>
            <Edit2 className="mr-2 size-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDeleteDialog(true)}>
            <Trash className="mr-2 size-3.5" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDialog open={deleteDialog} setOpen={setDeleteDialog} chatbot={chatbot} />
    </>
  )
}

function DeleteDialog({
  open,
  setOpen,
  chatbot,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  chatbot: IChatbot
}) {
  const emitter = useEmitter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation("settings")

  const handleDelete = () => {
    setLoading(true)

    http
      .delete(`/chatbots/${chatbot.id}`)
      .then(() => {
        toast({
          title: t("success"),
          description: t("chatbots.delete.success"),
        })
        emitter.emit("REFETCH_CHATBOTS")
        setOpen(false)
      })
      .catch(() => {
        toast({
          title: t("error"),
          description: t("chatbots.delete.error"),
          variant: "destructive",
        })
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <AlertDialog open={open} onOpenChange={(open) => setOpen(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("chatbots.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            <span
              dangerouslySetInnerHTML={{
                __html: t("chatbots.delete.subtext", {
                  name: chatbot.name,
                }),
              }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("chatbots.delete.no")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDelete()}>
            {loading && <Icons.spinner className="size-4 animate-spin" />}
            {t("chatbots.delete.yes")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
