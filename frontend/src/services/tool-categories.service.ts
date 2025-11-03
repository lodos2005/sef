import { ApiService } from "./api.service"
import { IToolCategory } from "@/types/tool-category"

interface PaginatedResponse<T> {
  records: T[]
  total_records: number
  current_page: number
  total_pages: number
}

class ToolCategoriesService extends ApiService {
  public constructor() {
    super(process.env.NEXT_PUBLIC_API_URL || "")
  }

  public async getToolCategories(params?: {
    page?: number
    per_page?: number
    search?: string
  }): Promise<PaginatedResponse<IToolCategory>> {
    const response = await this.instance.get("/api/v1/tool_categories", { params })
    return response.data
  }

  public async getToolCategory(id: number): Promise<IToolCategory> {
    const response = await this.instance.get(`/api/v1/tool_categories/${id}`)
    return response.data
  }

  public async createToolCategory(
    data: Partial<IToolCategory>
  ): Promise<IToolCategory> {
    const response = await this.instance.post("/api/v1/tool_categories", data)
    return response.data
  }

  public async updateToolCategory(
    id: number,
    data: Partial<IToolCategory>
  ): Promise<IToolCategory> {
    const response = await this.instance.patch(`/api/v1/tool_categories/${id}`, data)
    return response.data
  }

  public async deleteToolCategory(id: number): Promise<void> {
    await this.instance.delete(`/api/v1/tool_categories/${id}`)
  }
}

export const toolCategoriesService = new ToolCategoriesService()
