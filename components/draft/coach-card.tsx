"use client"

import { PokeMnkyAvatar } from "@/components/ui/poke-mnky-avatar"
import { MagicCard } from "@/components/ui/magic-card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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

interface CoachCardProps {
  className?: string
  palette?: "red-blue" | "gold-black"
  coachName?: string
  teamName?: string
  wins?: number
  losses?: number
  totalPicks?: number
  budgetUsed?: number
  budgetTotal?: number
  teamPokemon?: Array<{ name: string; pointValue: number }>
}

// Mock coach data - in production, this would come from props or API
const MOCK_COACH_DATA = {
  coachName: "POKE MNKY",
  teamName: "MNKY MONS",
  tagline: "Aint no MNKY'n around with these mons!",
  wins: 12,
  losses: 3,
  totalPicks: 11,
  budgetUsed: 95,
  budgetTotal: 120,
  teamPokemon: [
    { name: "Charizard", pointValue: 20 },
    { name: "Pikachu", pointValue: 18 },
    { name: "Blastoise", pointValue: 17 },
    { name: "Venusaur", pointValue: 15 },
    { name: "Garchomp", pointValue: 14 },
    { name: "Tyranitar", pointValue: 11 },
  ],
}

export function CoachCard({ 
  className, 
  palette = "red-blue",
  coachName = MOCK_COACH_DATA.coachName,
  teamName = MOCK_COACH_DATA.teamName,
  tagline = MOCK_COACH_DATA.tagline,
  wins = MOCK_COACH_DATA.wins,
  losses = MOCK_COACH_DATA.losses,
  totalPicks = MOCK_COACH_DATA.totalPicks,
  budgetUsed = MOCK_COACH_DATA.budgetUsed,
  budgetTotal = MOCK_COACH_DATA.budgetTotal,
  teamPokemon = MOCK_COACH_DATA.teamPokemon,
}: CoachCardProps) {
  const budgetPercentage = Math.round((budgetUsed / budgetTotal) * 100)
  const isDark = palette === "gold-black"
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0

  return (
    <MagicCard
      className={cn(
        "relative overflow-hidden p-5 w-full",
        "border border-white/20 dark:border-white/10",
        "bg-gradient-to-br from-card/80 via-card/60 to-card/40",
        "backdrop-blur-xl backdrop-saturate-150",
        "shadow-2xl shadow-primary/20",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none",
        className
      )}
      gradientFrom={isDark ? "#B3A125" : "#CC0000"}
      gradientTo={isDark ? "#FFDE00" : "#3B4CCA"}
      gradientSize={300}
    >
      {/* Glassmorphic overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 pointer-events-none" />
      
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary/30 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary/30 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary/30 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary/30 rounded-br-lg" />

      {/* Horizontal Card Content */}
      <div className="relative z-10 flex flex-row items-start gap-6">
        {/* Left: Avatar Section - Prominently Featured */}
        <div className="relative flex-shrink-0 flex flex-col items-center justify-between gap-1 pt-4 pb-0">
          {/* Avatar Glow */}
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative mb-0">
            {isDark ? (
              <PokeMnkyAvatar
                palette="gold-black"
                variant="avatar"
                size={300}
                className="drop-shadow-2xl"
              />
            ) : (
              <PokeMnkyAvatar
                palette="red-blue"
                variant="avatar"
                size={300}
                className="drop-shadow-2xl"
              />
            )}
          </div>
          {/* Tagline - Aligned with bottom of right content */}
          <p className="text-sm font-medium text-center text-foreground/80 italic max-w-[280px] px-2 leading-relaxed">
            "{tagline}"
          </p>
        </div>

        {/* Right: Coach Info & Stats */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 pt-8 pl-4">
          {/* Coach Header */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-2xl font-bold tracking-tight leading-none" style={{ fontFamily: 'var(--font-marker)' }}>
                {coachName}
              </h3>
              {/* Coach Badge */}
              <Badge className="bg-primary/90 text-primary-foreground border-2 border-white/20 shadow-lg backdrop-blur-sm flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold leading-tight h-5">
                <Award className="h-2.5 w-2.5" />
                <span>Coach</span>
              </Badge>
            </div>
            <p className="text-sm font-semibold text-primary">
              {teamName}
            </p>
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

          {/* Team of 6 Pokemon (Pokeballs) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Active Team
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {teamPokemon.slice(0, 6).map((pokemon, index) => (
                <div
                  key={index}
                  className="relative flex flex-col items-center gap-1 group"
                  title={pokemon.name}
                >
                  {/* Pokeball - Theme-aware */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    {/* Light mode: Normal Pokeball */}
                    <div className="dark:hidden">
                      <Image
                        src="/pokeball-normal.svg"
                        alt={`${pokemon.name} pokeball`}
                        width={48}
                        height={48}
                        className="drop-shadow-md transition-transform group-hover:scale-110"
                      />
                    </div>
                    {/* Dark mode: Ultra Ball */}
                    <div className="hidden dark:block">
                      <Image
                        src="/pokeball-ultra.svg"
                        alt={`${pokemon.name} ultra ball`}
                        width={48}
                        height={48}
                        className="drop-shadow-md transition-transform group-hover:scale-110"
                      />
                    </div>
                    {/* Point value badge */}
                    <div className="absolute -bottom-1 -right-1">
                      <Badge 
                        variant="secondary" 
                        className="h-4 px-1 text-[10px] font-bold leading-none border border-background"
                      >
                        {pokemon.pointValue}
                      </Badge>
                    </div>
                  </div>
                  {/* Pokemon name (truncated) */}
                  <span className="text-[10px] font-medium text-center leading-tight max-w-[48px] truncate">
                    {pokemon.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Total Picks */}
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

            {/* Budget Used */}
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

          {/* Budget Progress */}
          <div className="space-y-1">
            <Progress value={budgetPercentage} className="h-2" />
            <span className="text-xs text-muted-foreground">{budgetPercentage}% utilized</span>
          </div>
        </div>
      </div>
    </MagicCard>
  )
}
