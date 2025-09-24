import React, { useMemo, useState, memo, useCallback } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Ban, Brain, ChevronRight, Code2, Loader2, Loader2Icon, Terminal } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FilePreview } from "@/components/ui/file-preview"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { useCurrentUser } from "@/hooks/auth/useCurrentUser"
import md5 from "blueimp-md5"

// Performance optimizations and constants
const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
} as const

// Optimized parsing functions with error handling
function parseTextForTools(content: string): MessagePart[] {
  if (!content?.trim()) return []

  try {
    const parts: MessagePart[] = []
    const toolRegex = /<(tool_executing|tool_executed)>(.*?)<\/\1>/gi
    let lastIndex = 0
    let match: RegExpExecArray | null
    let iterationCount = 0
    const MAX_ITERATIONS = 1000 // Prevent infinite loops

    // Track executing tools to replace them when they complete
    const executingToolIndices = new Map<string, number>()

    while ((match = toolRegex.exec(content)) !== null && iterationCount < MAX_ITERATIONS) {
      iterationCount++
      const [fullMatch, tag, toolName] = match
      const startIndex = match.index

      // Add text before the tag
      if (startIndex > lastIndex) {
        const text = content.slice(lastIndex, startIndex)
        if (text.trim()) {
          parts.push({ type: "text", text })
        }
      }

      const validToolName = toolName?.trim() || "Unknown Tool"

      if (tag === "tool_executing") {
        const partIndex = parts.length
        parts.push({
          type: "tool-invocation",
          toolInvocation: {
            state: "call",
            toolName: validToolName
          },
        })
        // Remember where this executing tool is in the parts array
        executingToolIndices.set(validToolName, partIndex)
      } else if (tag === "tool_executed") {
        // Check if we have a matching executing tool to replace
        const executingIndex = executingToolIndices.get(validToolName)
        if (executingIndex !== undefined && executingIndex < parts.length) {
          // Replace the executing indicator with completed indicator
          parts[executingIndex] = {
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              toolName: validToolName,
              result: {}
            },
          }
          // Remove from tracking map
          executingToolIndices.delete(validToolName)
        } else {
          // If no matching executing tool found, just add the result
          parts.push({
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              toolName: validToolName,
              result: {}
            },
          })
        }
      }

      lastIndex = startIndex + fullMatch.length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const text = content.slice(lastIndex)
      if (text.trim()) {
        parts.push({ type: "text", text })
      }
    }

    return parts
  } catch (error) {
    console.error('Error parsing text for tools:', error)
    return [{ type: "text", text: content }]
  }
}

function parseContent(content: string): MessagePart[] {
  if (!content?.trim()) return []

  try {
    const parts: MessagePart[] = []
    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/gi
    let lastIndex = 0
    let match: RegExpExecArray | null
    let iterationCount = 0
    const MAX_ITERATIONS = 100 // Prevent infinite loops

    while ((match = thinkRegex.exec(content)) !== null && iterationCount < MAX_ITERATIONS) {
      iterationCount++
      const [fullMatch, reasoningContent] = match
      const startIndex = match.index
      const isComplete = fullMatch.endsWith('</think>')

      // Add text before the <think> tag
      if (startIndex > lastIndex) {
        const text = content.slice(lastIndex, startIndex)
        if (text.trim()) {
          parts.push(...parseTextForTools(text))
        }
      }

      parts.push({
        type: "reasoning",
        reasoning: parseTextForTools(reasoningContent || ''),
        isComplete
      })

      lastIndex = startIndex + fullMatch.length
    }

    // Add remaining text after last <think> tag
    if (lastIndex < content.length) {
      const text = content.slice(lastIndex)
      if (text.trim()) {
        parts.push(...parseTextForTools(text))
      }
    }

    return parts
  } catch (error) {
    console.error('Error parsing content:', error)
    return [{ type: "text", text: content }]
  }
}

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-lg p-3 text-sm sm:max-w-[70%]",
  {
    variants: {
      isUser: {
        true: "bg-primary text-primary-foreground",
        false: "bg-muted text-foreground",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-75",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      {
        isUser: true,
        animation: "slide",
        class: "slide-in-from-right",
      },
      {
        isUser: false,
        animation: "slide",
        class: "slide-in-from-left",
      },
      {
        isUser: true,
        animation: "scale",
        class: "origin-bottom-right",
      },
      {
        isUser: false,
        animation: "scale",
        class: "origin-bottom-left",
      },
    ],
  }
)

type Animation = VariantProps<typeof chatBubbleVariants>["animation"]

interface Attachment {
  name?: string
  contentType?: string
  url: string
}

interface PartialToolCall {
  state: "partial-call"
  toolName: string
}

interface ToolCall {
  state: "call"
  toolName: string
}

interface ToolResult {
  state: "result"
  toolName: string
  result: {
    __cancelled?: boolean
    [key: string]: any
  }
}

type ToolInvocation = PartialToolCall | ToolCall | ToolResult

interface ReasoningPart {
  type: "reasoning"
  reasoning: MessagePart[]
  isComplete: boolean
}

interface ToolInvocationPart {
  type: "tool-invocation"
  toolInvocation: ToolInvocation
}

interface TextPart {
  type: "text"
  text: string
}

// For compatibility with AI SDK types, not used
interface SourcePart {
  type: "source"
  source?: any
}

interface FilePart {
  type: "file"
  mimeType: string
  data: string
}

interface StepStartPart {
  type: "step-start"
}

type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | SourcePart
  | FilePart
  | StepStartPart

export interface Message {
  id: string
  role: "user" | "assistant" | (string & {})
  content: string
  createdAt?: Date
  experimental_attachments?: Attachment[]
  toolInvocations?: ToolInvocation[]
  parts?: MessagePart[]
}

export interface ChatMessageProps extends Message {
  showTimeStamp?: boolean
  animation?: Animation
  actions?: React.ReactNode
}

function dataUrlToUint8Array(data: string) {
  const base64 = data.split(",")[1]
  const buf = Buffer.from(base64, "base64")
  return new Uint8Array(buf)
}

// Memoized Avatar component to avoid re-renders
const AvatarView = memo(({ isUser }: { isUser: boolean }) => {
  const user = useCurrentUser()
  return isUser ? (
    <Avatar className={cn(
      "size-12 border border-black/[0.08] shadow-sm",
      isUser && "order-1",
    )}>
      <AvatarImage
        src={`https://gravatar.com/avatar/${md5(user.username)}?d=404`}
        alt={user.name}
      />
      <AvatarFallback>{user && user.name[0]}</AvatarFallback>
    </Avatar>
  ) : (
    <Avatar className={cn(
      "size-12 border border-black/[0.08] shadow-sm",
    )}>
      <AvatarFallback>
        <Brain className="size-6" />
      </AvatarFallback>
    </Avatar>
  )
})
AvatarView.displayName = "AvatarView"

// Memoized MessageContent component
const MessageContent = memo(({
  isUser,
  files,
  parsedParts,
  toolInvocations,
  content
}: {
  isUser: boolean
  files?: File[]
  parsedParts: MessagePart[]
  toolInvocations?: ToolInvocation[]
  content: string
}) => {
  if (isUser) {
    return (
      <>
        {files && files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((file, index) => (
              <FilePreview file={file} key={index} />
            ))}
          </div>
        )}
        <MarkdownRenderer>{content}</MarkdownRenderer>
      </>
    )
  }

  return (
    <>
      {files && files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, index) => (
            <FilePreview file={file} key={index} />
          ))}
        </div>
      )}

      <div>
        {toolInvocations && toolInvocations.length > 0 && (
          <ToolCallComponent toolInvocations={toolInvocations} />
        )}

        {parsedParts.length > 0 ? (
          parsedParts.map((part, index) => {
            if (part.type === "text") {
              return (
                <MarkdownRenderer key={`text-${index}`}>
                  {part.text}
                </MarkdownRenderer>
              )
            } else if (part.type === "reasoning") {
              return <ReasoningBlock key={`reasoning-${index}`} part={part} />
            } else if (part.type === "tool-invocation") {
              return (
                <ToolCallComponent
                  key={`tool-${index}`}
                  toolInvocations={[part.toolInvocation]}
                />
              )
            }
            return null
          })
        ) : (
          <MarkdownRenderer>{content}</MarkdownRenderer>
        )}
      </div>
    </>
  )
})
MessageContent.displayName = "MessageContent"

export const ChatMessage = memo<ChatMessageProps>(({
  role,
  content,
  createdAt,
  showTimeStamp = false,
  animation = "scale",
  actions,
  experimental_attachments,
  toolInvocations,
  parts,
}) => {
  const files = useMemo(() => {
    if (!experimental_attachments?.length) return undefined

    return experimental_attachments.map((attachment) => {
      const dataArray = dataUrlToUint8Array(attachment.url)
      return new File([dataArray], attachment.name ?? "Unknown", {
        type: attachment.contentType,
      })
    })
  }, [experimental_attachments])

  const isUser = role === "user"

  const formattedTime = useMemo(() =>
    createdAt?.toLocaleTimeString("tr-TR", TIME_FORMAT_OPTIONS)
    , [createdAt])

  // Memoize expensive parsing operation
  const parsedParts = useMemo(() => parseContent(content), [content])

  return (
    <article
      className={cn(
        "flex items-start gap-4 text-[15px] leading-relaxed group/message",
        isUser && "justify-end",
      )}
    >
      <AvatarView isUser={isUser} />

      <div
        className={cn(isUser ? "bg-muted px-4 py-3 rounded-xl max-w-[70%]" : "space-y-4 flex-1 relative")}
      >
        <div className="flex flex-col gap-3">
          <MessageContent
            isUser={isUser}
            files={files}
            parsedParts={parsedParts}
            toolInvocations={toolInvocations}
            content={content}
          />
        </div>

        {actions && (
          <div className="absolute bottom-0 right-0 flex items-center gap-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
            <div className="flex bg-white rounded-md border border-black/[0.08] shadow-sm">
              {actions}
            </div>
            {showTimeStamp && createdAt && (
              <time
                dateTime={createdAt.toISOString()}
                className="text-xs text-muted-foreground bg-white/80 backdrop-blur-sm px-2 py-1 rounded"
              >
                {formattedTime}
              </time>
            )}
          </div>
        )}

      </div>
    </article>
  )
})
ChatMessage.displayName = "ChatMessage"

const ReasoningBlock = memo(({ part }: { part: ReasoningPart }) => {
  const [isManuallyToggled, setIsManuallyToggled] = useState(false)
  const shouldAutoOpen = !part.isComplete
  const isOpen = isManuallyToggled ? !shouldAutoOpen : shouldAutoOpen

  const handleToggle = useCallback(() => {
    setIsManuallyToggled(prev => !prev)
  }, [])

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleToggle}
      className="group w-full overflow-hidden"
    >
      <div className="flex items-center">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <span className="flex items-center gap-2">
              {part.isComplete ? (
                <span className="relative overflow-hidden flex items-center">
                  <Brain className="size-3 mr-1" />
                  <span>
                    Asistan düşündü
                  </span>
                </span>
              ) : (
                <span className="relative overflow-hidden flex items-center">
                  <Loader2Icon className="size-3 animate-spin mr-1" />
                  <span className="animate-shine bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent">
                    Asistan düşünüyor...
                  </span>
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent forceMount>
        <motion.div
          initial={false}
          animate={isOpen ? "open" : "closed"}
          variants={{
            open: { height: "auto", opacity: 1 },
            closed: { height: 0, opacity: 0 },
          }}
          transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          className="mt-2 pl-3 border-l-2"
        >
          <div>
            <div className="text-sm text-muted-foreground mb-3">
              {part.reasoning.map((subPart, i) => {
                if (subPart.type === "text") {
                  return <span key={i} className="whitespace-pre-wrap">{subPart.text}</span>
                } else if (subPart.type === "tool-invocation") {
                  return <ToolCallComponent key={i} toolInvocations={[subPart.toolInvocation]} />
                }
                return null
              })}
            </div>
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  )
})
ReasoningBlock.displayName = "ReasoningBlock"

const ToolCallComponent = memo(({
  toolInvocations,
}: Pick<ChatMessageProps, "toolInvocations">) => {
  if (!toolInvocations?.length) return null

  return (
    <div>
      {toolInvocations.map((invocation, index) => {
        const isCancelled =
          invocation.state === "result" &&
          invocation.result.__cancelled === true

        if (isCancelled) {
          return (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border bg-red-50 border-red-200 px-3 py-2 text-sm text-red-700"
            >
              <Ban className="h-4 w-4" />
              <span>
                Cancelled{" "}
                <span className="font-mono font-semibold">
                  {invocation.toolName}
                </span>
              </span>
            </div>
          )
        }

        switch (invocation.state) {
          case "partial-call":
          case "call":
            return (
              <span
                key={index}
                className="flex items-center  text-muted-foreground text-sm mb-2"
              >
                <Terminal className="h-4 w-4" />
                <span className="animate-shine bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent">
                  <span className="font-mono font-semibold">{invocation.toolName}</span> aracı çağrılıyor...
                </span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </span>
            )
          case "result":
            return (
              <span
                key={index}
                className="flex items-center gap-1 text-muted-foreground text-sm mb-2"
              >
                <Code2 className="size-3" />
                <span>
                  <span className="font-mono font-semibold">{invocation.toolName}</span> aracından sonuç alındı
                </span>
              </span>
            )
          default:
            return null
        }
      })}
    </div>
  )
})
ToolCallComponent.displayName = "ToolCallComponent"
