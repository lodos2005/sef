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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { useToast } from "../ui/use-toast"
import { IProvider } from "@/types/provider"

export default function EditProvider() {
  const { toast } = useToast()
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const formSchema = z
    .object({
      id: z.number().positive(),
      name: z
        .string()
        .min(2, {
          message: t("providers.validation.name_min"),
        })
        .max(255, {
          message: t("providers.validation.name_max"),
        }),
      type: z
        .string()
        .min(2, {
          message: t("providers.validation.type_min"),
        })
        .max(50, {
          message: t("providers.validation.type_max"),
        }),
      description: z
        .string()
        .max(1000, {
          message: t("providers.validation.description_max"),
        })
        .optional(),
      base_url: z
        .string()
        .url({
          message: t("providers.validation.base_url"),
        }),
      api_key: z.string().optional(),
    })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: 0,
      name: "",
      type: "",
      description: "",
      base_url: "",
      api_key: "",
    },
  })

  const watchType = form.watch("type")

  const [open, setOpen] = useState<boolean>(false)
  const [providerTypes, setProviderTypes] = useState<string[]>([])

  useEffect(() => {
    http.get("/providers/types").then((res) => {
      if (res.status === 200) {
        setProviderTypes(res.data.types)
      }
    })
  }, [])

  const handleEdit = (values: z.infer<typeof formSchema>) => {
    http
      .patch(`/providers/${values.id}`, values)
      .then((res) => {
        if (res.status === 200) {
          toast({
            title: t("success"),
            description: t("providers.toasts.edit_success_msg"),
          })
          emitter.emit("REFETCH_PROVIDERS")
          setOpen(false)
          form.reset()
        } else {
          toast({
            title: t("error"),
            description: t("providers.toasts.edit_error_msg"),
            variant: "destructive",
          })
        }
      })
      .catch((e) => {
        if (!setFormErrors(e, form)) {
          toast({
            title: t("error"),
            description: t("providers.toasts.edit_error_msg"),
            variant: "destructive",
          })
        }
      })
  }

  const [provider, setProvider] = useState<IProvider>()

  useEffect(() => {
    emitter.on("EDIT_PROVIDER", (data) => {
      const d = data as IProvider
      setProvider(d)
      setOpen(true)
      form.reset({
        id: d.id,
        name: d.name,
        type: d.type,
        description: d.description,
        base_url: d.base_url,
        api_key: d.api_key || "",
      })
    })

    return () => emitter.off("EDIT_PROVIDER")
  }, [])

  return (
    <Sheet open={open} onOpenChange={(o) => setOpen(o)}>
      <SheetContent side="right" className="sm:w-[500px] sm:max-w-full">
        <SheetHeader className="mb-8">
          <SheetTitle>{t("providers.edit.title")}</SheetTitle>
          <SheetDescription>{t("providers.edit.description")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">{t("providers.create.name")}</Label>
                  <Input id="name" placeholder={t("providers.create.name_placeholder")} {...field} />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="type">{t("providers.create.type")}</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("providers.create.type_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {providerTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
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
              name="description"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">{t("providers.create.description_field")}</Label>
                  <Textarea
                    id="description"
                    placeholder={t("providers.create.description_placeholder")}
                    {...field}
                  />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="base_url"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="base_url">{t("providers.create.base_url")}</Label>
                  <Input
                    id="base_url"
                    placeholder={t("providers.create.base_url_placeholder")}
                    {...field}
                  />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            {(watchType === "openai" || watchType === "litellm") && (
              <FormField
                control={form.control}
                name="api_key"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="api_key">{t("providers.create.api_key")}</Label>
                    <Input
                      id="api_key"
                      type="password"
                      placeholder={t("providers.create.api_key_placeholder")}
                      {...field}
                    />
                    <FormMessage className="mt-1" />
                  </div>
                )}
              />
            )}

            <SheetFooter>
              <Button type="submit">
                <Edit2 className="mr-2 size-4" /> {t("providers.edit.submit")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
