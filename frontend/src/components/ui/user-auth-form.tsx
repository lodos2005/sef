import { http } from "@/services"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, LogIn } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/router"
import * as React from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLogin } from "@/hooks/auth/useLogin"
import { cn } from "@/lib/utils"

import {
  Form,
  FormField,
  FormMessage,
} from "../form/form"
import { Alert, AlertDescription, AlertTitle } from "./alert"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> { }

const safeToRedirect = ["/auth", "/notifications", "/servers", "/settings"]

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  const formSchema = z.object({
    username: z.string({
      required_error: "Kullanıcı adı alanı boş olamaz.",
    }),
    password: z.string({
      required_error: "Lütfen parolanızı giriniz.",
    }),
  })

  const loginForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  const [error, setError] = React.useState("")
  const { login } = useLogin()

  const getRedirectUri = (toHome = false) => {
    let redirectUri = (router.query.redirect || "/") as string
    redirectUri = redirectUri
      .replace("http://", "")
      .replace("https://", "")
      .replace("www.", "")

    if (toHome) return "/"

    const isSafe = (() => {
      try {
        const resolvedRedirectURL = new URL(redirectUri, location.origin)

        if (resolvedRedirectURL.origin === new URL(location.origin).origin) {
          for (const safeUrl of safeToRedirect) {
            if (resolvedRedirectURL.pathname.startsWith(safeUrl)) {
              return true
            }
          }
          return false
        } else {
          return false
        }
      } catch (error) {
        return false
      }
    })()

    if (!isSafe) {
      redirectUri = "/"
    }

    return redirectUri
  }

  const onLogin = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true)

    try {
      const axiosReply = await login(data.username, data.password)

      setError("")
      setTimeout(() => {
        const user = axiosReply.data.user
        router.push(getRedirectUri())
      }, 500)
    } catch (e: any) {
      if (!e.response) {
        setError(e.message)
        setIsLoading(false)
        return
      }

      if (e.response.data.message) {
        setError(e.response.data.message)
      } else {
        setError(e.message)
      }

      setIsLoading(false)
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="grid gap-4">
        {error && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Bilgi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...loginForm}>
          <form
            onSubmit={loginForm.handleSubmit(onLogin as any)}
            className="grid gap-4"
          >
            <FormField
              control={loginForm.control}
              name="username"
              render={({ field }) => (
                <div className="flex flex-col gap-3">
                  <Label htmlFor="username">Kullanıcı Adı</Label>
                  <Input
                    id="username"
                    {...field}
                  />
                  <FormMessage />
                </div>
              )}
            />

            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Parola</Label>

                    <small className="italic text-muted-foreground">
                      <Link href="/auth/forgot_password" tabIndex={-1}>
                        Şifrenizi mi unuttunuz?
                      </Link>
                    </small>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    {...field}
                  />
                  <FormMessage />
                </div>
              )}
            />

            <Button disabled={isLoading} className="mt-4" type="submit">
              {isLoading ? (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 size-4" />
              )}
              Giriş Yap
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
