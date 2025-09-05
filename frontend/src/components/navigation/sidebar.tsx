"use client"

import { useAutoAnimate } from "@formkit/auto-animate/react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { opacityAnimation } from "@/lib/anim"
import { Icons } from "../ui/icons"

export function Sidebar({ className }: { className?: string }) {
  const [parent] = useAutoAnimate(opacityAnimation)

  return (
    <div
      className={cn(
        "fixed z-30 w-full shrink-0 overflow-y-auto bg-background md:sticky md:block print:hidden",
        className
      )}
    >
      <ScrollArea
        style={{
          height: "var(--container-height)",
        }}
      >
        <div className="space-y-4 py-4 pb-[60px]">
          <div className="px-4 py-2" ref={parent}>
            test
          </div>
        </div>
        <div className="aciklab flex items-center justify-center py-4 absolute bottom-0 w-full pointer-events-none">
          <Icons.aciklab className="h-8 w-48 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-0 w-full"></div>
        </div>
      </ScrollArea>
    </div>
  )
}
