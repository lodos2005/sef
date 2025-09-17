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
  created_at: string
  updated_at: string
}