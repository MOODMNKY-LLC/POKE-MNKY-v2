import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, LayoutGrid, Trophy, Users } from "lucide-react"
import { MagicCard } from "@/components/ui/magic-card"
import { homepageLeagueBlocks } from "@/lib/homepage-config"
import { cn } from "@/lib/utils"

const icons: Record<string, ReactNode> = {
  standings: <Trophy className="h-5 w-5" />,
  teams: <Users className="h-5 w-5" />,
  schedule: <Calendar className="h-5 w-5" />,
  matchups: <LayoutGrid className="h-5 w-5" />,
}

export function HomepageLeagueBlocks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {homepageLeagueBlocks.map((block) => (
        <Link key={block.id} href={block.href} className="group block min-h-[140px]">
          <MagicCard
            className={cn(
              "h-full rounded-xl border border-border/50 bg-card/80 p-5 transition-shadow",
              "group-hover:shadow-md"
            )}
            gradientFrom="hsl(var(--primary))"
            gradientTo="hsl(var(--accent))"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                {icons[block.id] ?? <LayoutGrid className="h-5 w-5" />}
                <span className="font-semibold tracking-tight">{block.title}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{block.description}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                {block.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </MagicCard>
        </Link>
      ))}
    </div>
  )
}
