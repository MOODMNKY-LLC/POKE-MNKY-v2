"use client"

/**
 * Pokédex Chat Component
 * 
 * Specialized chat interface for Pokédex Q&A with:
 * - Pokémon-specific quick actions
 * - Competitive strategy questions
 * - Draft pool queries
 */

import { BaseChatInterface } from "./base-chat-interface"
import { type QuickAction } from "./quick-actions"
import { Search, BarChart3, Target, BookOpen, Sparkles } from "lucide-react"

export interface PokedexChatProps {
  /** Selected Pokémon ID/name */
  selectedPokemon?: string
  /** Additional body parameters */
  body?: Record<string, any>
  /** Custom className */
  className?: string
}

const POKEDEX_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Pokémon Info",
    prompt: "Tell me about this Pokémon",
    icon: <BookOpen className="h-3 w-3" />,
  },
  {
    label: "Competitive Stats",
    prompt: "What are this Pokémon's competitive stats?",
    icon: <BarChart3 className="h-3 w-3" />,
  },
  {
    label: "Best Moveset",
    prompt: "What's the best moveset for this Pokémon?",
    icon: <Target className="h-3 w-3" />,
  },
  {
    label: "Draft Value",
    prompt: "What's this Pokémon's draft value?",
    icon: <Sparkles className="h-3 w-3" />,
  },
  {
    label: "Type Matchups",
    prompt: "What are this Pokémon's type matchups?",
    icon: <Search className="h-3 w-3" />,
  },
]

export function PokedexChat({
  selectedPokemon,
  body,
  className,
}: PokedexChatProps) {
  const quickActions = selectedPokemon
    ? POKEDEX_QUICK_ACTIONS.map((action) => ({
        ...action,
        prompt: `${action.prompt} for ${selectedPokemon}`,
      }))
    : undefined

  return (
    <BaseChatInterface
      apiEndpoint="/api/ai/pokedex"
      title="Pokédex AI Assistant"
      description="Ask questions about Pokémon, competitive strategy, and draft value"
      characterPalette="red-blue"
      showCharacter={true}
      characterSize={32}
      body={{
        ...body,
        selectedPokemon,
      }}
      emptyStateTitle="Pokédex AI Assistant"
      emptyStateDescription="Ask me about any Pokémon's stats, moves, competitive viability, or draft value."
      className={className}
      quickActions={quickActions}
    />
  )
}
