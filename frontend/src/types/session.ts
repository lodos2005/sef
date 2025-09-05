import { IUser } from './user'
import { IChatbot } from './chatbot'

export interface IMessage {
  id: number
  session_id: number
  role: string
  content: string
  session?: ISession
  created_at?: string
  updated_at?: string
}

export interface ISession {
  id: number
  user_id: number
  chatbot_id: number
  user?: IUser
  chatbot?: IChatbot
  messages?: IMessage[]
  created_at?: string
  updated_at?: string
}
