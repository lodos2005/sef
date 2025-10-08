import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { setFormErrors } from "@/lib/utils"
import { useEmitter } from "@/hooks/useEmitter"
import { http } from "@/services"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Form, FormField, FormMessage } from "@/components/form/form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { useToast } from "../ui/use-toast"

interface IDocument {
  id: number
  title: string
  description?: string
  content?: string
  file_name: string
  file_size: number
  file_type?: string
  chunk_count: number
  status: string
  created_at: string
}

export default function EditDocument() {
  const { toast } = useToast()
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const formSchema = z.object({
    title: z
      .string()
      .min(2, {
        message: t("documents.validation.title_min"),
      })
      .max(255, {
        message: t("documents.validation.title_max"),
      }),
    description: z
      .string()
      .max(1000, {
        message: t("documents.validation.description_max"),
      })
      .optional(),
    content: z.string().optional(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
    },
  })

  const [open, setOpen] = useState<boolean>(false)
  const [document, setDocument] = useState<IDocument | null>(null)
  const [updating, setUpdating] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    const handleEdit = async (doc: any) => {
      setDocument(doc)
      setOpen(true)
      
      // Load document content if it's a text-based file
      if (doc.file_type?.includes("text") || doc.file_type?.includes("markdown")) {
        setLoadingContent(true)
        try {
          const response = await http.get(`/api/v1/documents/${doc.id}`)
          form.setValue("title", response.data.title || "")
          form.setValue("description", response.data.description || "")
          form.setValue("content", response.data.content || "")
        } catch (error) {
          console.error("Failed to load document content:", error)
        } finally {
          setLoadingContent(false)
        }
      } else {
        form.setValue("title", doc.title || "")
        form.setValue("description", doc.description || "")
      }
    }

    emitter.on("EDIT_DOCUMENT", handleEdit)
    return () => emitter.off("EDIT_DOCUMENT", handleEdit)
  }, [emitter, form])

  useEffect(() => {
    if (!open) {
      form.reset()
      setDocument(null)
    }
  }, [open])

  const handleUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!document) return

    setUpdating(true)

    try {
      const formData = new FormData()
      
      // If content is provided, create a new markdown file
      if (values.content?.trim()) {
        const blob = new Blob([values.content], { type: "text/markdown" })
        const file = new File([blob], `${values.title}.md`, { type: "text/markdown" })
        formData.append("file", file)
      }

      formData.append("title", values.title)
      if (values.description) {
        formData.append("description", values.description)
      }

      await http.patch(`/api/v1/documents/${document.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      toast({
        title: t("success"),
        description: t("documents.toasts.edit_success_msg"),
      })

      emitter.emit("REFETCH_DOCUMENTS")
      setOpen(false)
    } catch (error: any) {
      console.error("Update error:", error)
      toast({
        title: t("error"),
        description: error.message || t("documents.toasts.edit_error_msg"),
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="overflow-y-auto sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>{t("documents.edit.title")}</SheetTitle>
          <SheetDescription>
            {t("documents.edit.description")}
          </SheetDescription>
        </SheetHeader>

        {loadingContent ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">{t("loading")}</div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdate)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      {t("documents.edit.title_field")}
                    </Label>
                    <Input
                      id="title"
                      placeholder={t("documents.edit.title_placeholder")}
                      {...field}
                    />
                    <FormMessage />
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {t("documents.edit.description_field")}
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={t("documents.edit.description_placeholder")}
                      rows={2}
                      {...field}
                    />
                    <FormMessage />
                  </div>
                )}
              />

              {document?.file_type?.includes("text") || document?.file_type?.includes("markdown") ? (
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="content">
                        {t("documents.edit.content")}
                      </Label>
                      <Textarea
                        id="content"
                        placeholder={t("documents.edit.content_placeholder")}
                        rows={12}
                        className="font-mono text-sm"
                        {...field}
                      />
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {t("documents.edit.content_help")}
                      </p>
                    </div>
                  )}
                />
              ) : (
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("documents.edit.non_text_file")}
                  </p>
                </div>
              )}

              <SheetFooter>
                <Button type="submit" disabled={updating}>
                  {updating ? t("documents.edit.updating") : t("documents.edit.submit")}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}
