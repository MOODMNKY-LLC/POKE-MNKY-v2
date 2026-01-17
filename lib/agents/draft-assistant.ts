// Draft Assistant Agent - Helps coaches make optimal draft picks
import { Agent, run } from '@openai/agents'
import { AI_MODELS } from '@/lib/openai-client'
import { getDraftMCPServers, initializeAllMCPServers, closeAllMCPServers } from './mcp-servers'

// Get MCP servers for draft assistant
// Includes: Draft Pool (for data), Sequential Thinking (for analysis)
const draftMCPServers = getDraftMCPServers()

// Create Draft Assistant Agent
export const draftAssistantAgent = new Agent({
  name: 'Draft Assistant',
  instructions: `You are an expert Pokémon draft league assistant for the Average at Best Battle League. Help coaches make optimal draft picks by:

- Analyzing team needs (type coverage, roles, synergy)
- Suggesting picks based on budget and availability
- Warning about budget constraints
- Providing pick value analysis
- Tracking draft trends and patterns
- Considering team composition balance
- Using sequential thinking for complex multi-step analysis
- Researching Pokémon strategies and meta trends when needed

Always use the available MCP tools to get real-time draft pool data, team budgets, and current picks. Use sequential thinking for complex reasoning. Use web search tools (Brave Search, Tavily) when you need to research Pokémon strategies, meta trends, or competitive usage. Be specific and actionable in your recommendations.`,
  model: AI_MODELS.STRATEGY_COACH, // Use GPT-5.2 for strategic reasoning
  mcpServers: draftMCPServers,
})

// Initialize MCP connections (call this before using the agent)
export async function initializeDraftAssistant() {
  await initializeAllMCPServers()
}

// Close MCP connections (call this when done)
export async function closeDraftAssistant() {
  await closeAllMCPServers()
}

// Get draft recommendations for a team
export interface DraftRecommendationInput {
  teamId: string
  seasonId?: string
  context?: string
  currentPick?: number
}

export interface DraftRecommendationResult {
  recommendations: Array<{
    pokemon: string
    points: number
    reasoning: string
    value: 'high' | 'medium' | 'low'
  }>
  teamNeeds: {
    typeCoverage: string[]
    missingRoles: string[]
    budgetRemaining: number
  }
  warnings: string[]
  finalOutput: string
}

export async function getDraftRecommendation(
  input: DraftRecommendationInput
): Promise<DraftRecommendationResult> {
  // Ensure MCP servers are connected
  await initializeDraftAssistant()

  const prompt = `Team ID: ${input.teamId}
${input.seasonId ? `Season ID: ${input.seasonId}` : ''}
${input.currentPick ? `Current Pick Number: ${input.currentPick}` : ''}
${input.context ? `Context: ${input.context}` : ''}

Analyze the team's current roster, budget, and needs. Use the MCP tools to:
1. Get the team's current picks and budget
2. Get available Pokémon in the draft pool
3. Analyze what the team needs (type coverage, roles)
4. Suggest 3-5 optimal picks with reasoning
5. Warn about any budget constraints

Provide specific, actionable recommendations.`

  const result = await run(draftAssistantAgent, prompt)

  // Parse the result (agents return structured output)
  return {
    recommendations: [], // Will be parsed from result.finalOutput
    teamNeeds: {
      typeCoverage: [],
      missingRoles: [],
      budgetRemaining: 0,
    },
    warnings: [],
    finalOutput: result.finalOutput,
  }
}

// Quick draft pick suggestion (simplified)
export async function suggestDraftPick(
  teamId: string,
  budgetRemaining: number,
  pointRange?: [number, number]
): Promise<string> {
  await initializeDraftAssistant()

  const prompt = `Team ${teamId} has ${budgetRemaining} points remaining.
${pointRange ? `Looking for Pokémon between ${pointRange[0]} and ${pointRange[1]} points.` : ''}

Suggest the best available pick. Use MCP tools to check availability and analyze value.`

  const result = await run(draftAssistantAgent, prompt)
  return result.finalOutput
}
