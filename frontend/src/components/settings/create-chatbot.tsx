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
import { useToast } from "../ui/use-toast"
import { IProvider } from "@/types/provider"

export default function CreateChatbot() {
  const { toast } = useToast()
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const [providers, setProviders] = useState<IProvider[]>([])

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
      provider_id: z.number().min(1, "Please select a provider"),
      model_name: z.string().min(1, "Model name is required"),
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
  }, [])

  const [open, setOpen] = useState<boolean>(false)
  const handleCreate = (values: z.infer<typeof formSchema>) => {
    http
      .post(`/chatbots`, values)
      .then((res) => {
        if (res.status === 200) {
          toast({
            title: t("success"),
            description: t("chatbots.toasts.success_msg"),
          })
          emitter.emit("REFETCH_CHATBOTS")
          setOpen(false)
          form.reset()
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
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
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
                  <Input
                    id="model_name"
                    placeholder={t("chatbots.create.model_name_placeholder")}
                    {...field}
                  />
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
