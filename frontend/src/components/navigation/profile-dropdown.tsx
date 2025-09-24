import md5 from "blueimp-md5"
import { ChevronDown, LogOut, User } from "lucide-react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"

import { Button, buttonVariants } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/auth/useCurrentUser"
import { useLogout } from "@/hooks/auth/useLogout"
import { cn } from "@/lib/utils"

import { ThemeToggle } from "../theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import FullScreenToggle from "./full-screen-toggle"
import LanguageSelector from "./language-selector"
import { Badge } from "../ui/badge"

export default function ProfileDropdown() {
  const router = useRouter()
  const { t } = useTranslation("common")

  const user = useCurrentUser()

  const { logout } = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            buttonVariants({
              size: "sm",
              variant: "ghost",
            }),
            "flex h-9 items-center gap-2"
          )}
        >
          <Avatar className="size-6">
            <AvatarImage
              src={`https://gravatar.com/avatar/${md5(user.username)}?d=404`}
              alt={user.name}
            />
            <AvatarFallback className="text-xs">
              {Object.keys(user).length > 0 &&
                (user.name ?? "")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
            </AvatarFallback>
          </Avatar>
          {user.name || ""}
          <ChevronDown className="size-3 text-muted-foreground" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mr-5 min-w-[340px]">
        {Object.keys(user).length > 0 && (
          <>
            <div className="flex">
              <div className="avatar mr-2 p-2 flex items-center gap-4">
                <Avatar className="size-12">
                  <AvatarImage
                    src={`https://gravatar.com/avatar/${md5(user.username)}?d=404`}
                    alt={user.name}
                  />
                  <AvatarFallback>{user && user.name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  {/* If user is super admin add a badge */}
                  {user.super_admin && (
                    <Badge variant="outline">
                      Super Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        <div className="flex gap-1">
          <div className="flex items-center">
            <LanguageSelector />

            <FullScreenToggle />
          </div>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              logout().then(() => {
                router.replace("/auth/login?redirect=" + router.asPath)
              })
            }}
          >
            <LogOut className="mr-2 size-4" /> {t("profile_dropdown.logout")}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
