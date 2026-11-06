"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { Menu } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { getMobileTabs, type CoachNavContext } from "@/lib/nav/coach-nav"
import { useNavLocation } from "@/components/dashboard/use-nav-location"

/** Touch-friendly tab hit area; min width enables horizontal scroll when labels would crush. */
const TAB_CLASS =
  "flex min-h-14 min-w-[4.5rem] shrink-0 snap-center flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"

export function MobileTabBar({ ctx }: { ctx: CoachNavContext }) {
  const { active } = useNavLocation()
  const { openMobile, setOpenMobile } = useSidebar()
  const tabs = getMobileTabs(ctx)
  const activeTabId = tabs.find((tab) => tab.groupId === active?.groupId)?.groupId
  const moreActive = openMobile || (!activeTabId && Boolean(active))
  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    const el = activeTabRef.current
    const scroller = scrollerRef.current
    if (!el || !scroller) return
    // Scroll only the tab strip — avoid scrollIntoView bubbling to the page.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const left = el.offsetLeft - (scroller.clientWidth - el.clientWidth) / 2
    scroller.scrollTo({
      left: Math.max(0, left),
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }, [activeTabId])

  return (
    <nav
      aria-label="Primary"
      data-testid="mobile-tab-bar"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:hidden"
    >
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollerRef}
          role="list"
          className={cn(
            "flex h-full overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory",
            "motion-reduce:scroll-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTabId === tab.groupId && !openMobile
            return (
              <Link
                key={tab.groupId}
                ref={isActive ? activeTabRef : undefined}
                role="listitem"
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  TAB_CLASS,
                  "flex-1",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={openMobile}
        aria-label="More navigation"
        data-testid="mobile-tab-more"
        onClick={() => setOpenMobile(true)}
        className={cn(
          TAB_CLASS,
          "w-[4.75rem] shrink-0 border-l border-border/60",
          moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Menu className="size-5 shrink-0" aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  )
}
