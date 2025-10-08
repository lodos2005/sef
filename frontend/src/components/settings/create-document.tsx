import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusCircle, FileEdit } from "lucide-react"
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
  SheetTrigger,
} from "@/components/ui/sheet"
import { Form, FormField, FormMessage } from "@/components/form/form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { useToast } from "../ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

export default function CreateDocument() {
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
  const [uploadMode, setUploadMode] = useState<"file" | "markdown">("markdown")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) {
      form.reset()
      setSelectedFile(null)
      setUploadMode("markdown")
    }
  }, [open])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-fill title from filename if empty
      if (!form.getValues("title")) {
        form.setValue("title", file.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  const handleCreate = async (values: z.infer<typeof formSchema>) => {
    setUploading(true)

    try {
      const formData = new FormData()
      
      if (uploadMode === "file" && selectedFile) {
        // File upload mode
        formData.append("file", selectedFile)
        formData.append("title", values.title)
        if (values.description) {
          formData.append("description", values.description)
        }
      } else {
        // Markdown creation mode
        if (!values.content?.trim()) {
          toast({
            title: t("error"),
            description: t("documents.validation.content_required"),
            variant: "destructive",
          })
          setUploading(false)
          return
        }

        // Create a markdown file from content
        const blob = new Blob([values.content], { type: "text/markdown" })
        const file = new File([blob], `${values.title}.md`, { type: "text/markdown" })
        
        formData.append("file", file)
        formData.append("title", values.title)
        if (values.description) {
          formData.append("description", values.description)
        }
      }

      await http.post("/api/v1/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      toast({
        title: t("success"),
        description: t("documents.toasts.success_msg"),
      })

      emitter.emit("REFETCH_DOCUMENTS")
      setOpen(false)
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: t("error"),
        description: error.message || t("documents.toasts.error_msg"),
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 size-4" />
          {t("documents.create.button")}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>{t("documents.create.title")}</SheetTitle>
          <SheetDescription>
            {t("documents.create.description")}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreate)}
            className="space-y-4 py-4"
          >
            <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "markdown")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="markdown">
                  <FileEdit className="mr-2 size-4" />
                  {t("documents.create.create_markdown")}
                </TabsTrigger>
                <TabsTrigger value="file">
                  <PlusCircle className="mr-2 size-4" />
                  {t("documents.create.upload_file")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="markdown" className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        {t("documents.create.title_field")}
                      </Label>
                      <Input
                        id="title"
                        placeholder={t("documents.create.title_placeholder")}
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
                        {t("documents.create.description_field")}
                      </Label>
                      <Textarea
                        id="description"
                        placeholder={t("documents.create.description_placeholder")}
                        rows={2}
                        {...field}
                      />
                      <FormMessage />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="content">
                        {t("documents.create.content")}
                      </Label>
                      <Textarea
                        id="content"
                        placeholder={t("documents.create.content_placeholder")}
                        rows={12}
                        className="font-mono text-sm"
                        {...field}
                      />
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {t("documents.create.markdown_help")}
                      </p>
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        {t("documents.create.title_field")}
                      </Label>
                      <Input
                        id="title"
                        placeholder={t("documents.create.title_placeholder")}
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
                        {t("documents.create.description_field")}
                      </Label>
                      <Textarea
                        id="description"
                        placeholder={t("documents.create.description_placeholder")}
                        rows={2}
                        {...field}
                      />
                      <FormMessage />
                    </div>
                  )}
                />

                <div className="space-y-2">
                  <Label htmlFor="file">{t("documents.create.file")}</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".txt,.md,.markdown,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <SheetFooter>
              <Button type="submit" disabled={uploading}>
                {uploading ? t("documents.create.creating") : t("documents.create.create")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
