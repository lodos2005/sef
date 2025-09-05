import { useAutoAnimate } from "@formkit/auto-animate/react"
import { Router, useRouter } from "next/router"
import nProgress from "nprogress"
import { ReactNode, useCallback, useEffect, useRef } from "react"
import { ImperativePanelHandle } from "react-resizable-panels"

import { Sidebar } from "@/components/navigation/sidebar"
import { SiteHeader } from "@/components/navigation/site-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCurrentUser } from "@/hooks/auth/useCurrentUser"
import { cn } from "@/lib/utils"

import { opacityAnimation } from "@/lib/anim"
import GradientSvg from "../bg/gradient"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable"

const Layout = ({ Component, pageProps }: any) => {
  const router = useRouter()
  const [animated] = useAutoAnimate(opacityAnimation)
  const panel = useRef<ImperativePanelHandle>(null)

  const user = useCurrentUser()

  useEffect(() => {
    const handleRouteChangeStart = () => nProgress.start()
    const handleRouteChangeComplete = () => {
      nProgress.done()
    }
    const handleRouteChangeError = () => nProgress.done()

    Router.events.on("routeChangeStart", handleRouteChangeStart)
    Router.events.on("routeChangeComplete", handleRouteChangeComplete)
    Router.events.on("routeChangeError", handleRouteChangeError)

    return () => {
      Router.events.off("routeChangeStart", handleRouteChangeStart)
      Router.events.off("routeChangeComplete", handleRouteChangeComplete)
      Router.events.off("routeChangeError", handleRouteChangeError)
    }
  }, [])

  const getLayout = useCallback(
    Component.getLayout ?? ((page: ReactNode) => page),
    [Component]
  )

  if (!user || user.id === -1) {
    return null
  }

  return (
    <>
      <SiteHeader />
      <div className="flex-1">
        <ResizablePanelGroup
          className="min-h-[var(--container-height)]"
          direction="horizontal"
          autoSaveId="sefLayout"
        >
          <ResizablePanel
            defaultSize={18}
            minSize={15}
            collapsible={true}
            className={cn("md:block")}
            ref={panel}
          >
            <Sidebar />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            onDoubleClick={() => {
              panel.current?.isCollapsed()
                ? panel.current?.expand()
                : panel.current?.collapse()
            }}
          />
          <ResizablePanel defaultSize={82} minSize={75}>
            <ScrollArea
              className="relative"
              style={{
                height: "var(--container-height)",
              }}
            >
              <main>
                <div className="relative z-10" ref={animated}>
                  {getLayout(<Component {...pageProps} key={router.route} />)}
                </div>
                <div className="pointer-events-none absolute top-0 z-10 -ml-48 mt-40 flex h-[2px] w-96 rotate-90">
                  <div className="gradient w-full flex-none blur-xs"></div>
                  <div className="gradient ml-[-100%] w-full flex-none blur-[1px]"></div>
                  <div className="gradient ml-[-100%] w-full flex-none blur-xs"></div>
                  <div className="gradient ml-[-100%] w-full flex-none blur-[1px]"></div>
                </div>
                <GradientSvg className="pointer-events-none absolute top-0 z-0 h-auto w-full rotate-180 opacity-30 dark:opacity-60" />
              </main>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  )
}

export default Layout
