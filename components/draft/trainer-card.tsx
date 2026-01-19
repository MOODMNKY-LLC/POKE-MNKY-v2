"use client"

import { PokeMnkyAvatar } from "@/components/ui/poke-mnky-avatar"
import { MagicCard } from "@/components/ui/magic-card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Target,
  Zap,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TrainerCardProps {
  className?: string
  palette?: "red-blue" | "gold-black"
}

// Mock draft data - in production, this would come from props or API
const MOCK_DRAFT_STATS = {
  trainerName: "Draft Master",
  totalPicks: 11,
  budgetUsed: 95,
  budgetTotal: 120,
  winRate: 75,
  draftRank: 3,
  favoriteType: "Fire",
}

export function TrainerCard({ className, palette = "red-blue" }: TrainerCardProps) {
  const budgetPercentage = Math.round((MOCK_DRAFT_STATS.budgetUsed / MOCK_DRAFT_STATS.budgetTotal) * 100)
  const isDark = palette === "gold-black"

  return (
    <MagicCard
      className={cn(
        "relative overflow-hidden p-4 w-full max-w-2xl",
        "border-2 border-primary/20 dark:border-primary/30",
        "bg-card/95 backdrop-blur-sm",
        "shadow-2xl shadow-primary/10",
        className
      )}
      gradientFrom={isDark ? "#B3A125" : "#CC0000"}
      gradientTo={isDark ? "#FFDE00" : "#3B4CCA"}
      gradientSize={300}
    >
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary/30 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary/30 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary/30 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary/30 rounded-br-lg" />

      {/* Horizontal Card Content */}
      <div className="relative z-10 flex flex-row items-center gap-6">
        {/* Left: Avatar Section */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative">
            {isDark ? (
              <PokeMnkyAvatar
                palette="gold-black"
                variant="avatar"
                size={140}
                className="drop-shadow-2xl"
              />
            ) : (
              <PokeMnkyAvatar
                palette="red-blue"
                variant="avatar"
                size={140}
                className="drop-shadow-2xl"
              />
            )}
          </div>
          {/* Rank Badge */}
          <div className="absolute -top-2 -right-2">
            <Badge className="bg-primary text-primary-foreground border-2 border-background shadow-lg flex items-center gap-1 px-2 py-0.5 text-xs">
              <Trophy className="h-3 w-3" />
              <span className="font-bold">#{MOCK_DRAFT_STATS.draftRank}</span>
            </Badge>
          </div>
        </div>

        {/* Right: Trainer Info & Stats */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Trainer Info */}
          <div className="space-y-0.5">
            <h3 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-marker)' }}>
              {MOCK_DRAFT_STATS.trainerName}
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              Battle League Strategist
            </p>
          </div>

          {/* Stats Grid - Horizontal Layout */}
          <div className="grid grid-cols-2 gap-2">
            {/* Total Picks */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-primary/10 flex-shrink-0">
                  <Target className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium truncate">Picks</span>
              </div>
              <Badge variant="secondary" className="font-bold text-xs ml-2 flex-shrink-0">
                {MOCK_DRAFT_STATS.totalPicks}
              </Badge>
            </div>

            {/* Win Rate */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-primary/10 flex-shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium truncate">Win Rate</span>
              </div>
              <Badge 
                variant={MOCK_DRAFT_STATS.winRate >= 70 ? "default" : "secondary"}
                className="font-bold text-xs ml-2 flex-shrink-0"
              >
                {MOCK_DRAFT_STATS.winRate}%
              </Badge>
            </div>

            {/* Budget Used */}
            <div className="col-span-2 space-y-1 p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-md bg-primary/10">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Budget</span>
                </div>
                <span className="text-xs font-bold text-primary">
                  {MOCK_DRAFT_STATS.budgetUsed}/{MOCK_DRAFT_STATS.budgetTotal}
                </span>
              </div>
              <Progress value={budgetPercentage} className="h-1.5" />
            </div>

            {/* Favorite Type */}
            <div className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-md bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium">Favorite Type</span>
              </div>
              <Badge variant="outline" className="font-semibold capitalize text-xs">
                {MOCK_DRAFT_STATS.favoriteType}
              </Badge>
            </div>
          </div>

          {/* Card Footer Accent */}
          <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-full opacity-50" />
        </div>
      </div>
    </MagicCard>
  )
}
