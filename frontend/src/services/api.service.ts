import axios, { AxiosInstance } from "axios"

import { useLogout } from "@/hooks/auth/useLogout"

export class ApiService {
  protected readonly instance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  }> = []

  public constructor(url: string) {
    this.instance = axios.create({
      baseURL: url,
      timeout: 30000,
      timeoutErrorMessage: "Time out!",
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    this.instance.interceptors.request.use((config) => {
      config.headers["x-language"] = localStorage.getItem("LANGUAGE") || "tr"
      return config
    })

    this.instance.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config

        // Handle 401 errors with token refresh
        if (error.response && error.response.status === 401) {
          // Don't intercept on auth pages
          if (
            window.location.pathname === "/auth/login" ||
            window.location.pathname === "/auth/callback"
          ) {
            return Promise.reject(error)
          }

          // If already tried refreshing for this request, logout
          if (originalRequest._retry) {
            const { logout } = useLogout()

            if (window.$setAuthDialog) {
              logout().finally(() => {
                window.$setAuthDialog(true)
              })
            } else {
              logout().finally(() => {
                window.location.href =
                  "/auth/login?redirect=" + window.location.pathname
              })
            }
            return Promise.reject(error)
          }

          // If we're already refreshing, queue this request
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            })
              .then(() => {
                return this.instance(originalRequest)
              })
              .catch((err) => {
                return Promise.reject(err)
              })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            // Try to refresh the token
            await axios.post(
              "/api/v1/auth/refresh",
              {},
              {
                withCredentials: true,
              }
            )

            // Token refreshed successfully, retry all queued requests
            this.processQueue(null)
            this.isRefreshing = false

            // Retry the original request
            return this.instance(originalRequest)
          } catch (refreshError) {
            // Refresh failed, logout user
            this.processQueue(refreshError)
            this.isRefreshing = false

            const { logout } = useLogout()

            if (window.$setAuthDialog) {
              logout().finally(() => {
                window.$setAuthDialog(true)
              })
            } else {
              logout().finally(() => {
                window.location.href =
                  "/auth/login?redirect=" + window.location.pathname
              })
            }

            return Promise.reject(refreshError)
          }
        }

        if (error.response && error.response.status === 504) {
          window.location.href = "/504"
        }

        // Don't intercept errors on auth pages - let them handle it
        if (window.location.pathname === "/auth/callback") {
          return Promise.reject(error)
        }

        return Promise.reject(error)
      }
    )
  }

  private processQueue(error: any) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve()
      }
    })

    this.failedQueue = []
  }

  /**
   * DEPRECATED
   * @returns AxiosInstance
   */
  getInstance = () => {
    return this.instance
  }
}
