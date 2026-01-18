// Pokédex AI Route - Updated for useChat compatibility
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { convertToModelMessages } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import { AI_MODELS, createResponseWithMCP } from '@/lib/openai-client'
import { getPokemonData } from '@/lib/pokemon-api'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Check if this is a useChat request (has messages array)
    const isUseChatRequest = Array.isArray(body.messages)
    
    // For useChat requests, use streamText
    if (isUseChatRequest) {
      const { messages, selectedPokemon, mcpEnabled = true, model } = body

      // Get MCP server URL and API key from environment
      const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
      const mcpApiKey = process.env.MCP_API_KEY

      // Build system message
      const systemMessage = `You are a knowledgeable Pokédex assistant for the Average at Best Battle League.

${selectedPokemon ? `Currently viewing: ${selectedPokemon}` : ''}

You MUST use the get_pokemon tool to fetch accurate Pokémon data. Never guess or invent stats, types, or abilities. Always cite which Pokémon you looked up.

When asked about 'points', refer to draft point costs in the league draft pool. Use MCP tools to access draft pool data when relevant.`

      // Convert messages to model format
      const modelMessages = convertToModelMessages(messages || [])

      // Use selected model or default
      const selectedModel = model || AI_MODELS.POKEDEX_QA

      // Build tools object - always include get_pokemon, conditionally include MCP
      const tools: any = {
        // Direct Pokémon data tool (always available)
        get_pokemon: {
          description: 'Fetch canonical Pokémon data including stats, types, abilities, and moves',
          parameters: {
            type: 'object',
            properties: {
              pokemon_name_or_id: {
                type: 'string',
                description: 'Pokémon name (e.g., "pikachu") or ID (e.g., "25")',
              },
            },
            required: ['pokemon_name_or_id'],
          },
          execute: async ({ pokemon_name_or_id }: { pokemon_name_or_id: string }) => {
            const pokemonData = await getPokemonData(pokemon_name_or_id)
            if (!pokemonData) {
              return { error: 'Pokémon not found' }
            }
            return {
              name: pokemonData.name,
              types: pokemonData.types,
              base_stats: pokemonData.base_stats,
              abilities: pokemonData.abilities,
              tier: pokemonData.tier,
              draft_cost: pokemonData.draft_cost,
            }
          },
        },
      }

      // Conditionally add MCP tools
      if (mcpEnabled) {
        tools.mcp = openai.tools.mcp({
          serverLabel: 'poke-mnky-draft-pool',
          serverUrl: mcpServerUrl,
          serverDescription: 'Access to POKE MNKY draft pool and team data. Provides tools for querying available Pokémon, draft costs, and team information.',
          requireApproval: 'never',
          // Configure authentication: Bearer token in authorization field
          ...(mcpApiKey && {
            authorization: `Bearer ${mcpApiKey}`,
          }),
        })
      }

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
    }

    // Legacy format: use Responses API (backward compatibility)
    const { query, useResponsesAPI = false } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Try Responses API with MCP if enabled
    if (useResponsesAPI || process.env.ENABLE_RESPONSES_API === 'true') {
      const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
      const mcpApiKey = process.env.MCP_API_KEY

      try {
        const response = await createResponseWithMCP({
          model: AI_MODELS.POKEDEX_QA,
          input: [
            {
              role: 'developer',
              content: [
                {
                  type: 'input_text',
                  text: 'You are a knowledgeable Pokédex assistant. Use MCP tools to access draft pool data and provide accurate information. When asked about "points", refer to draft point costs in the league draft pool.',
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: query,
                },
              ],
            },
          ],
          tools: [
            {
              type: 'mcp',
              server_label: 'poke-mnky-draft-pool',
              server_url: mcpServerUrl,
              server_description: 'Access to POKE MNKY draft pool and team data',
              require_approval: 'never',
              // Configure authentication: Bearer token in authorization field
              ...(mcpApiKey && {
                authorization: `Bearer ${mcpApiKey}`,
              }),
            },
            {
              type: 'function',
              function: {
                name: 'get_pokemon',
                description: 'Fetch canonical Pokémon data including stats, types, abilities, and moves',
                parameters: {
                  type: 'object',
                  properties: {
                    pokemon_name_or_id: {
                      type: 'string',
                      description: 'Pokémon name (e.g., "pikachu") or ID (e.g., "25")',
                    },
                  },
                  required: ['pokemon_name_or_id'],
                },
              },
            },
          ],
        })

        const answer = response.output_text || response.output?.[0]?.content?.[0]?.text || 'No response generated'

        const pokemonReferenced: string[] = []
        if (response.output) {
          for (const outputItem of response.output) {
            if (outputItem.type === 'tool_call' && outputItem.tool_call?.function?.name === 'get_pokemon') {
              const args = JSON.parse(outputItem.tool_call.function.arguments || '{}')
              if (args.pokemon_name_or_id) {
                pokemonReferenced.push(args.pokemon_name_or_id)
              }
            }
          }
        }

        return NextResponse.json({
          answer,
          pokemon_referenced: pokemonReferenced,
          source: 'responses_api',
        })
      } catch (responsesError: any) {
        console.error('[Pokédex] Responses API error:', responsesError)
        // Fall through to Chat Completions API
      }
    }

    // Fallback: Chat Completions API (legacy)
    const openaiClient = await import('@/lib/openai-client').then((m) => m.openai)

    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'get_pokemon',
          description: 'Fetch canonical Pokémon data including stats, types, abilities, and moves',
          parameters: {
            type: 'object',
            properties: {
              pokemon_name_or_id: {
                type: 'string',
                description: 'Pokémon name (e.g., "pikachu") or ID (e.g., "25")',
              },
            },
            required: ['pokemon_name_or_id'],
          },
        },
      },
    ]

    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a knowledgeable Pokédex assistant. You MUST use the get_pokemon tool to fetch accurate Pokémon data. Never guess or invent stats, types, or abilities. Always cite which Pokémon you looked up.',
      },
      {
        role: 'user' as const,
        content: query,
      },
    ]

    let response = await openaiClient.chat.completions.create({
      model: AI_MODELS.POKEDEX_QA,
      messages,
      tools,
      tool_choice: 'auto',
    })

    let finalMessage = response.choices[0].message

    // Handle tool calls
    if (finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
      const toolCall = finalMessage.tool_calls[0]
      const functionArgs = JSON.parse(toolCall.function.arguments)

      const pokemonData = await getPokemonData(functionArgs.pokemon_name_or_id)

      if (!pokemonData) {
        return NextResponse.json({ error: 'Pokémon not found' }, { status: 404 })
      }

      messages.push(finalMessage)
      messages.push({
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          name: pokemonData.name,
          types: pokemonData.types,
          base_stats: pokemonData.base_stats,
          abilities: pokemonData.abilities,
          tier: pokemonData.tier,
          draft_cost: pokemonData.draft_cost,
        }),
      })

      response = await openaiClient.chat.completions.create({
        model: AI_MODELS.POKEDEX_QA,
        messages,
      })

      finalMessage = response.choices[0].message
    }

    return NextResponse.json({
      answer: finalMessage.content,
      pokemon_referenced: finalMessage.tool_calls
        ? finalMessage.tool_calls.map((tc) => JSON.parse(tc.function.arguments).pokemon_name_or_id)
        : [],
      source: 'chat_completions',
    })
  } catch (error) {
    console.error('[Pokédex] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pokédex AI failed' },
      { status: 500 }
    )
  }
}
