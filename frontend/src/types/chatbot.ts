import { IProvider } from './provider'
import { ITool } from './tool'
import { IUser } from './user'
import { IDocument } from './document'

export interface IChatbot {
  id: number
  name: string
  description: string
  provider_id: number
  provider?: IProvider
  user_id: number
  user?: IUser
  model_name: string
  system_prompt?: string
  tools?: ITool[]
  documents?: IDocument[]
  created_at?: string
  updated_at?: string
}
