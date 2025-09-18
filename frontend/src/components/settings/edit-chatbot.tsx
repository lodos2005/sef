import { useState, useEffect } from "react"
import { http } from "@/services"
import { zodResolver } from "@hookform/resolvers/zod"
import { Edit2 } from "lucide-react"
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
} from "@/components/ui/sheet"
import { Form, FormField, FormMessage } from "@/components/form/form"

import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Checkbox } from "../ui/checkbox"
import { useToast } from "../ui/use-toast"
import { IChatbot } from "@/types/chatbot"
import { IProvider } from "@/types/provider"
import { ITool } from "@/types/tool"

export default function EditChatbot() {
  const { toast } = useToast()
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const [providers, setProviders] = useState<IProvider[]>([])
  const [models, setModels] = useState<string[]>([])
  const [tools, setTools] = useState<ITool[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null)
  const [selectedTools, setSelectedTools] = useState<number[]>([])

  const formSchema = z
    .object({
      id: z.number().positive(),
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
      id: 0,
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
    http.get('/tools').then((res) => {
      setTools(res.data.records || [])
    }).catch((e) => {
      console.error('Error fetching tools:', e)
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
  const handleEdit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      tool_ids: selectedTools,
    }

    http
      .patch(`/chatbots/${values.id}`, payload)
      .then((res) => {
        if (res.status === 200) {
          toast({
            title: t("success"),
            description: t("chatbots.toasts.edit_success_msg"),
          })
          emitter.emit("REFETCH_CHATBOTS")
          setOpen(false)
          form.reset()
          setSelectedTools([])
        } else {
          toast({
            title: t("error"),
            description: t("chatbots.toasts.edit_error_msg"),
            variant: "destructive",
          })
        }
      })
      .catch((e) => {
        if (!setFormErrors(e, form)) {
          toast({
            title: t("error"),
            description: t("chatbots.toasts.edit_error_msg"),
            variant: "destructive",
          })
        }
      })
  }

  const [chatbot, setChatbot] = useState<IChatbot>()

  useEffect(() => {
    emitter.on("EDIT_CHATBOT", (data) => {
      const d = data as IChatbot
      setChatbot(d)
      setOpen(true)
      setSelectedProviderId(d.provider_id)
      fetchModels(d.provider_id)
      setSelectedTools(d.tools?.map(tool => tool.id) || [])
      form.reset({
        id: d.id,
        name: d.name,
        description: d.description,
        provider_id: d.provider_id,
        model_name: d.model_name,
        system_prompt: d.system_prompt,
      })
    })

    return () => emitter.off("EDIT_CHATBOT")
  }, [])

  return (
    <Sheet open={open} onOpenChange={(o) => setOpen(o)}>
      <SheetContent side="right" className="sm:w-[500px] sm:max-w-full">
        <SheetHeader className="mb-8">
          <SheetTitle>{t("chatbots.edit.title")}</SheetTitle>
          <SheetDescription>{t("chatbots.edit.description")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-5">
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
                  <Label htmlFor="system_prompt">{t("chatbots.edit.system_prompt")}</Label>
                  <Textarea
                    id="system_prompt"
                    placeholder={t("chatbots.edit.system_prompt_placeholder")}
                    {...field}
                  />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <div className="flex flex-col gap-2">
              <Label>{t("chatbots.edit.tools")}</Label>
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
                      ({tool.type})
                    </span>
                  </div>
                ))}
                {tools.length === 0 && (
                  <p className="text-sm text-muted-foreground">Henüz araç tanımlanmamış.</p>
                )}
              </div>
            </div>

            <SheetFooter>
              <Button type="submit">
                <Edit2 className="mr-2 size-4" /> {t("chatbots.edit.submit")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
