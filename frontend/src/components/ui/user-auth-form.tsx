import { http } from "@/services"
import { AlertCircle, LogIn } from "lucide-react"
import { useRouter } from "next/router"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { Alert, AlertDescription, AlertTitle } from "./alert"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> { }

const safeToRedirect = ["/auth", "/notifications", "/servers", "/settings"]

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState("")

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

  const initiateLogin = async () => {
    try {
      // Get the Keycloak login URL from backend
      const response = await http.get("/auth/login")
      
      if (response.data.login_url) {
        // Redirect to Keycloak login page
        window.location.href = response.data.login_url
      } else {
        setError("Failed to get login URL")
        setIsLoading(false)
      }
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

  // Automatically redirect to Keycloak on component mount
  React.useEffect(() => {
    initiateLogin()
  }, [])

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="grid gap-4">
        {error && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <>
              <Icons.spinner className="size-8 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Keycloak'a yönlendiriliyorsunuz...
              </p>
            </>
          ) : (
            <Button className="w-full" onClick={initiateLogin}>
              <LogIn className="mr-2 size-4" />
              Tekrar Dene
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
