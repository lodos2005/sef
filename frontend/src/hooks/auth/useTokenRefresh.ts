import { useEffect, useRef } from "react"
import { http } from "@/services"

/**
 * Hook to automatically refresh authentication tokens before they expire
 * Refreshes every 4 minutes (tokens typically last 5 minutes in Keycloak)
 */
export function useTokenRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const refreshToken = async () => {
      // Don't refresh on auth pages
      if (
        window.location.pathname === "/auth/login" ||
        window.location.pathname === "/auth/callback"
      ) {
        return
      }

      try {
        await http.post("/auth/refresh")
        console.log("Token refreshed successfully")
      } catch (error) {
        console.error("Failed to refresh token:", error)
        // Error will be handled by the interceptor
      }
    }

    // Refresh token every 4 minutes (240000 ms)
    // Keycloak default access token lifetime is usually 5 minutes
    intervalRef.current = setInterval(refreshToken, 4 * 60 * 1000)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}
