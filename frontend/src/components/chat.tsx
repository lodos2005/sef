import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SessionSummary } from "@/components/chat/session-summary"
import { ChatSession } from "@/types/chat"

interface ChatHeaderProps {
  session?: ChatSession
  onSessionUpdate?: (session: ChatSession) => void
  isPolling?: boolean
}

export function ChatHeader({ session, onSessionUpdate, isPolling = false }: ChatHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 h-16 flex items-center">
      <div className="container mx-auto px-8">
        {session && (
          <SessionSummary session={session} isPolling={isPolling} />
        )}
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
      <Alert className="max-w-4xl mx-auto mt-3">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
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
