import { useState, useEffect } from "react"
import { http } from "@/services"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { setFormErrors } from "@/lib/utils"
import { useEmitter } from "@/hooks/useEmitter"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Checkbox } from "../ui/checkbox"
import { Switch } from "../ui/switch"
import { useToast } from "../ui/use-toast"
import { IProvider } from "@/types/provider"
import { ITool } from "@/types/tool"
import { IDocument } from "@/types/document"

  
export default function CreateChatbot() {
  const { toast } = useToast()
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const [providers, setProviders] = useState<IProvider[]>([])
  const [models, setModels] = useState<string[]>([])
  const [tools, setTools] = useState<ITool[]>([])
  const [documents, setDocuments] = useState<IDocument[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null)
  const [selectedTools, setSelectedTools] = useState<number[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([])
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([])
  const [newSuggestion, setNewSuggestion] = useState("")
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)

  const formSchema = z
    .object({
      name: z
        .string()
        .min(2, {
          message: t("chatbots.validation.name_min"),
        })
        .max(255, {
          message: t("chatbots.validation.name_max"),
        }),
      description: z
        .string()
        .max(1000, {
          message: t("chatbots.validation.description_max"),
        })
        .optional(),
      provider_id: z.number().min(1, "Lütfen bir sağlayıcı seçin"),
      model_name: z.string().min(1, "Model adı gereklidir"),
      system_prompt: z.string().optional(),
    })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      provider_id: 0,
      model_name: "",
      system_prompt: "",
    },
  })

  useEffect(() => {
    // Fetch providers
    http.get('/providers').then((res) => {
      setProviders(res.data.records || [])
    }).catch((e) => {
      console.error('Error fetching providers:', e)
    })

    // Fetch tools
    http.get('/tools?per_page=9999').then((res) => {
      setTools(res.data.records || [])
    }).catch((e) => {
      console.error('Error fetching tools:', e)
    })

    // Fetch documents
    http.get('/documents?per_page=9999&status=ready').then((res) => {
      setDocuments(res.data.records || [])
    }).catch((e) => {
      console.error('Error fetching documents:', e)
    })
  }, [])

  const fetchModels = (providerId: number) => {
    if (providerId) {
      http.get(`/providers/${providerId}/models`).then((res) => {
        setModels(res.data.models || [])
      }).catch((e) => {
        console.error('Error fetching models:', e)
        setModels([])
      })
    } else {
      setModels([])
    }
  }

  const [open, setOpen] = useState<boolean>(false)
  const handleCreate = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      web_search_enabled: webSearchEnabled,
      tool_ids: selectedTools,
      document_ids: selectedDocuments,
      prompt_suggestions: promptSuggestions,
    }

    http
      .post(`/chatbots`, payload)
      .then((res) => {
        if (res.status === 200) {
          toast({
            title: t("success"),
            description: t("chatbots.toasts.success_msg"),
          })
          emitter.emit("REFETCH_CHATBOTS")
          setOpen(false)
          form.reset()
          setSelectedTools([])
          setSelectedDocuments([])
          setPromptSuggestions([])
          setNewSuggestion("")
          setWebSearchEnabled(false)
        } else {
          toast({
            title: t("error"),
            description: t("chatbots.toasts.error_msg"),
            variant: "destructive",
          })
        }
      })
      .catch((e) => {
        if (!setFormErrors(e, form)) {
          toast({
            title: t("error"),
            description: t("chatbots.toasts.error_msg"),
            variant: "destructive",
          })
        }
      })
  }

  return (
    <Sheet open={open} onOpenChange={(o) => setOpen(o)}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto h-8 lg:flex">
          <PlusCircle className="mr-2 size-4" />
          {t("chatbots.create.button")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="mb-8">
          <SheetTitle>{t("chatbots.create.title")}</SheetTitle>
          <SheetDescription>{t("chatbots.create.description")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreate)}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">{t("chatbots.create.name")}</Label>
                  <Input id="name" placeholder={t("chatbots.create.name_placeholder")} {...field} />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">{t("chatbots.create.description_field")}</Label>
                  <Textarea
                    id="description"
                    placeholder={t("chatbots.create.description_placeholder")}
                    {...field}
                  />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="provider_id"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="provider_id">{t("chatbots.create.provider")}</Label>
                  <Select
                    onValueChange={(value) => {
                      const providerId = parseInt(value)
                      field.onChange(providerId)
                      setSelectedProviderId(providerId)
                      fetchModels(providerId)
                    }}
                    value={field.value?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bir sağlayıcı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id.toString()}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="model_name"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="model_name">{t("chatbots.create.model_name")}</Label>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedProviderId || models.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedProviderId ? "Bir model seçin" : "Önce bir sağlayıcı seçin"} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="system_prompt">{t("chatbots.create.system_prompt")}</Label>
                  <Textarea
                    id="system_prompt"
                    placeholder={t("chatbots.create.system_prompt_placeholder")}
                    {...field}
                  />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="web_search">
                    {t("chatbots.create.web_search", "Web Search")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("chatbots.create.web_search_description", "Enable web search capability for this chatbot")}
                  </p>
                </div>
                <Switch
                  id="web_search"
                  checked={webSearchEnabled}
                  onCheckedChange={setWebSearchEnabled}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("chatbots.create.prompt_suggestions", "Prompt Suggestions")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("chatbots.create.prompt_suggestions_description", "Add suggestions that will appear when users start a new conversation")}
              </p>
              <div className="flex gap-2">
                <Input
                  value={newSuggestion}
                  onChange={(e) => setNewSuggestion(e.target.value)}
                  placeholder={t("chatbots.create.add_suggestion_placeholder", "Enter a prompt suggestion...")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (newSuggestion.trim() && promptSuggestions.length < 6) {
                        setPromptSuggestions([...promptSuggestions, newSuggestion.trim()])
                        setNewSuggestion("")
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newSuggestion.trim() && promptSuggestions.length < 6) {
                      setPromptSuggestions([...promptSuggestions, newSuggestion.trim()])
                      setNewSuggestion("")
                    }
                  }}
                  disabled={!newSuggestion.trim() || promptSuggestions.length >= 6}
                >
                  {t("chatbots.create.add", "Add")}
                </Button>
              </div>
              {promptSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {promptSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 rounded-md border bg-muted px-3 py-1.5 text-sm"
                    >
                      <span>{suggestion}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPromptSuggestions(promptSuggestions.filter((_, i) => i !== index))
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {promptSuggestions.length >= 6 && (
                <p className="text-xs text-muted-foreground">
                  {t("chatbots.create.max_suggestions", "Maximum 6 suggestions allowed")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{t("chatbots.create.tools")}</Label>
                {tools.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedTools.length === tools.length) {
                        setSelectedTools([])
                      } else {
                        setSelectedTools(tools.map(tool => tool.id))
                      }
                    }}
                  >
                    {selectedTools.length === tools.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {tools.map((tool) => (
                  <div key={tool.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tool-${tool.id}`}
                      checked={selectedTools.includes(tool.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTools([...selectedTools, tool.id])
                        } else {
                          setSelectedTools(selectedTools.filter(id => id !== tool.id))
                        }
                      }}
                    />
                    <label
                      htmlFor={`tool-${tool.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {tool.display_name}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      ({tool.name})
                    </span>
                  </div>
                ))}
                {tools.length === 0 && (
                  <p className="text-sm text-muted-foreground">Henüz araç tanımlanmamış.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{t("chatbots.create.documents")}</Label>
                {documents.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedDocuments.length === documents.length) {
                        setSelectedDocuments([])
                      } else {
                        setSelectedDocuments(documents.map(doc => doc.id))
                      }
                    }}
                  >
                    {selectedDocuments.length === documents.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`document-${doc.id}`}
                      checked={selectedDocuments.includes(doc.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDocuments([...selectedDocuments, doc.id])
                        } else {
                          setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id))
                        }
                      }}
                    />
                    <label
                      htmlFor={`document-${doc.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {doc.title}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      ({doc.file_name})
                    </span>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-sm text-muted-foreground">Henüz doküman tanımlanmamış.</p>
                )}
              </div>
            </div>

            <SheetFooter>
              <Button type="submit">
                <PlusCircle className="mr-2 size-4" />{" "}
                {t("chatbots.create.create")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
