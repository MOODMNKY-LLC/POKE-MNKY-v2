import { NextResponse } from "next/server"
import { openai, AI_MODELS } from "@/lib/openai-client"
import { getPokemonData } from "@/lib/pokemon-api"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Define tool for Pokémon lookup
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
    })
  } catch (error) {
    console.error("[v0] Pokédex AI error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI request failed" }, { status: 500 })
  }
}
