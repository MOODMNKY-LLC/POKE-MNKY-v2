// Battle Strategy Agent API Route - Updated for useChat compatibility
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { convertToModelMessages } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import { AI_MODELS } from '@/lib/openai-client'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { messages, team1Id, team2Id, matchId } = body

    // Get MCP server URL from environment
    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'

    // Build system message with context
    const systemMessage = `You are an expert Pokémon battle strategy coach for the Average at Best Battle League.

${team1Id ? `Team 1 ID: ${team1Id}` : ''}
${team2Id ? `Team 2 ID: ${team2Id}` : ''}
${matchId ? `Match ID: ${matchId}` : ''}

Provide strategic battle analysis including:
- Matchup analysis between teams
- Move recommendations based on current battle state
- Tera type suggestions
- Defensive options and pivots
- Win condition identification
- Type coverage analysis
- Speed tier considerations

Use MCP tools to access team rosters, Pokémon data, and battle information. Be specific and tactical in your recommendations.`

    // Convert messages to model format
    const modelMessages = convertToModelMessages(messages || [])

    // Use streamText with MCP tools
    const result = await streamText({
      model: openai(AI_MODELS.STRATEGY_COACH), // Use GPT-5.2 for strategic reasoning
      system: systemMessage,
      messages: modelMessages,
      tools: {
        // MCP tool integration
        mcp: openai.tools.mcp({
          serverLabel: 'poke-mnky-draft-pool',
          serverUrl: mcpServerUrl,
          serverDescription: 'Access to POKE MNKY draft pool and team data. Provides tools for querying team rosters, Pokémon stats, and battle information.',
          requireApproval: 'never',
        }),
      },
      maxSteps: 5,
    })

    // Return streaming response compatible with useChat
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('[Battle Strategy] Error:', error)
    return new Response(
      error instanceof Error ? error.message : 'Battle strategy agent failed',
      { status: 500 }
    )
  }
}
