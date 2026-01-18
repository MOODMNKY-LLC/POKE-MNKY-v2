// Draft Assistant API Route - Updated for useChat compatibility
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

    // Get MCP server URL from environment
    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'

    // Build system message with context
    const systemMessage = `You are an expert Pokémon draft league assistant for the Average at Best Battle League.

Team ID: ${teamId}
${seasonId ? `Season ID: ${seasonId}` : ''}

Help coaches make optimal draft picks by:
- Analyzing team needs (type coverage, roles, synergy)
- Suggesting picks based on budget and availability
- Warning about budget constraints
- Providing pick value analysis
- Tracking draft trends and patterns
- Considering team composition balance

Always use the available MCP tools to get real-time draft pool data, team budgets, and current picks. Be specific and actionable in your recommendations.`

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
            serverDescription: 'Access to POKE MNKY draft pool and team data. Provides tools for querying available Pokémon, team budgets, picks, and draft status.',
            requireApproval: 'never', // Auto-approve for seamless experience
          }),
        }
      : undefined

    // Use streamText with conditional MCP tools
    const result = await streamText({
      model: openai(selectedModel),
      system: systemMessage,
      messages: modelMessages,
      tools,
      maxSteps: mcpEnabled ? 5 : 1, // Allow multi-step tool calls only when MCP enabled
    })

    // Return streaming response compatible with useChat
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('[Draft Assistant] Error:', error)
    return new Response(
      error instanceof Error ? error.message : 'Draft assistant failed',
      { status: 500 }
    )
  }
}
