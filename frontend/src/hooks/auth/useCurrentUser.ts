import Cookies from "js-cookie"
import { useEffect, useState } from "react"

import { authService } from "@/services"
import { IUser } from "@/types/user"

const defaultUserObject: IUser = {
  id: -1,
  username: "guest",
  super_admin: false,
} as IUser

export async function getCurrentUser(): Promise<IUser> {
  try {
    const response = await authService.me()
    return response.data
  } catch (error) {
    return defaultUserObject
  }
}

export function useCurrentUser(): IUser {
  const [currentUser, setCurrentUser] = useState<IUser>(defaultUserObject)

  useEffect(() => {
    const fetchUser = async () => {
      const updatedUser = await getCurrentUser()
      setCurrentUser(updatedUser)
    }
    fetchUser()
  }, [])

  return currentUser
}
