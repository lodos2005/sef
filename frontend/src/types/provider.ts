export interface IProvider {
  id: number
  name: string
  type: string
  description: string
  base_url: string
  api_key?: string
  created_at?: string
  updated_at?: string
}
