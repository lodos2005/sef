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
  chatbot: {
    id: number
    name: string
    description: string
  }
}
