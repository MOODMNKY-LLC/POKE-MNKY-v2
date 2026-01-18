// General Assistant API Route - Unified assistant endpoint
// Updated to use Vercel AI SDK with toUIMessageStreamResponse pattern (from mnky-command analysis)
import {
  streamText,
  convertToModelMessages,
  validateUIMessages,
  consumeStream,
  stepCountIs,
} from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messages: rawMessages, model = 'gpt-4o', mcpEnabled = true, files } = body

    // Validate messages array exists
    if (!rawMessages || !Array.isArray(rawMessages)) {
      console.error('[General Assistant] Invalid messages:', rawMessages)
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const systemMessage = `You are POKE MNKY, an expert AI assistant for the Average at Best Battle League, a competitive Pokémon draft league platform.

You help coaches with:
- Draft strategy and pick recommendations
- Battle analysis and move suggestions
- Free agency and trade evaluations
- Pokémon information and competitive insights
- General league questions and guidance

Be friendly, helpful, and knowledgeable about Pokémon competitive play. Always use available tools when appropriate to get real-time data.`

    // Get MCP server URL from environment
    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'

    // Build tools object - conditionally include MCP tools
    const tools = mcpEnabled
      ? {
          mcp: openai.tools.mcp({
            serverLabel: 'poke-mnky-draft-pool',
            serverUrl: mcpServerUrl,
            serverDescription: 'Access to POKE MNKY draft pool and team data. Provides 9 tools: get_available_pokemon, get_draft_status, get_team_budget, get_team_picks, get_pokemon_types, get_smogon_meta, get_ability_mechanics, get_move_mechanics, analyze_pick_value.',
            requireApproval: 'never',
          }),
        }
      : undefined

    // Validate messages against tool schemas (from mnky-command pattern)
    const messages = await validateUIMessages({
      messages: rawMessages,
      tools,
    })

    // Convert UI messages to model format
    const prompt = convertToModelMessages(messages)

    // Stream text with tool call limits (from mnky-command pattern)
    const result = await streamText({
      model: openai(model),
      system: systemMessage,
      prompt,
      tools,
      stopWhen: stepCountIs(5), // Limit tool call loops to prevent infinite recursion
    })

    // Use newer UI message stream API (from mnky-command pattern)
    return result.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    console.error('[General Assistant] Error:', error)
    console.error('[General Assistant] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return new Response(
      error instanceof Error ? error.message : 'Assistant failed',
      { status: 500 }
    )
  }
}
