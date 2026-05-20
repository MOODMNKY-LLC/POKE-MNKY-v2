// Draft Assistant API Route — OpenClaw gateway (primary) with OpenAI fallback
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { convertToModelMessages } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import { AI_MODELS } from '@/lib/openai-client'
import { resolveCoachTeamForSeason } from '@/lib/coach-team-context'
import {
  handleOpenClawChatRequest,
  isOpenClawConfigured,
  openClawModeSystemPrompt,
} from '@/lib/openclaw/chat-route'

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
    let { messages, teamId, seasonId, mcpEnabled = true, model } = body

    if (!teamId && seasonId) {
      const { team } = await resolveCoachTeamForSeason(supabase, user.id, seasonId)
      teamId = team?.id
    }

    if (!teamId && !seasonId) {
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_current', true)
        .maybeSingle()
      if (season?.id) {
        seasonId = season.id
        const { team } = await resolveCoachTeamForSeason(supabase, user.id, season.id)
        teamId = team?.id
      }
    }

    if (!teamId) {
      return new Response(
        'teamId is required — link a league team (/dashboard/claim-team, Admin assign, or Your teams) before using Draft Assistant',
        { status: 400 }
      )
    }

    if (isOpenClawConfigured()) {
      return handleOpenClawChatRequest(request, {
        mode: 'draft',
        userId: user.id,
        systemPrompt: openClawModeSystemPrompt('draft', {
          teamId: String(teamId),
          seasonId: seasonId ? String(seasonId) : undefined,
        }),
      }, body)
    }

    // Get MCP server URL and API key from environment
    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
    const mcpApiKey = process.env.MCP_API_KEY

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
