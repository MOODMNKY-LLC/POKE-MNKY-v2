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
  const palette = "red-blue"
  const isDark = false

  return (
    <MagicCard
      className={cn(
        "relative overflow-hidden p-5 w-full",
        "border border-white/20 dark:border-white/10",
        "bg-gradient-to-br from-card/80 via-card/60 to-card/40",
        "backdrop-blur-xl backdrop-saturate-150",
        "shadow-2xl shadow-primary/20",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none"
      )}
      gradientFrom={isDark ? "#B3A125" : "#CC0000"}
      gradientTo={isDark ? "#FFDE00" : "#3B4CCA"}
      gradientSize={300}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 pointer-events-none" />
      <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary/30 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary/30 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary/30 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary/30 rounded-br-lg" />

      <div className="relative z-10 flex flex-row items-start gap-6">
        <div className="relative flex-shrink-0 flex flex-col items-center justify-between gap-1 pt-4 pb-0">
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative mb-0">
            <Avatar className="h-[120px] w-[120px] border-2 border-white/20 shadow-xl">
              <AvatarImage src={avatarUrl || undefined} alt={team.name} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary-foreground">
                {team.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="text-sm font-medium text-center text-foreground/80 italic max-w-[280px] px-2 leading-relaxed">
            {team.name}
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-3 min-w-0 pt-8 pl-4">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-2xl font-bold tracking-tight leading-none" style={{ fontFamily: "var(--font-marker)" }}>
                {coachName}
              </h3>
              <Badge className="bg-primary/90 text-primary-foreground border-2 border-white/20 shadow-lg backdrop-blur-sm flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold leading-tight h-5">
                <Award className="h-2.5 w-2.5" />
                <span>Coach</span>
              </Badge>
            </div>
            <p className="text-sm font-semibold text-primary">{team.name}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-primary" />
                {wins}W - {losses}L
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                {winRate}% Win Rate
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Active Team
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {(teamPokemon.length > 0 ? teamPokemon : Array.from({ length: 6 }, () => ({ name: "—", pointValue: 0 }))).map((pokemon, index) => (
                <div
                  key={index}
                  className="relative flex flex-col items-center gap-1 group"
                  title={pokemon.name}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="dark:hidden">
                      <Image
                        src="/pokeball-normal.svg"
                        alt={`${pokemon.name} pokeball`}
                        width={48}
                        height={48}
                        className="drop-shadow-md transition-transform group-hover:scale-110"
                      />
                    </div>
                    <div className="hidden dark:block">
                      <Image
                        src="/pokeball-ultra.svg"
                        alt={`${pokemon.name} ultra ball`}
                        width={48}
                        height={48}
                        className="drop-shadow-md transition-transform group-hover:scale-110"
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
                  <span className="text-[10px] font-medium text-center leading-tight max-w-[48px] truncate">
                    {pokemon.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-primary/10 flex-shrink-0">
                  <Target className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium truncate">Picks</span>
              </div>
              <Badge variant="secondary" className="font-bold text-xs ml-2 flex-shrink-0">
                {totalPicks}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-primary/10 flex-shrink-0">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium truncate">Budget</span>
              </div>
              <span className="text-xs font-bold text-primary ml-2 flex-shrink-0">
                {budgetUsed}/{budgetTotal}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Progress value={budgetPercentage} className="h-2" />
            <span className="text-xs text-muted-foreground">{budgetPercentage}% utilized</span>
          </div>
        </div>
      </div>
    </MagicCard>
  )
}
