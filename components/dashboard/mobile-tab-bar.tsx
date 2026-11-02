"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { getMobileTabs, type CoachNavContext } from "@/lib/nav/coach-nav"
import { useNavLocation } from "@/components/dashboard/use-nav-location"

const TAB_CLASS =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"

export function MobileTabBar({ ctx }: { ctx: CoachNavContext }) {
  const { active } = useNavLocation()
  const { openMobile, setOpenMobile } = useSidebar()
  const tabs = getMobileTabs(ctx)
  const activeTabId = tabs.find((tab) => tab.groupId === active?.groupId)?.groupId
  const moreActive = openMobile || (!activeTabId && Boolean(active))

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTabId === tab.groupId && !openMobile
        return (
          <Link
            key={tab.groupId}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(TAB_CLASS, isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        )
      })}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={openMobile}
        onClick={() => setOpenMobile(true)}
        className={cn(TAB_CLASS, moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Menu className="size-5" aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  )
}
