export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

export interface ApiMessage {
  id: number
  role: "user" | "assistant"
  content: string
  created_at: string
}

export interface ChatSession {
  id: number
  user_id: number
  chatbot_id: number
  summary?: string
  chatbot: {
    id: number
    name: string
    description: string
    web_search_enabled?: boolean
    prompt_suggestions?: string[]
  }
}
