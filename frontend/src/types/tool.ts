export interface ITool {
  id: number
  name: string
  display_name: string
  description: string
  type: string
  config: Record<string, any>
  created_at: string
  updated_at: string
}