"use client"

/**
 * Draft Assistant Chat Component
 * 
 * Specialized chat interface for draft assistance with:
 * - Draft-specific quick actions
 * - Budget tracking display
 * - Team context integration
 * - MCP tool call visualization
 */

import { BaseChatInterface } from "./base-chat-interface"
import { type QuickAction } from "./quick-actions"
import { Sparkles, Wallet, Users, BarChart3, Target } from "lucide-react"

export interface DraftAssistantChatProps {
  /** Team ID for context */
  teamId?: string
  /** Season ID */
  seasonId?: string
  /** Additional body parameters */
  body?: Record<string, any>
  /** Custom className */
  className?: string
}

const DRAFT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Available Pokémon",
    prompt: "What Pokémon are available in the draft pool?",
    icon: <Sparkles className="h-3 w-3" />,
  },
  {
    label: "My Budget",
    prompt: "How much budget do I have left?",
    icon: <Wallet className="h-3 w-3" />,
  },
  {
    label: "My Roster",
    prompt: "Show me my current roster",
    icon: <Users className="h-3 w-3" />,
  },
  {
    label: "Draft Status",
    prompt: "What's the current draft status?",
    icon: <BarChart3 className="h-3 w-3" />,
  },
  {
    label: "Strategy Analysis",
    prompt: "Analyze my draft strategy",
    icon: <Target className="h-3 w-3" />,
  },
]

export function DraftAssistantChat({
  teamId,
  seasonId,
  body,
  className,
}: DraftAssistantChatProps) {
  return (
    <BaseChatInterface
      apiEndpoint="/api/ai/draft-assistant"
      title="Draft Assistant"
      description="Get real-time draft recommendations and strategy analysis"
      characterPalette="red-blue"
      showCharacter={true}
      characterSize={32}
      body={{
        ...body,
        teamId,
        seasonId,
      }}
      emptyStateTitle="Welcome to Draft Assistant"
      emptyStateDescription="Ask me about available Pokémon, your budget, roster, or get strategic recommendations."
      className={className}
      quickActions={DRAFT_QUICK_ACTIONS}
    />
  )
}
