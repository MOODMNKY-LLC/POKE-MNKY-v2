// Free Agency Agent API Route - Updated for useChat compatibility
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
    const { messages, teamId, seasonId, mcpEnabled = true, model } = body

    if (!teamId) {
      return new Response('teamId is required', { status: 400 })
    }

    // Get MCP server URL and API key from environment
    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
    const mcpApiKey = process.env.MCP_API_KEY

    // Build system message with context
    const systemMessage = `You are an expert free agency and trade evaluation assistant for the Average at Best Battle League.

Team ID: ${teamId}
${seasonId ? `Season ID: ${seasonId}` : ''}

Help coaches with:
- Trade evaluation and analysis
- Free agency target recommendations
- Roster gap identification
- Pick value assessment
- Transaction suggestions
- Team needs analysis

Use MCP tools to access team rosters, available Pokémon, and draft pool data. Provide specific, actionable recommendations with clear reasoning.`

    // Convert messages to model format
    const modelMessages = convertToModelMessages(messages || [])

    // Use selected model or default
    const selectedModel = model || AI_MODELS.STRATEGY_COACH

    // Conditionally include MCP tools
    const tools = mcpEnabled
      ? {
          mcp: openai.tools.mcp({
            serverLabel: 'poke-mnky-draft-pool',
            serverUrl: mcpServerUrl,
            serverDescription: 'Access to POKE MNKY draft pool and team data. Provides tools for querying team rosters, available Pokémon, pick values, and draft status.',
            requireApproval: 'never',
            // Configure authentication: Bearer token in authorization field
            ...(mcpApiKey && {
              authorization: `Bearer ${mcpApiKey}`,
            }),
          }),
        }
      : undefined

    // Use streamText with conditional MCP tools
    const result = await streamText({
      model: openai(selectedModel),
      system: systemMessage,
      messages: modelMessages,
      tools,
      maxSteps: mcpEnabled ? 5 : 1,
    })

    // Return streaming response compatible with useChat
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('[Free Agency] Error:', error)
    return new Response(
      error instanceof Error ? error.message : 'Free agency agent failed',
      { status: 500 }
    )
  }
}
