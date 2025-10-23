import { IToolCategory } from "./tool-category"

export interface ITool {
  id: number
  name: string
  display_name: string
  description: string
  type: string
  config: Record<string, any>
  parameters: Array<{
    name: string
    type: string
    description: string
    required: boolean
  }>
  category_id?: number
  category?: IToolCategory
  created_at: string
  updated_at: string
}