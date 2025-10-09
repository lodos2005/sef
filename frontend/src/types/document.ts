export interface IDocument {
  id: number
  title: string
  description: string
  content?: string
  file_name: string
  file_type: string
  file_size: number
  chunk_count: number
  status: string // pending, processing, ready, failed
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}
