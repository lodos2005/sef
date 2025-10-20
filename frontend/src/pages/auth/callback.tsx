import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { http } from "@/services"

import { Icons } from "@/components/ui/icons"

export default function CallbackPage() {
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    const handleCallback = async () => {
      const { code, state } = router.query

      if (!code || !state) {
        return
      }

      try {
        // Send the authorization code to backend
        const response = await http.get(
          `/auth/callback?code=${code}&state=${state}`
        )

        if (response.data.user) {
          // Redirect to home or the intended page
          const redirect = sessionStorage.getItem("auth_redirect") || "/"
          sessionStorage.removeItem("auth_redirect")
          router.push(redirect)
        } else {
          setError("Authentication failed")
        }
      } catch (e: any) {
        console.error("Callback error:", e)

        // Extract error message from different possible error structures
        let errorMessage = "Authentication failed"

        if (e.response?.data) {
          // Try to get the error message from various possible structures
          if (typeof e.response.data === "string") {
            errorMessage = e.response.data
          } else if (e.response.data.message) {
            errorMessage = e.response.data.message
          } else if (e.response.data.error) {
            errorMessage = e.response.data.error
          }
        } else if (e.message) {
          errorMessage = e.message
        }

        setError(errorMessage)

        // Redirect back to login after error
        setTimeout(() => {
          router.push("/auth/login")
        }, 5000)
      }
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router.isReady, router.query])

  return (
    <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative lg:h-full flex-col lg:p-10 text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center hidden lg:block m-2 rounded-lg"
          style={{
            backgroundImage: `url(/images/auth-bg-1.jpg)`,
          }}
        />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Icons.logo className="h-10 w-24 fill-white" />
        </div>
        <div className="relative z-20 mt-auto">
          <Icons.aciklab className="h-12 w-64 fill-white" />
        </div>
      </div>
      <div className="lg:p-8 flex items-center flex-col">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-red-600">
              Authentication Error
            </h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">
              Redirecting to login page...
            </p>
          </>
        ) : (
          <>
            <Icons.spinner className="mx-auto h-12 w-12 animate-spin" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Authenticating...
            </h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we complete your authentication.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
