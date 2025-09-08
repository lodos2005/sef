import { Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/router"

import { buttonVariants } from "@/components/ui/button"

import { cn } from "@/lib/utils"
import { Icons } from "../ui/icons"
import ProfileDropdown from "./profile-dropdown"

export function SiteHeader() {
  const router = useRouter()

  return (
    <header className="top-0 z-40 w-full border-b bg-background print:hidden">
      <div className="flex h-16 items-center space-x-4 px-6 sm:justify-between sm:space-x-0 xl:grid xl:grid-cols-3">
        <div className="flex">
          <Link
            href="/"
            className="flex items-center space-x-2 -ml-2"
          >
            <Icons.logo className="w-18 h-9 dark:fill-white" />
          </Link>
        </div>

        <div>
          
        </div>

        <div className="flex items-center justify-end space-x-4">
          <nav className="flex items-center gap-1">
            <Link href="/settings">
              <div
                className={cn("group", buttonVariants({
                  size: "sm",
                  variant: router.asPath.includes("/settings")
                    ? "secondary"
                    : "ghost",
                }))}
              >
                <Settings className="size-5 group-hover:rotate-90 transition-all" />
                <span className="sr-only">Settings</span>
              </div>
            </Link>

            <ProfileDropdown />
          </nav>
        </div>
      </div>
    </header>
  )
}
