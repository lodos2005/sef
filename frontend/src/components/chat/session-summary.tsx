import { ChatSession } from "@/types/chat"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

interface SessionSummaryProps {
  session: ChatSession
  isPolling?: boolean
}

export function SessionSummary({ session, isPolling = false }: SessionSummaryProps) {
  const { t } = useTranslation("common")
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    // Update display text when session changes
    const text = session.summary || t("sidebar.chat_with", { name: session.chatbot?.name || "Chat" })
    setDisplayText(text)
  }, [session.summary, session.chatbot?.name, t])

  return (
    <div className="flex items-center gap-2">
      <h1 className="font-semibold text-lg truncate">
        {displayText}
      </h1>
      {isPolling && !session.summary && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  )
}
