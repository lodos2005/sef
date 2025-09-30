import { Brain, Dot } from "lucide-react"
import React from "react"

import { cn } from "@/lib/utils"

import { Avatar, AvatarFallback } from "./avatar"

export function TypingIndicator() {
  return (
    <div className="flex items-start space-x-3">
      <Avatar className={cn("size-12 border border-black/[0.08] shadow-sm")}>
        <AvatarFallback>
          <Brain className="size-6" />
        </AvatarFallback>
      </Avatar>
      <div className="p-3">
        <div className="flex -space-x-2.5">
          <Dot
            className="h-5 w-5 animate-typing-dot-bounce"
            style={{ "--animation-delay": "0ms" } as React.CSSProperties}
          />
          <Dot
            className="h-5 w-5 animate-typing-dot-bounce"
            style={{ "--animation-delay": "90ms" } as React.CSSProperties}
          />
          <Dot
            className="h-5 w-5 animate-typing-dot-bounce"
            style={{ "--animation-delay": "180ms" } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  )
}
