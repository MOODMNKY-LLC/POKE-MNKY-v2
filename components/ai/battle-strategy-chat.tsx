"use client"

/**
 * Battle Strategy Chat Component
 * 
 * Specialized chat interface for battle strategy with:
 * - Battle-specific quick actions
 * - Matchup analysis
 * - Move recommendations
 * - Tera type suggestions
 */

import { useState } from "react"
import { BaseChatInterface } from "./base-chat-interface"
import { type QuickAction } from "./quick-actions"
import { Sword, Shield, Zap, Target, TrendingUp } from "lucide-react"

export interface BattleStrategyChatProps {
  /** Team 1 ID */
  team1Id?: string
  /** Team 2 ID */
  team2Id?: string
  /** Match ID */
  matchId?: string
  /** Additional body parameters */
  body?: Record<string, any>
  /** Custom className */
  className?: string
}

const BATTLE_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Matchup Analysis",
    prompt: "Analyze the matchup between these teams",
    icon: <Target className="h-3 w-3" />,
  },
  {
    label: "Move Recommendations",
    prompt: "What moves should I use in this situation?",
    icon: <Sword className="h-3 w-3" />,
  },
  {
    label: "Tera Type Suggestions",
    prompt: "What Tera types should I consider?",
    icon: <Zap className="h-3 w-3" />,
  },
  {
    label: "Defensive Options",
    prompt: "What defensive options do I have?",
    icon: <Shield className="h-3 w-3" />,
  },
  {
    label: "Win Conditions",
    prompt: "What are my win conditions?",
    icon: <TrendingUp className="h-3 w-3" />,
  },
]

export function BattleStrategyChat({
  team1Id,
  team2Id,
  matchId,
  body,
  className,
}: BattleStrategyChatProps) {
  return (
    <BaseChatInterface
      apiEndpoint="/api/ai/battle-strategy"
      title="Battle Strategy Assistant"
      description="Get real-time battle analysis and move recommendations"
      characterPalette="red-blue"
      showCharacter={true}
      characterSize={32}
      body={{
        ...body,
        team1Id,
        team2Id,
        matchId,
      }}
      emptyStateTitle="Battle Strategy Assistant"
      emptyStateDescription="Ask me about matchups, move recommendations, Tera types, or battle strategy."
      className={className}
      quickActions={BATTLE_QUICK_ACTIONS}
    />
  )
}
