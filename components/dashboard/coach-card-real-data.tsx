"use client"

import { MagicCard } from "@/components/ui/magic-card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import {
  Trophy,
  Target,
  Zap,
  TrendingUp,
  Users,
  Award,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { TeamForCard, RosterEntry, DraftBudget } from "@/components/dashboard/coach-card-with-toggle"

interface CoachCardRealDataProps {
  team: TeamForCard
  userId: string
  roster: RosterEntry[]
  draftBudget: DraftBudget
}

export function CoachCardRealData({
  team,
  roster,
  draftBudget,
}: CoachCardRealDataProps) {
  const budgetUsed = draftBudget.used
  const budgetTotal = draftBudget.total || 120
  const budgetPercentage = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0
  const wins = team.wins ?? 0
  const losses = team.losses ?? 0
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
  const totalPicks = roster.length
  const teamPokemon = roster.slice(0, 6).map((r) => ({
    name: r.pokemon_name,
    pointValue: r.point_value,
  }))
  const avatarUrl = team.avatar_url || team.logo_url
  const coachName = team.coach_name || "Coach"

  return (
    <MagicCard
      data-testid="coach-quick-view-card"
      className={cn(
        "relative min-w-0 overflow-hidden p-3 sm:p-5 w-full",
        "border border-white/20 dark:border-white/10",
        "bg-gradient-to-br from-card/80 via-card/60 to-card/40",
        "backdrop-blur-xl backdrop-saturate-150",
        "shadow-2xl shadow-primary/20",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none"
      )}
      gradientFrom="#CC0000"
      gradientTo="#3B4CCA"
      gradientSize={300}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 pointer-events-none" />
      <div className="absolute top-0 left-0 w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-l-4 border-primary/30 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-r-4 border-primary/30 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-8 h-8 sm:w-12 sm:h-12 border-b-4 border-l-4 border-primary/30 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-12 sm:h-12 border-b-4 border-r-4 border-primary/30 rounded-br-lg" />

      <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:gap-4 md:gap-6">
        <div className="relative mx-auto flex w-full max-w-[9.5rem] shrink-0 flex-col items-center gap-1 pt-2 sm:mx-0 sm:w-[38%] sm:max-w-[12rem] md:w-auto md:max-w-none md:pt-4">
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse motion-reduce:animate-none" />
          <div className="relative flex aspect-square w-full max-h-[28dvh] items-center justify-center sm:max-h-[32dvh] md:h-[120px] md:w-[120px] md:max-h-none">
            <Avatar className="h-full w-full max-h-full max-w-full border-2 border-white/20 shadow-xl">
              <AvatarImage src={avatarUrl || undefined} alt={team.name} className="object-contain" />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary-foreground">
                {team.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="relative text-xs sm:text-sm font-medium text-center text-foreground/80 italic max-w-full px-1 leading-relaxed break-words">
            {team.name}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3 pt-1 sm:pt-4 md:pt-8 md:pl-2">
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 items-baseline gap-2 flex-wrap">
              <h3
                className="min-w-0 text-xl sm:text-2xl font-bold tracking-tight leading-none break-words"
                style={{ fontFamily: "var(--font-marker)" }}
              >
                {coachName}
              </h3>
              <Badge className="bg-primary/90 text-primary-foreground border-2 border-white/20 shadow-lg backdrop-blur-sm flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold leading-tight h-5 shrink-0">
                <Award className="h-2.5 w-2.5" />
                <span>Coach</span>
              </Badge>
            </div>
            <p className="text-sm font-semibold text-primary break-words">{team.name}</p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Trophy className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                {wins}W - {losses}L
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                {winRate}% Win Rate
              </span>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Active Team
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 min-[400px]:grid-cols-6 sm:grid-cols-6 sm:gap-2">
              {(teamPokemon.length > 0
                ? teamPokemon
                : Array.from({ length: 6 }, () => ({ name: "—", pointValue: 0 }))
              ).map((pokemon, index) => (
                <div
                  key={index}
                  className="relative flex min-w-0 flex-col items-center gap-1 group"
                  title={pokemon.name}
                >
                  <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">
                    <div className="dark:hidden">
                      <Image
                        src="/pokeball-normal.svg"
                        alt={`${pokemon.name} pokeball`}
                        width={48}
                        height={48}
                        className="h-full w-full drop-shadow-md transition-transform group-hover:scale-110 motion-reduce:transition-none"
                      />
                    </div>
                    <div className="hidden dark:block">
                      <Image
                        src="/pokeball-ultra.svg"
                        alt={`${pokemon.name} ultra ball`}
                        width={48}
                        height={48}
                        className="h-full w-full drop-shadow-md transition-transform group-hover:scale-110 motion-reduce:transition-none"
                      />
                    </div>
                    {pokemon.pointValue > 0 && (
                      <div className="absolute -bottom-1 -right-1">
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[10px] font-bold leading-none border border-background"
                        >
                          {pokemon.pointValue}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <span className="w-full text-[10px] font-medium text-center leading-tight truncate">
                    {pokemon.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex min-w-0 items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-primary/10 flex-shrink-0">
                  <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium">Picks</span>
              </div>
              <Badge variant="secondary" className="font-bold text-xs ml-2 flex-shrink-0">
                {totalPicks}
              </Badge>
            </div>
            <div className="flex min-w-0 items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-primary/10 flex-shrink-0">
                  <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium">Budget</span>
              </div>
              <span className="text-xs font-bold text-primary ml-2 flex-shrink-0">
                {budgetUsed}/{budgetTotal}
              </span>
            </div>
          </div>

          <div className="min-w-0 space-y-1">
            <Progress value={budgetPercentage} className="h-2" />
            <span className="text-xs text-muted-foreground">{budgetPercentage}% utilized</span>
          </div>
        </div>
      </div>
    </MagicCard>
  )
}
