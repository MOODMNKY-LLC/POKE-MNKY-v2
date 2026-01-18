/**
 * Context Detection for Unified Assistant
 * 
 * Detects current page context and determines appropriate agent type,
 * context data, and API endpoint.
 */

import { usePathname } from "next/navigation"

export type AgentType = "draft" | "battle-strategy" | "free-agency" | "pokedex" | "general"

export interface AssistantContext {
  agentType: AgentType
  apiEndpoint: string
  context: {
    teamId?: string | null
    seasonId?: string | null
    selectedPokemon?: string | null
    team1Id?: string | null
    team2Id?: string | null
    matchId?: string | null
  }
  title: string
  description: string
  characterPalette: "red-blue" | "gold-black"
}

/**
 * Detect assistant context based on current route
 */
export function detectAssistantContext(
  pathname: string,
  additionalContext?: {
    teamId?: string | null
    seasonId?: string | null
    selectedPokemon?: string | null
    team1Id?: string | null
    team2Id?: string | null
    matchId?: string | null
  }
): AssistantContext {
  // Draft Assistant
  if (pathname.startsWith("/draft")) {
    return {
      agentType: "draft",
      apiEndpoint: "/api/ai/draft-assistant",
      context: {
        teamId: additionalContext?.teamId || null,
        seasonId: additionalContext?.seasonId || null,
      },
      title: "Draft Assistant",
      description: "Get real-time draft recommendations and strategy analysis",
      characterPalette: "red-blue",
    }
  }

  // Battle Strategy
  if (pathname.startsWith("/showdown")) {
    return {
      agentType: "battle-strategy",
      apiEndpoint: "/api/ai/battle-strategy",
      context: {
        team1Id: additionalContext?.team1Id || null,
        team2Id: additionalContext?.team2Id || null,
        matchId: additionalContext?.matchId || null,
      },
      title: "Battle Strategy Assistant",
      description: "Get real-time battle analysis and move recommendations",
      characterPalette: "red-blue",
    }
  }

  // Free Agency
  if (pathname.startsWith("/dashboard/free-agency")) {
    return {
      agentType: "free-agency",
      apiEndpoint: "/api/ai/free-agency",
      context: {
        teamId: additionalContext?.teamId || null,
        seasonId: additionalContext?.seasonId || null,
      },
      title: "Free Agency Assistant",
      description: "Get trade evaluations and roster analysis",
      characterPalette: "red-blue",
    }
  }

  // Pokédex
  if (pathname.startsWith("/pokedex")) {
    return {
      agentType: "pokedex",
      apiEndpoint: "/api/ai/pokedex",
      context: {
        selectedPokemon: additionalContext?.selectedPokemon || null,
      },
      title: "Pokédex AI Assistant",
      description: "Ask questions about Pokémon, competitive strategy, and draft value",
      characterPalette: "red-blue",
    }
  }

  // General Assistant (default)
  return {
    agentType: "general",
    apiEndpoint: "/api/ai/assistant",
    context: {},
    title: "POKE MNKY Assistant",
    description: "Your AI companion for all things Pokémon Battle League",
    characterPalette: "red-blue",
  }
}

/**
 * Get quick actions for agent type
 */
export function getQuickActionsForAgent(agentType: AgentType): Array<{
  label: string
  prompt: string
  icon?: string
}> {
  switch (agentType) {
    case "draft":
      return [
        { label: "Available Pokémon", prompt: "What Pokémon are available in the draft pool?", icon: "sparkles" },
        { label: "My Budget", prompt: "How much budget do I have left?", icon: "wallet" },
        { label: "My Roster", prompt: "Show me my current roster", icon: "users" },
        { label: "Draft Status", prompt: "What's the current draft status?", icon: "bar-chart" },
        { label: "Strategy Analysis", prompt: "Analyze my draft strategy", icon: "target" },
      ]
    case "battle-strategy":
      return [
        { label: "Matchup Analysis", prompt: "Analyze the matchup between these teams", icon: "target" },
        { label: "Move Recommendations", prompt: "What moves should I use in this situation?", icon: "sword" },
        { label: "Tera Type Suggestions", prompt: "What Tera types should I consider?", icon: "zap" },
        { label: "Defensive Options", prompt: "What defensive options do I have?", icon: "shield" },
        { label: "Win Conditions", prompt: "What are my win conditions?", icon: "trending-up" },
      ]
    case "free-agency":
      return [
        { label: "Evaluate Trade", prompt: "Evaluate this trade proposal", icon: "arrow-left-right" },
        { label: "Roster Gaps", prompt: "What gaps exist in my roster?", icon: "users" },
        { label: "Transaction Ideas", prompt: "What transactions should I consider?", icon: "trending-up" },
        { label: "Pick Value", prompt: "What's the value of this Pokémon?", icon: "check-circle" },
        { label: "Team Needs", prompt: "What does my team need?", icon: "alert-circle" },
      ]
    case "pokedex":
      return [
        { label: "Pokémon Info", prompt: "Tell me about this Pokémon", icon: "book-open" },
        { label: "Competitive Stats", prompt: "What are this Pokémon's competitive stats?", icon: "bar-chart" },
        { label: "Best Moveset", prompt: "What's the best moveset for this Pokémon?", icon: "target" },
        { label: "Draft Value", prompt: "What's this Pokémon's draft value?", icon: "sparkles" },
        { label: "Type Matchups", prompt: "What are this Pokémon's type matchups?", icon: "search" },
      ]
    default:
      return [
        { label: "Help", prompt: "How can you help me?", icon: "help-circle" },
        { label: "Features", prompt: "What features do you have?", icon: "sparkles" },
      ]
  }
}
