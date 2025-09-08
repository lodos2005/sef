import { ApiService } from "./api.service"
import { AuthService } from "./auth.service"
import { SessionsService } from "./sessions.service"

export const authService = new AuthService("/api/v1/auth")
export const apiService = new ApiService("/api/v1")
export const sessionsService = new SessionsService()
export const http = apiService.getInstance()
