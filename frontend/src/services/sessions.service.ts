import { ApiService } from "./api.service"
import { ISession } from "@/types/session"

export class SessionsService extends ApiService {
  constructor() {
    super("/api/v1")
  }

  getUserSessions = () => {
    return this.instance.get<{records: ISession[]}>("/sessions")
  }

  getSession = (id: number) => {
    return this.instance.get<ISession>(`/sessions/${id}`)
  }

  createSession = (data: { chatbot_id: number }) => {
    return this.instance.post<ISession>("/sessions", data)
  }

  deleteSession = (id: number) => {
    return this.instance.delete(`/sessions/${id}`)
  }

  getSessionMessages = (id: number) => {
    return this.instance.get(`/sessions/${id}/messages`)
  }

  sendMessage = (id: number, data: { content: string; role: string }) => {
    return this.instance.post(`/sessions/${id}/messages`, data)
  }
}
