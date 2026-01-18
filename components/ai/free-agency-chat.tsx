"use client"

/**
 * Free Agency Chat Component
 * 
 * Specialized chat interface for free agency with:
 * - Trade evaluation quick actions
 * - Roster gap analysis
 * - Transaction recommendations
 */

import { BaseChatInterface } from "./base-chat-interface"
import { type QuickAction } from "./quick-actions"
import { ArrowLeftRight, Users, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"

export interface FreeAgencyChatProps {
  /** Team ID */
  teamId?: string
  /** Season ID */
  seasonId?: string
  /** Additional body parameters */
  body?: Record<string, any>
  /** Custom className */
  className?: string
}

const FREE_AGENCY_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Evaluate Trade",
    prompt: "Evaluate this trade proposal",
    icon: <ArrowLeftRight className="h-3 w-3" />,
  },
  {
    label: "Roster Gaps",
    prompt: "What gaps exist in my roster?",
    icon: <Users className="h-3 w-3" />,
  },
  {
    label: "Transaction Ideas",
    prompt: "What transactions should I consider?",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  {
    label: "Pick Value",
    prompt: "What's the value of this Pokémon?",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  {
    label: "Team Needs",
    prompt: "What does my team need?",
    icon: <AlertCircle className="h-3 w-3" />,
  },
]

export function FreeAgencyChat({
  teamId,
  seasonId,
  body,
  className,
}: FreeAgencyChatProps) {
  return (
    <BaseChatInterface
      apiEndpoint="/api/ai/free-agency"
      title="Free Agency Assistant"
      description="Get trade evaluations and roster analysis"
      characterPalette="red-blue"
      showCharacter={true}
      characterSize={32}
      body={{
        ...body,
        teamId,
        seasonId,
      }}
      emptyStateTitle="Free Agency Assistant"
      emptyStateDescription="Ask me about trades, roster gaps, transaction ideas, or pick values."
      className={className}
      quickActions={FREE_AGENCY_QUICK_ACTIONS}
    />
  )
}
