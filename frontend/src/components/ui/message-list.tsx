import {
  ChatMessage,
  type ChatMessageProps,
  type Message,
} from "@/components/ui/chat-message"
import { TypingIndicator } from "@/components/ui/typing-indicator"

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof Message>

interface MessageListProps {
  messages: Message[]
  showTimeStamps?: boolean
  isTyping?: boolean
  isGenerating?: boolean
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: Message) => AdditionalMessageOptions)
}

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  isGenerating = false,
  messageOptions,
}: MessageListProps) {
  
  return (
    <>
      {messages.map((message, index) => {
        const additionalOptions =
          typeof messageOptions === "function"
            ? messageOptions(message)
            : messageOptions

        // Check if this is the last assistant message and if we're generating
        const isLastMessage = index === messages.length - 1
        const isAssistant = message.role === "assistant"
        const isStreaming = isLastMessage && isAssistant && isGenerating

        return (
          <ChatMessage
            key={message.id || index}
            showTimeStamp={showTimeStamps}
            {...message}
            {...additionalOptions}
            isStreaming={isStreaming}
          />
        )
      })}
      {isTyping && <TypingIndicator />}
    </>
  )
}
