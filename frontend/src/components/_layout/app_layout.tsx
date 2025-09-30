import { AppSidebar } from "@/components/app-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useRouter } from "next/router";
import { ReactNode, useCallback } from "react";

import ProfileDropdown from "../navigation/profile-dropdown";

const Layout = ({ Component, pageProps }: any) => {
  const router = useRouter()
  const user = useCurrentUser()

  const getLayout = useCallback(
    Component.getLayout ?? ((page: ReactNode) => page),
    [Component]
  )

  if (!user || user.id === -1) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-sidebar group/sidebar-inset">
        <header className="dark flex h-16 shrink-0 items-center gap-2 px-4 md:px-6 lg:px-8 bg-sidebar text-sidebar-foreground relative before:absolute before:inset-y-3 before:-left-px before:w-px before:bg-gradient-to-b before:from-white/5 before:via-white/15 before:to-white/5 before:z-50">
          <SidebarTrigger className="-ms-2" />
          <div className="flex items-center gap-8 ml-auto -mr-2">
            <ProfileDropdown />
          </div>
        </header>
        <div className="flex bg-background overflow-hidden rounded-l-3xl">
          <ScrollArea
            className="flex-1 h-[var(--container-height)]"
          >
            <main>
              <div className="relative z-10">
                {getLayout(<Component {...pageProps} key={router.route} />)}
              </div>
            </main>
          </ScrollArea>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
