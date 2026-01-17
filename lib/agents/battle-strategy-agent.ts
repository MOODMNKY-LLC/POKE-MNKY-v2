// Battle Strategy Agent - Provides battle strategy and move recommendations
import { Agent, run } from '@openai/agents'
import { AI_MODELS } from '@/lib/openai-client'
import { getAllMCPServers, initializeAllMCPServers, closeAllMCPServers } from './mcp-servers'

// Get all MCP servers for battle strategy agent
// Includes: Draft Pool (team data), Sequential Thinking (analysis), Search tools (move research)
const battleStrategyMCPServers = getAllMCPServers()

// Create Battle Strategy Agent
export const battleStrategyAgent = new Agent({
  name: 'Battle Strategy Assistant',
  instructions: `You are an expert Pokémon battle strategist for the Average at Best Battle League. Help coaches with:

- Analyzing team matchups and type advantages
- Suggesting optimal moves and strategies
- Calculating damage scenarios and outcomes
- Predicting opponent strategies
- Providing real-time battle advice
- Recommending Tera type usage
- Identifying counter-strategies
- Researching move sets and competitive strategies
- Using sequential thinking for complex battle scenarios

Use MCP tools to access team rosters and Pokémon data. Use web search tools (Brave Search, Tavily) to research move sets, competitive strategies, and damage calculations. Use Firecrawl to extract detailed information from strategy resources. Use sequential thinking for multi-step battle analysis. Be tactical and specific in your recommendations. Consider:
- Type matchups and coverage
- Speed tiers and priority moves
- Status conditions and hazards
- Weather and terrain effects
- Opponent's likely strategies`,
  model: AI_MODELS.BATTLE_CHOICE, // Use GPT-4.1 for tactical decisions
  mcpServers: battleStrategyMCPServers,
})

// Initialize MCP connections
export async function initializeBattleStrategyAgent() {
  await initializeAllMCPServers()
}

// Close MCP connections
export async function closeBattleStrategyAgent() {
  await closeAllMCPServers()
}

// Analyze team matchup
export interface MatchupAnalysisInput {
  team1Id: string
  team2Id: string
  seasonId?: string
}

export interface MatchupAnalysisResult {
  analysis: {
    team1Advantages: string[]
    team2Advantages: string[]
    keyMatchups: Array<{
      pokemon1: string
      pokemon2: string
      advantage: 'team1' | 'team2' | 'neutral'
      reasoning: string
    }>
    recommendedLeads: {
      team1: string[]
      team2: string[]
    }
  }
  strategy: {
    team1: string[]
    team2: string[]
  }
  finalOutput: string
}

export async function analyzeMatchup(
  input: MatchupAnalysisInput
): Promise<MatchupAnalysisResult> {
  await initializeBattleStrategyAgent()

  const prompt = `Analyze the matchup between Team ${input.team1Id} and Team ${input.team2Id}.
${input.seasonId ? `Season ID: ${input.seasonId}` : ''}

Use MCP tools to:
1. Get both teams' rosters
2. Analyze type matchups and advantages
3. Identify key Pokémon matchups
4. Suggest optimal leads for each team
5. Provide strategic recommendations

Be specific about type coverage, speed tiers, and tactical considerations.`

  const result = await run(battleStrategyAgent, prompt)

  return {
    analysis: {
      team1Advantages: [],
      team2Advantages: [],
      keyMatchups: [],
      recommendedLeads: {
        team1: [],
        team2: [],
      },
    },
    strategy: {
      team1: [],
      team2: [],
    },
    finalOutput: result.finalOutput,
  }
}

// Suggest battle moves
export async function suggestBattleMoves(
  teamId: string,
  opponentTeamId: string,
  activePokemon: string,
  opponentActivePokemon: string,
  battleState?: {
    hazards: string[]
    weather?: string
    terrain?: string
  }
): Promise<string> {
  await initializeBattleStrategyAgent()

  const prompt = `Team ${teamId} vs Team ${opponentTeamId}
Active: ${activePokemon} vs ${opponentActivePokemon}
${battleState ? `Battle State: ${JSON.stringify(battleState)}` : ''}

Suggest optimal moves for ${activePokemon}. Consider:
- Type effectiveness
- Speed tiers
- Current battle state
- Opponent's likely moves
- Team composition and backup options

Use MCP tools to get detailed Pokémon data if needed. Research move sets and competitive strategies using web search tools.`

  const result = await run(battleStrategyAgent, prompt)
  return result.finalOutput
}

// Recommend Tera types
export async function recommendTeraTypes(
  teamId: string,
  pokemon: string,
  opponentTeamId: string
): Promise<string> {
  await initializeBattleStrategyAgent()

  const prompt = `Team ${teamId} is considering Tera types for ${pokemon} against Team ${opponentTeamId}.

Use MCP tools to:
1. Get both teams' rosters
2. Analyze type coverage and weaknesses
3. Research competitive Tera type usage for ${pokemon}
4. Suggest optimal Tera types with reasoning
5. Consider offensive and defensive benefits

Provide 2-3 Tera type recommendations with clear reasoning.`

  const result = await run(battleStrategyAgent, prompt)
  return result.finalOutput
}
