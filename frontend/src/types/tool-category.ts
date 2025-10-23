import { ITool } from "./tool"

export interface IToolCategory {
  id: number
  name: string
  display_name: string
  description: string
  order: number
  tools?: ITool[]
  created_at: string
  updated_at: string
}
