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
    <div className="py-5 bg-background sticky top-0 z-10 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-black/[0.06] before:via-black/10 before:to-black/[0.06]">
      <div className="mx-auto px-4 md:px-6 lg:px-8">
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
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
      <Alert className="mt-6 border-red-200 bg-red-50 text-red-900">
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
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
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
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center">{error}</p>
          <Button
            onClick={onRetry}
            className="w-full"
            variant="default"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
