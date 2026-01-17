// Free Agency Agent - Assists with free agency decisions and trade proposals
import { Agent, run } from '@openai/agents'
import { AI_MODELS } from '@/lib/openai-client'
import { getAllMCPServers, initializeAllMCPServers, closeAllMCPServers } from './mcp-servers'

// Get all MCP servers for free agency agent
// Includes: Draft Pool (team data), Sequential Thinking (analysis), Search tools (research)
const freeAgencyMCPServers = getAllMCPServers()

// Create Free Agency Agent
export const freeAgencyAgent = new Agent({
  name: 'Free Agency Assistant',
  instructions: `You are an expert Pokémon free agency assistant for the Average at Best Battle League. Help coaches with:

- Analyzing team weaknesses and gaps
- Suggesting free agency targets based on team needs
- Evaluating trade proposals and their value
- Calculating transaction value and impact
- Tracking waiver priorities and availability
- Providing strategic advice on roster moves
- Researching Pokémon competitive usage and meta trends
- Using sequential thinking for complex trade analysis

Always use MCP tools to get real-time team data, budgets, and available Pokémon. Use web search tools (Brave Search, Tavily) to research Pokémon competitive usage, meta trends, and optimal sets. Use sequential thinking for multi-step trade analysis. Use Firecrawl to extract detailed information from competitive resources. Be analytical and provide clear reasoning for recommendations.`,
  model: AI_MODELS.STRATEGY_COACH, // Use GPT-5.2 for strategic analysis
  mcpServers: freeAgencyMCPServers,
})

// Initialize MCP connections
export async function initializeFreeAgencyAgent() {
  await initializeAllMCPServers()
}

// Close MCP connections
export async function closeFreeAgencyAgent() {
  await closeAllMCPServers()
}

// Evaluate a free agency target
export interface FreeAgencyEvaluationInput {
  teamId: string
  pokemonName: string
  seasonId?: string
}

export interface FreeAgencyEvaluationResult {
  evaluation: {
    fit: 'excellent' | 'good' | 'moderate' | 'poor'
    reasoning: string
    value: number // 1-10 scale
    impact: string[]
  }
  recommendation: 'strongly_recommend' | 'recommend' | 'consider' | 'not_recommend'
  finalOutput: string
}

export async function evaluateFreeAgencyTarget(
  input: FreeAgencyEvaluationInput
): Promise<FreeAgencyEvaluationResult> {
  await initializeFreeAgencyAgent()

  const prompt = `Team ID: ${input.teamId}
Pokémon: ${input.pokemonName}
${input.seasonId ? `Season ID: ${input.seasonId}` : ''}

Evaluate this free agency target. Use MCP tools to:
1. Get the team's current roster and budget
2. Check if the Pokémon is available
3. Analyze how this Pokémon fits the team
4. Evaluate the value and impact
5. Provide a clear recommendation

Be specific about type coverage, roles, and team composition.`

  const result = await run(freeAgencyAgent, prompt)

  return {
    evaluation: {
      fit: 'moderate',
      reasoning: '',
      value: 5,
      impact: [],
    },
    recommendation: 'consider',
    finalOutput: result.finalOutput,
  }
}

// Evaluate a trade proposal
export async function evaluateTradeProposal(
  teamId: string,
  proposedTrade: {
    giving: string[] // Pokémon names
    receiving: string[] // Pokémon names
  }
): Promise<string> {
  await initializeFreeAgencyAgent()

  const prompt = `Team ${teamId} is considering a trade:
Giving: ${proposedTrade.giving.join(', ')}
Receiving: ${proposedTrade.receiving.join(', ')}

Evaluate this trade proposal. Use MCP tools to:
1. Get team's current roster and needs
2. Analyze the value of Pokémon being given vs received
3. Consider team composition impact
4. Provide a clear recommendation with reasoning

Be honest about whether this trade benefits the team.`

  const result = await run(freeAgencyAgent, prompt)
  return result.finalOutput
}

// Suggest free agency targets
export async function suggestFreeAgencyTargets(
  teamId: string,
  needs?: string[]
): Promise<string> {
  await initializeFreeAgencyAgent()

  const prompt = `Team ${teamId} is looking for free agency targets.
${needs ? `Specific needs: ${needs.join(', ')}` : 'Analyze team needs first.'}

Use MCP tools to:
1. Analyze team weaknesses
2. Find available Pokémon that address those needs
3. Suggest 3-5 top targets with reasoning
4. Prioritize by value and fit

Provide actionable recommendations.`

  const result = await run(freeAgencyAgent, prompt)
  return result.finalOutput
}
