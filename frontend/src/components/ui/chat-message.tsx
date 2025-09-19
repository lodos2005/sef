import React, { useMemo, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Ban, ChevronRight, Code2, Loader2, Terminal } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FilePreview } from "@/components/ui/file-preview"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

function parseContent(content: string): MessagePart[] {
  const parts: MessagePart[] = []
  let remainingContent = content
  const globalActiveTools = new Map<string, number>() // Track tool execution across parsing contexts

  // Handle all <think> tags
  let thinkStartIndex = remainingContent.indexOf('<think>')
  while (thinkStartIndex !== -1) {
    // Add text before <think>
    if (thinkStartIndex > 0) {
      const text = remainingContent.slice(0, thinkStartIndex)
      if (text.trim()) {
        const textParts = parseTextForTools(text)
        parts.push(...textParts)
      }
    }

    // Find </think>
    const thinkEndIndex = remainingContent.indexOf('</think>', thinkStartIndex)
    let reasoningContent: string
    if (thinkEndIndex !== -1) {
      reasoningContent = remainingContent.slice(thinkStartIndex + 7, thinkEndIndex)
      remainingContent = remainingContent.slice(thinkEndIndex + 8)
    } else {
      // No closing tag, treat everything after <think> as reasoning
      reasoningContent = remainingContent.slice(thinkStartIndex + 7)
      remainingContent = ''
    }

    parts.push({ 
      type: "reasoning", 
      reasoning: parseTextForTools(reasoningContent), 
      isComplete: thinkEndIndex !== -1 
    })

    // Look for next <think> in remaining content
    thinkStartIndex = remainingContent.indexOf('<think>')
  }

  // Now parse remaining content for tool tags
  if (remainingContent.trim()) {
    const toolParts = parseTextForTools(remainingContent)
    parts.push(...toolParts)
  }

  return parts
}

function parseTextForTools(content: string): MessagePart[] {
  const parts: MessagePart[] = []
  const regex = /<(tool_executing)>((?:.|\n)*?)<\/tool_executing>|<(tool_executed)>((?:.|\n)*?)<\/tool_executed>/gi
  let lastIndex = 0
  let match
  const activeTools = new Map<string, number>() // Track tool name to parts index

  while ((match = regex.exec(content)) !== null) {
    const [_, tag1, content1, tag2, content2] = match
    const tag = tag1 || tag2
    const innerContent = content1 || content2
    const startIndex = match.index
    const toolName = innerContent.trim()

    // Debug logging for tool parsing issues
    if (process.env.NODE_ENV === 'development') {
      console.log(`Parsing tool tag: ${tag}, content: "${toolName}"`)
    }

    // Add text before the tag
    if (startIndex > lastIndex) {
      const text = content.slice(lastIndex, startIndex)
      if (text.trim()) {
        parts.push({ type: "text", text })
      }
    }

    // Add the part based on tag
    if (tag === "tool_executing") {
      const partIndex = parts.length
      // Ensure tool name is valid
      const validToolName = toolName || "Unknown Tool"
      if (!toolName && process.env.NODE_ENV === 'development') {
        console.warn('Empty tool name detected in tool_executing tag')
      }
      parts.push({
        type: "tool-invocation",
        toolInvocation: { state: "call", toolName: validToolName },
      })
      activeTools.set(validToolName, partIndex)
    } else if (tag === "tool_executed") {
      // Ensure tool name is valid
      const validToolName = toolName || "Unknown Tool"
      if (!toolName && process.env.NODE_ENV === 'development') {
        console.warn('Empty tool name detected in tool_executed tag')
      }
      // Check if we have a matching tool_executing part to replace
      const executingPartIndex = activeTools.get(validToolName)
      if (executingPartIndex !== undefined && executingPartIndex < parts.length) {
        const executingPart = parts[executingPartIndex]
        if (
          executingPart &&
          executingPart.type === "tool-invocation" &&
          executingPart.toolInvocation.state === "call" &&
          executingPart.toolInvocation.toolName === validToolName
        ) {
          // Replace the executing part with the result
          parts[executingPartIndex] = {
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              toolName: validToolName,
              result: {},
            },
          }
          activeTools.delete(validToolName)
        } else {
          // If no matching executing part found, just add the result
          parts.push({
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              toolName: validToolName,
              result: {},
            },
          })
        }
      } else {
        // No matching executing part found, just add the result
        parts.push({
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: validToolName,
            result: {},
          },
        })
      }
    }

    lastIndex = regex.lastIndex
  }

  // Add remaining text after last tag
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex)
    if (text.trim()) {
      parts.push({ type: "text", text })
    }
  }

  return parts
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

export const ChatMessage: React.FC<ChatMessageProps> = ({
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
    return experimental_attachments?.map((attachment) => {
      const dataArray = dataUrlToUint8Array(attachment.url)
      const file = new File([dataArray], attachment.name ?? "Unknown", {
        type: attachment.contentType,
      })
      return file
    })
  }, [experimental_attachments])

  const isUser = role === "user"

  const formattedTime = createdAt?.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  if (isUser) {
    return (
      <div
        className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
      >
        {files ? (
          <div className="mb-1 flex flex-wrap gap-2">
            {files.map((file, index) => {
              return <FilePreview file={file} key={index} />
            })}
          </div>
        ) : null}

        <div className={cn(chatBubbleVariants({ isUser, animation }))}>
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </div>

        {showTimeStamp && createdAt ? (
          <time
            dateTime={createdAt.toISOString()}
            className={cn(
              "mt-1 block px-1 text-xs opacity-50",
              animation !== "none" && "duration-500 animate-in fade-in-0"
            )}
          >
            {formattedTime}
          </time>
        ) : null}
      </div>
    )
  }

  const effectiveParts = parseContent(content)

  if (effectiveParts.length > 0) {
    return effectiveParts.map((part, index) => {
      if (part.type === "text") {
        return (
          <div
            className={cn(
              "flex flex-col",
              isUser ? "items-end" : "items-start"
            )}
            key={`text-${index}`}
          >
            <div className={cn(chatBubbleVariants({ isUser, animation }))}>
              <MarkdownRenderer>{part.text}</MarkdownRenderer>
              {actions ? (
                <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
                  {actions}
                </div>
              ) : null}
            </div>

            {showTimeStamp && createdAt ? (
              <time
                dateTime={createdAt.toISOString()}
                className={cn(
                  "mt-1 block px-1 text-xs opacity-50",
                  animation !== "none" && "duration-500 animate-in fade-in-0"
                )}
              >
                {formattedTime}
              </time>
            ) : null}
          </div>
        )
      } else if (part.type === "reasoning") {
        return <ReasoningBlock key={`reasoning-${index}`} part={part} />
      } else if (part.type === "tool-invocation") {
        return (
          <ToolCall
            key={`tool-${index}`}
            toolInvocations={[part.toolInvocation]}
          />
        )
      }
      return null
    })
  }

  if (toolInvocations && toolInvocations.length > 0) {
    return <ToolCall toolInvocations={toolInvocations} />
  }

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div className={cn(chatBubbleVariants({ isUser, animation }))}>
        <MarkdownRenderer>{content}</MarkdownRenderer>
        {actions ? (
          <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        ) : null}
      </div>

      {showTimeStamp && createdAt ? (
        <time
          dateTime={createdAt.toISOString()}
          className={cn(
            "mt-1 block px-1 text-xs opacity-50",
            animation !== "none" && "duration-500 animate-in fade-in-0"
          )}
        >
          {formattedTime}
        </time>
      ) : null}
    </div>
  )
}

function dataUrlToUint8Array(data: string) {
  const base64 = data.split(",")[1]
  const buf = Buffer.from(base64, "base64")
  return new Uint8Array(buf)
}

const ReasoningBlock = ({ part }: { part: ReasoningPart }) => {
  // Auto-open when thinking is ongoing, auto-close when complete
  const [isManuallyToggled, setIsManuallyToggled] = useState(false)
  const shouldAutoOpen = !part.isComplete
  const isOpen = isManuallyToggled ? !shouldAutoOpen : shouldAutoOpen

  const handleToggle = () => {
    setIsManuallyToggled(!isManuallyToggled)
  }

  return (
    <div className="mb-2 flex flex-col items-start sm:max-w-[70%]">
      <Collapsible
        open={isOpen}
        onOpenChange={handleToggle}
        className="group w-full overflow-hidden rounded-lg border bg-muted/50"
      >
        <div className="flex items-center p-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              <span className="flex items-center gap-2">
                {!part.isComplete && <Loader2 className="h-3 w-3 animate-spin" />}
                {part.isComplete ? "Asistan düşündü" : "Asistan düşünüyor..."}
              </span>
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
            className="border-t"
          >
            <div className="p-2">
              <div className="text-xs">
                {part.reasoning.map((subPart, i) => {
                  if (subPart.type === "text") {
                    return <span key={i} className="whitespace-pre-wrap">{subPart.text}</span>
                  } else if (subPart.type === "tool-invocation") {
                    return <ToolCall key={i} toolInvocations={[subPart.toolInvocation]} />
                  }
                  return null
                })}
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function ToolCall({
  toolInvocations,
}: Pick<ChatMessageProps, "toolInvocations">) {
  if (!toolInvocations?.length) return null

  return (
    <div className="mb-2 flex flex-col items-start sm:max-w-[70%]">
      {toolInvocations.map((invocation, index) => {
        const isCancelled =
          invocation.state === "result" &&
          invocation.result.__cancelled === true

        if (isCancelled) {
          return (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            >
              <Ban className="h-4 w-4" />
              <span>
                Cancelled{" "}
                <span className="font-mono">
                  {"`"}
                  {invocation.toolName}
                  {"`"}
                </span>
              </span>
            </div>
          )
        }

        switch (invocation.state) {
          case "partial-call":
          case "call":
            return (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              >
                <Terminal className="h-4 w-4" />
                <span>
                  {invocation.toolName} aracı çağrılıyor...
                </span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            )
          case "result":
            return (
              <div
                key={index}
                className="w-full flex flex-col gap-1.5 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  <span>
                    {invocation.toolName} aracından sonuç alındı, asistan yanıtını oluşturuyor
                  </span>
                </div>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
