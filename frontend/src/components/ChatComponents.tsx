import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ChatHeaderProps {
  chatbotName?: string
}

export function ChatHeader({ chatbotName }: ChatHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg">{chatbotName || "Chat"}</h1>
          {chatbotName && (
            <span className="text-sm text-muted-foreground">
              with {chatbotName}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface ErrorBannerProps {
  error: string | null
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null

  return (
    <div className="flex-shrink-0 px-4 py-2">
      <Alert className="mx-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  )
}

interface LoadingSpinnerProps {
  isLoading: boolean
}

export function LoadingSpinner({ isLoading }: LoadingSpinnerProps) {
  if (!isLoading) return null

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

interface ErrorPageProps {
  error: string | null
  onRetry: () => void
}

export function ErrorPage({ error, onRetry }: ErrorPageProps) {
  if (!error) return null

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={onRetry}
            className="mt-4 w-full"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
