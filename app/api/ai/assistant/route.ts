// General Assistant API Route - Unified assistant endpoint
import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { AI_MODELS } from '@/lib/openai-client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messages, model = AI_MODELS.STRATEGY_COACH, mcpEnabled = true, files } = body

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      console.error('[General Assistant] Invalid messages:', messages)
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'

    const systemMessage = `You are POKE MNKY, an expert AI assistant for the Average at Best Battle League, a competitive Pokémon draft league platform.

You help coaches with:
- Draft strategy and pick recommendations
- Battle analysis and move suggestions
- Free agency and trade evaluations
- Pokémon information and competitive insights
- General league questions and guidance

Be friendly, helpful, and knowledgeable about Pokémon competitive play. Always use available tools when appropriate to get real-time data.`

    let modelMessages
    try {
      modelMessages = convertToModelMessages(messages || [])
    } catch (error) {
      console.error('[General Assistant] Error converting messages:', error)
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      )
    }

    const tools = mcpEnabled
      ? {
          mcp: openai.tools.mcp({
            serverLabel: 'poke-mnky-draft-pool',
            serverUrl: mcpServerUrl,
            serverDescription: 'Access to POKE MNKY draft pool and team data. Provides tools for querying available Pokémon, team budgets, picks, and draft status.',
            requireApproval: 'never',
          }),
        }
      : undefined

    let result
    try {
      result = await streamText({
        model: openai(model),
        system: systemMessage,
        messages: modelMessages,
        tools,
        maxSteps: mcpEnabled ? 5 : 1,
      })
    } catch (streamError) {
      console.error('[General Assistant] streamText error:', streamError)
      console.error('[General Assistant] streamText error details:', {
        error: streamError,
        errorType: typeof streamError,
        errorMessage: streamError instanceof Error ? streamError.message : String(streamError),
        errorStack: streamError instanceof Error ? streamError.stack : undefined,
      })
      return NextResponse.json(
        { error: `Streaming error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    // Verify result has toDataStreamResponse method
    if (!result || typeof result.toDataStreamResponse !== 'function') {
      console.error('[General Assistant] Invalid streamText result:', {
        result,
        resultType: typeof result,
        hasMethod: result && typeof result.toDataStreamResponse === 'function',
        resultKeys: result ? Object.keys(result) : null,
        resultConstructor: result?.constructor?.name,
      })
      return NextResponse.json(
        { error: 'Invalid streaming response from AI SDK' },
        { status: 500 }
      )
    }

    try {
      return result.toDataStreamResponse()
    } catch (responseError) {
      console.error('[General Assistant] Error calling toDataStreamResponse:', responseError)
      return NextResponse.json(
        { error: `Response conversion error: ${responseError instanceof Error ? responseError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[General Assistant] Error:', error)
    console.error('[General Assistant] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return new Response(
      error instanceof Error ? error.message : 'Assistant failed',
      { status: 500 }
    )
  }
}
