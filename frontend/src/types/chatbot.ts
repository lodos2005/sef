import { IProvider } from './provider'
import { IUser } from './user'

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
  created_at?: string
  updated_at?: string
}
