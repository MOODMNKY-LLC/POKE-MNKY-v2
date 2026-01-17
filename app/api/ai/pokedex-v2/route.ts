// Pokédex endpoint using Responses API with MCP tools
import { NextRequest, NextResponse } from "next/server"
import { openai, AI_MODELS, createResponseWithMCP } from "@/lib/openai-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, useMCP = true } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // IMPORTANT: OpenAI Responses API requires publicly accessible URL (Cloudflare Tunnel)
    // OpenAI's cloud infrastructure cannot access private IPs - must use Cloudflare Tunnel URL
    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || "https://mcp-draft-pool.moodmnky.com/mcp"

    if (useMCP) {
      // Use Responses API with MCP tools
      try {
        const response = await createResponseWithMCP({
          model: AI_MODELS.POKEDEX_QA,
          input: [
            {
              role: "developer",
              content: [
                {
                  type: "input_text",
                  text: "You are a knowledgeable Pokédex assistant. Use MCP tools to access draft pool data and provide accurate information.",
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: query,
                },
              ],
            },
          ],
          tools: [
            {
              type: "mcp",
              server_label: "poke-mnky-draft-pool",
              server_url: mcpServerUrl,
              server_description: "Access to POKE MNKY draft pool and team data",
              require_approval: "never", // Auto-approve tool calls for seamless experience
            },
            {
              type: "function",
              function: {
                name: "get_pokemon",
                description: "Fetch canonical Pokémon data including stats, types, abilities, and moves",
                parameters: {
                  type: "object",
                  properties: {
                    pokemon_name_or_id: {
                      type: "string",
                      description: "Pokémon name (e.g., 'pikachu') or ID (e.g., '25')",
                    },
                  },
                  required: ["pokemon_name_or_id"],
                },
              },
            },
          ],
        })

        // Extract answer from Responses API output
        // Responses API returns output_text or output array with content
        const answer = response.output_text || 
          response.output?.[0]?.content?.[0]?.text || 
          "No response generated" || response.output?.[0]?.content?.[0]?.text || "No response generated"

        // Extract referenced Pokémon from tool calls if available
        const pokemonReferenced: string[] = []
        if (response.output) {
          for (const outputItem of response.output) {
            if (outputItem.type === "function_call" && outputItem.function?.name === "get_pokemon") {
              try {
                const args = typeof outputItem.function.arguments === "string" 
                  ? JSON.parse(outputItem.function.arguments)
                  : outputItem.function.arguments
                if (args.pokemon_name_or_id) {
                  pokemonReferenced.push(args.pokemon_name_or_id)
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        return NextResponse.json({
          answer,
          pokemon_referenced: pokemonReferenced,
          source: "responses_api_mcp",
        })
      } catch (mcpError: any) {
        console.error("[v0] Responses API with MCP error:", mcpError)
        // Fall back to regular function calling if MCP fails
        console.log("[v0] Falling back to regular function calling")
      }
    }

    // Fallback to original Chat Completions API with function calling
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "get_pokemon",
          description: "Fetch canonical Pokémon data including stats, types, abilities, and moves",
          parameters: {
            type: "object",
            properties: {
              pokemon_name_or_id: {
                type: "string",
                description: "Pokémon name (e.g., 'pikachu') or ID (e.g., '25')",
              },
            },
            required: ["pokemon_name_or_id"],
          },
        },
      },
    ]

    const messages = [
      {
        role: "system" as const,
        content:
          "You are a knowledgeable Pokédex assistant. You MUST use the get_pokemon tool to fetch accurate Pokémon data. Never guess or invent stats, types, or abilities. Always cite which Pokémon you looked up.",
      },
      {
        role: "user" as const,
        content: query,
      },
    ]

    let response = await openai.chat.completions.create({
      model: AI_MODELS.POKEDEX_QA,
      messages,
      tools,
      tool_choice: "auto",
    })

    let finalMessage = response.choices[0].message

    // Handle tool calls
    if (finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
      const toolCall = finalMessage.tool_calls[0]
      const functionArgs = JSON.parse(toolCall.function.arguments)

      // Import getPokemonData function
      const { getPokemonData } = await import("@/lib/pokemon-api")

      // Execute the tool
      const pokemonData = await getPokemonData(functionArgs.pokemon_name_or_id)

      if (!pokemonData) {
        return NextResponse.json({ error: "Pokémon not found" }, { status: 404 })
      }

      // Continue conversation with tool result
      messages.push(finalMessage)
      messages.push({
        role: "tool" as const,
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

      response = await openai.chat.completions.create({
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
      source: "chat_completions",
    })
  } catch (error) {
    console.error("[v0] Pokédex AI error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed" },
      { status: 500 }
    )
  }
}
