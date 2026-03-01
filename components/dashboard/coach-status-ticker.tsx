"use client"

import Link from "next/link"
import { Marquee } from "@/components/ui/marquee"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Sword, Users, Calendar, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const TICKER_ITEMS: { label: string; href: string; icon: React.ReactNode }[] = [
  { label: "Team Builder", href: "/dashboard/teams/builder", icon: <Sword className="h-3.5 w-3.5" /> },
  { label: "Free Agency", href: "/dashboard/free-agency", icon: <Users className="h-3.5 w-3.5" /> },
  { label: "Weekly Matches", href: "/dashboard/weekly-matches", icon: <Calendar className="h-3.5 w-3.5" /> },
  { label: "Guides", href: "/dashboard/guides", icon: <BookOpen className="h-3.5 w-3.5" /> },
]

export function CoachStatusTicker() {
  const tickerContent = (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
        <Badge variant="secondary" className="text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
          Coach ready
        </Badge>
      </div>
      {TICKER_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
            "text-muted-foreground hover:text-foreground hover:bg-green-500/10",
            "border border-transparent hover:border-green-500/20 transition-colors shrink-0"
          )}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
      <span className="text-muted-foreground/60 text-sm shrink-0 px-2">•</span>
    </>
  )

  return (
    <div
      className={cn(
        "touch-manipulation rounded-lg border overflow-hidden",
        "border-green-500/30 bg-green-500/5 dark:border-green-600/30 dark:bg-green-600/5"
      )}
    >
      <Marquee pauseOnHover className="[--duration:50s] py-2" repeat={3}>
        {tickerContent}
      </Marquee>
    </div>
  )
}
