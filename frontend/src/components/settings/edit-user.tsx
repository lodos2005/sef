import { http } from "@/services"
import { zodResolver } from "@hookform/resolvers/zod"
import { Edit2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form, FormField, FormMessage } from "@/components/form/form"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useEmitter } from "@/hooks/useEmitter"
import { setFormErrors } from "@/lib/utils"
import { IUser } from "@/types/user"

import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useToast } from "../ui/use-toast"

export default function EditUser() {
  const { toast } = useToast()
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const formSchema = z.object({
    id: z.number().positive(),
    name: z.string().optional(),
    username: z
      .string()
      .min(2, {
        message: t("users.validation.name_min"),
      })
      .max(50, {
        message: t("users.validation.name_max"),
      }),
    password: z.string().optional(),
    super_admin: z.boolean().optional().default(false),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: 0,
      name: "",
      username: "",
      password: "",
    },
  })

  const [open, setOpen] = useState<boolean>(false)
  const handleEdit = (values: z.infer<typeof formSchema>) => {
    http
      .patch(`/users/${values.id}`, values)
      .then((res) => {
        if (res.status === 200) {
          toast({
            title: t("success"),
            description: t("users.toasts.edit_success_msg"),
          })
          emitter.emit("REFETCH_USERS")
          setOpen(false)
          form.reset()
        } else {
          toast({
            title: t("error"),
            description: t("users.toasts.edit_error_msg"),
            variant: "destructive",
          })
        }
      })
      .catch((e) => {
        if (!setFormErrors(e, form)) {
          toast({
            title: t("error"),
            description: t("users.toasts.edit_error_msg"),
            variant: "destructive",
          })
        }
      })
  }

  const [user, setUser] = useState<IUser>()

  useEffect(() => {
    emitter.on("EDIT_USER", (data) => {
      const d = data as IUser
      setUser(d)
      setOpen(true)
      form.reset({
        id: d.id,
        name: d.name,
        username: d.username,
        password: "",
        super_admin: d.super_admin,
      })
    })

    return () => emitter.off("EDIT_USER")
  }, [])

  return (
    <Sheet open={open} onOpenChange={(o) => setOpen(o)}>
      <SheetContent side="right" className="sm:w-[500px] sm:max-w-full">
        <SheetHeader className="mb-8">
          <SheetTitle>{t("users.edit.title")}</SheetTitle>
          <SheetDescription>{t("users.edit.description")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">{t("users.create.name")}</Label>
                  <Input id="name" placeholder="Sef User" {...field} />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">{t("users.create.username")}</Label>
                  <Input
                    id="username"
                    placeholder="sef"
                    {...field}
                  />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">{t("users.create.password")}</Label>
                  <Input
                    id="password"
                    {...field}
                    className="col-span-3"
                    type="password"
                  />
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="super_admin"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="super_admin">
                    {t("users.create.super_admin")}
                  </Label>
                  <div className="mt-2">
                    <Checkbox
                      id="super_admin"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                  <FormMessage className="mt-1" />
                </div>
              )}
            />

            <SheetFooter>
              <Button type="submit">
                <Edit2 className="mr-2 size-4" /> {t("users.edit.submit")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
