"use client"

import { ArrowDown, ArrowUp, Mic, Paperclip, Square, ThumbsDown, ThumbsUp } from "lucide-react"
import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type ReactElement
} from "react"

import { Button } from "@/components/ui/button"
import { type Message } from "@/components/ui/chat-message"
import { CopyButton } from "@/components/ui/copy-button"
import { MessageList } from "@/components/ui/message-list"
import { PromptSuggestions } from "@/components/ui/prompt-suggestions"
import { useAutoScroll } from "@/hooks/use-auto-scroll"
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea"
import { cn } from "@/lib/utils"
import { ScrollArea } from "./scroll-area"

interface ChatPropsBase {
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) => void
  messages: Array<Message>
  input: string
  className?: string
  handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement>
  isGenerating: boolean
  stop?: () => void
  onRateResponse?: (
    messageId: string,
    rating: "thumbs-up" | "thumbs-down"
  ) => void
  setMessages?: (messages: any[]) => void
  transcribeAudio?: (blob: Blob) => Promise<string>
}

interface ChatPropsWithoutSuggestions extends ChatPropsBase {
  append?: never
  suggestions?: never
}

interface ChatPropsWithSuggestions extends ChatPropsBase {
  append: (message: { role: "user"; content: string }) => void
  suggestions: string[]
}

type ChatProps = ChatPropsWithoutSuggestions | ChatPropsWithSuggestions

export function Chat({
  messages,
  handleSubmit,
  input,
  handleInputChange,
  stop,
  isGenerating,
  append,
  suggestions,
  className,
  onRateResponse,
  setMessages,
  transcribeAudio,
}: ChatProps) {
  const lastMessage = messages.at(-1)
  const isEmpty = messages.length === 0
  const isTyping = lastMessage?.role === "user"

  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // Enhanced stop function that marks pending tool calls as cancelled
  const handleStop = useCallback(() => {
    stop?.()

    if (!setMessages) return

    const latestMessages = [...messagesRef.current]
    const lastAssistantMessage = latestMessages.findLast(
      (m) => m.role === "assistant"
    )

    if (!lastAssistantMessage) return

    let needsUpdate = false
    let updatedMessage = { ...lastAssistantMessage }

    if (lastAssistantMessage.toolInvocations) {
      const updatedToolInvocations = lastAssistantMessage.toolInvocations.map(
        (toolInvocation) => {
          if (toolInvocation.state === "call") {
            needsUpdate = true
            return {
              ...toolInvocation,
              state: "result",
              result: {
                content: "Tool execution was cancelled",
                __cancelled: true, // Special marker to indicate cancellation
              },
            } as const
          }
          return toolInvocation
        }
      )

      if (needsUpdate) {
        updatedMessage = {
          ...updatedMessage,
          toolInvocations: updatedToolInvocations,
        }
      }
    }

    if (lastAssistantMessage.parts && lastAssistantMessage.parts.length > 0) {
      const updatedParts = lastAssistantMessage.parts.map((part: any) => {
        if (
          part.type === "tool-invocation" &&
          part.toolInvocation &&
          part.toolInvocation.state === "call"
        ) {
          needsUpdate = true
          return {
            ...part,
            toolInvocation: {
              ...part.toolInvocation,
              state: "result",
              result: {
                content: "Tool execution was cancelled",
                __cancelled: true,
              },
            },
          }
        }
        return part
      })

      if (needsUpdate) {
        updatedMessage = {
          ...updatedMessage,
          parts: updatedParts,
        }
      }
    }

    if (needsUpdate) {
      const messageIndex = latestMessages.findIndex(
        (m) => m.id === lastAssistantMessage.id
      )
      if (messageIndex !== -1) {
        latestMessages[messageIndex] = updatedMessage
        setMessages(latestMessages)
      }
    }
  }, [stop, setMessages, messagesRef])

  const messageOptions = useCallback(
    (message: Message) => ({
      actions: 
        <CopyButton
          content={message.content}
          copyMessage="Yanıt panoya kopyalandı."
        />,
    }),
    [onRateResponse]
  )

  return (
    <ChatContainer className={className}>
      {/* Chat Content - Scrollable Area */}
      <div className="flex-1 min-h-0">
        {isEmpty && append && suggestions ? (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-3xl mx-auto">
              <PromptSuggestions
                label="Try these prompts ✨"
                append={append}
                suggestions={suggestions}
              />
            </div>
          </div>
        ) : null}

        {messages.length > 0 ? (
          <ChatMessages messages={messages}>
            <MessageList
              messages={messages}
              isTyping={isTyping}
              messageOptions={messageOptions}
            />
          </ChatMessages>
        ) : null}
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div className="flex-shrink-0 pt-4 md:pt-8 px-4 md:px-6 lg:px-8 z-50">
        <div className="max-w-3xl mx-auto bg-background pb-4 md:pb-8">
          <ChatForm
            isPending={isGenerating || isTyping}
            handleSubmit={handleSubmit}
          >
            {({ files, setFiles }) => (
              <ChatInput
                value={input}
                onChange={handleInputChange}
                stop={handleStop}
                isGenerating={isGenerating}
                transcribeAudio={transcribeAudio}
                placeholder="Şef'e sorun..."
              />
            )}
          </ChatForm>
        </div>
      </div>
    </ChatContainer>
  )
}
Chat.displayName = "Chat"

export function ChatMessages({
  messages,
  children,
}: React.PropsWithChildren<{
  messages: Message[]
}>) {
  const {
    containerRef,
    scrollToBottom,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
  } = useAutoScroll([messages])

  return (
    <ScrollArea className="relative h-full flex flex-col">
      <div
        className="flex-1 px-4 md:px-6 lg:px-8 pb-4 pt-6"
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {children}
        </div>
      </div>

      {!shouldAutoScroll && (
        <div className="absolute bottom-4 right-4 md:right-6 lg:right-8">
          <Button
            onClick={scrollToBottom}
            className="h-8 w-8 rounded-full ease-in-out animate-in fade-in-0 slide-in-from-bottom-1 hover:bg-background hover:shadow-md transition-[box-shadow]"
            size="icon"
            variant="outline"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </ScrollArea>
  )
}

export const ChatContainer = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("h-full flex flex-col", className)}
      {...props}
    />
  )
})
ChatContainer.displayName = "ChatContainer"

interface ChatFormProps {
  className?: string
  isPending: boolean
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) => void
  children: (props: {
    files: File[] | null
    setFiles: React.Dispatch<React.SetStateAction<File[] | null>>
  }) => ReactElement
}

export const ChatForm = forwardRef<HTMLFormElement, ChatFormProps>(
  ({ children, handleSubmit, isPending, className }, ref) => {
    const [files, setFiles] = useState<File[] | null>(null)

    const onSubmit = (event: React.FormEvent) => {
      if (!files) {
        handleSubmit(event)
        return
      }

      const fileList = createFileList(files)
      handleSubmit(event, { experimental_attachments: fileList })
      setFiles(null)
    }

    return (
      <form ref={ref} onSubmit={onSubmit} className={className}>
        {children({ files, setFiles })}
      </form>
    )
  }
)
ChatForm.displayName = "ChatForm"

function createFileList(files: File[] | FileList): FileList {
  const dataTransfer = new DataTransfer()
  for (const file of Array.from(files)) {
    dataTransfer.items.add(file)
  }
  return dataTransfer.files
}

interface ChatInputProps {
  value: string
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>
  placeholder?: string
  stop?: () => void
  isGenerating: boolean
  transcribeAudio?: (blob: Blob) => Promise<string>
}

function ChatInput({
  value,
  onChange,
  placeholder = "Ask me anything...",
  stop,
  isGenerating,
  transcribeAudio,
}: ChatInputProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  useAutosizeTextArea({
    ref: textAreaRef as React.RefObject<HTMLTextAreaElement>,
    maxHeight: 200,
    borderWidth: 0,
    dependencies: [value],
  })

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="relative rounded-[20px] border border-transparent bg-muted transition-colors focus-within:bg-muted/50 focus-within:border-input">
      <textarea
        ref={textAreaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={isGenerating}
        className="flex sm:min-h-[84px] w-full bg-transparent px-4 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none [resize:none] border-none rounded-[20px]"
        placeholder={placeholder}
        aria-label="Enter your prompt"
      />
      {/* Input buttons */}
      <div className="flex items-center justify-between gap-2 p-3">
        {/* Left buttons */}
        <div className="flex items-center gap-2">
          {transcribeAudio && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full size-8 border-none hover:bg-background hover:shadow-md transition-[box-shadow]"
            >
              <Mic
                className="text-muted-foreground/70 size-5"
                size={20}
                aria-hidden="true"
              />
              <span className="sr-only">Audio</span>
            </Button>
          )}
        </div>
        {/* Right buttons */}
        <div className="flex items-center gap-2">
          {isGenerating && stop ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full size-8 border-none hover:bg-background hover:shadow-md transition-[box-shadow]"
              onClick={stop}
            >
              <Square className="h-3 w-3" fill="currentColor" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button
              type="submit"
              className="rounded-full p-2 h-8"
              disabled={!value.trim() || isGenerating}
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
