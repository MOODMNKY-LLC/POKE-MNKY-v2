// General Assistant API Route - Unified assistant endpoint
// Using OpenAI SDK directly instead of Vercel AI SDK for better compatibility with GPT-5 models
import { createTextStreamResponse } from 'ai'
import { getOpenAI } from '@/lib/openai-client'
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

    const systemMessage = `You are POKE MNKY, an expert AI assistant for the Average at Best Battle League, a competitive Pokémon draft league platform.

You help coaches with:
- Draft strategy and pick recommendations
- Battle analysis and move suggestions
- Free agency and trade evaluations
- Pokémon information and competitive insights
- General league questions and guidance

Be friendly, helpful, and knowledgeable about Pokémon competitive play. Always use available tools when appropriate to get real-time data.`

    // Convert messages format for OpenAI API
    // OpenAI expects: { role: 'user'|'assistant'|'system', content: string }
    const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemMessage },
    ]

    // Convert useChat messages format to OpenAI format
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        // Extract text content from message parts
        let content = ''
        if (msg.parts && Array.isArray(msg.parts)) {
          content = msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('')
        } else if (typeof msg.content === 'string') {
          content = msg.content
        } else if (Array.isArray(msg.content)) {
          content = msg.content
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('')
        }

        if (content) {
          openaiMessages.push({
            role: msg.role as 'user' | 'assistant',
            content,
          })
        }
      }
    }

    // Use OpenAI SDK directly for streaming
    const openai = getOpenAI()

    // Note: MCP tools are not directly supported with OpenAI SDK streaming
    // For now, we'll stream without MCP tools. MCP integration would require
    // using Vercel AI SDK or implementing custom tool calling logic.
    const stream = await openai.chat.completions.create({
      model: model,
      messages: openaiMessages,
      stream: true,
    })

    // Convert OpenAI stream to useChat-compatible text stream format
    // Create an async generator that yields text deltas
    const textStream = async function* () {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          yield delta
        }
      }
    }

    // Return streaming response compatible with useChat
    return createTextStreamResponse(textStream())
  } catch (error) {
    console.error('[General Assistant] Error:', error)
    console.error('[General Assistant] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return new Response(
      error instanceof Error ? error.message : 'Assistant failed',
      { status: 500 }
    )
  }
}
