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

export default function CreateProvider() {
  const { toast } = useToast()
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const formSchema = z
    .object({
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
    })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      base_url: "",
    },
  })

  const [open, setOpen] = useState<boolean>(false)
  const [providerTypes, setProviderTypes] = useState<string[]>([])

  useEffect(() => {
    http.get("/providers/types").then((res) => {
      if (res.status === 200) {
        setProviderTypes(res.data.types)
      }
    })
  }, [])

  const handleCreate = (values: z.infer<typeof formSchema>) => {
    http
      .post(`/providers`, values)
      .then((res) => {
        if (res.status === 200) {
          toast({
            title: t("success"),
            description: t("providers.toasts.success_msg"),
          })
          emitter.emit("REFETCH_PROVIDERS")
          setOpen(false)
          form.reset()
        } else {
          toast({
            title: t("error"),
            description: t("providers.toasts.error_msg"),
            variant: "destructive",
          })
        }
      })
      .catch((e) => {
        if (!setFormErrors(e, form)) {
          toast({
            title: t("error"),
            description: t("providers.toasts.error_msg"),
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
          {t("providers.create.button")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="mb-8">
          <SheetTitle>{t("providers.create.title")}</SheetTitle>
          <SheetDescription>{t("providers.create.description")}</SheetDescription>
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

            <SheetFooter>
              <Button type="submit">
                <PlusCircle className="mr-2 size-4" />{" "}
                {t("providers.create.create")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
