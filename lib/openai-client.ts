// OpenAI client configuration for GPT-4/5 models

import OpenAI from "openai"

// Singleton instance - only created when first needed at runtime
let _openaiClient: OpenAI | null = null

// Lazy initialization function - only called when actually used
function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not set. Please add it to your Vercel project environment variables.",
      )
    }
    _openaiClient = new OpenAI({ apiKey })
  }
  return _openaiClient
}

// Export a function, not an object with getters (to avoid module-time evaluation)
export function getOpenAI() {
  return getOpenAIClient()
}

// This uses a getter-based approach that defers client creation until property access
export const openai = {
  get chat() {
    return getOpenAIClient().chat
  },
  get completions() {
    return getOpenAIClient().completions
  },
  get embeddings() {
    return getOpenAIClient().embeddings
  },
  get models() {
    return getOpenAIClient().models
  },
  get audio() {
    return getOpenAIClient().audio
  },
  get files() {
    return getOpenAIClient().files
  },
  get images() {
    return getOpenAIClient().images
  },
  get moderations() {
    return getOpenAIClient().moderations
  },
}

// Model selection based on use case
export const AI_MODELS = {
  // GPT-4.x for structured, grounded tasks
  POKEDEX_QA: "gpt-4.1", // Grounded Pokédex questions
  BATTLE_CHOICE: "gpt-4.1", // Per-turn battle decisions
  RESULT_PARSER: "gpt-4.1", // Parse match results from Discord

  // GPT-5.x for strategic reasoning and content generation
  STRATEGY_COACH: "gpt-5.2", // Deep strategic analysis
  WEEKLY_RECAP: "gpt-5.2", // Commissioner-style recaps
  DISPUTE_RESOLUTION: "gpt-5.2", // Complex rule interpretation

  // GPT-5 mini for routine tasks
  QUICK_SUMMARY: "gpt-5-mini", // Daily digests
  DISCORD_REPLY: "gpt-5-mini", // Simple bot responses
} as const

export interface PokedexQuery {
  query: string
  pokemon_data?: any
}

export interface BattleChoiceInput {
  battle_id: string
  turn: number
  active_pokemon: string
  legal_actions: string[]
  state_summary: {
    hp: string
    status: string | null
    opponent_active: string
    hazards: string[]
    weather: string | null
  }
}

export interface BattleChoice {
  choice: string
  reasoning_short: string
}

// Grounded Pokédex Q&A
export async function askPokedexQuestion(input: PokedexQuery): Promise<string> {
  const openaiClient = getOpenAIClient()

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "get_pokemon",
        description: "Fetch canonical Pokémon data from cache",
        parameters: {
          type: "object",
          properties: {
            pokemon_name_or_id: { type: "string" },
          },
          required: ["pokemon_name_or_id"],
        },
      },
    },
  ]

  const response = await openaiClient.chat.completions.create({
    model: AI_MODELS.POKEDEX_QA,
    messages: [
      {
        role: "system",
        content:
          "You are a Pokédex assistant. You MUST use tools for Pokémon facts. Do not guess or hallucinate data. Always cite the specific Pokémon you looked up.",
      },
      {
        role: "user",
        content: input.query,
      },
    ],
    tools,
    tool_choice: "auto",
  })

  // Handle tool calls (simplified - production would loop)
  const message = response.choices[0].message
  if (message.tool_calls) {
    // In production, execute tool calls and continue conversation
    return "Tool call needed: " + JSON.stringify(message.tool_calls)
  }

  return message.content || "No response"
}

// Battle move selection
export async function selectBattleMove(input: BattleChoiceInput): Promise<BattleChoice> {
  const openaiClient = getOpenAIClient()

  const response = await openaiClient.chat.completions.create({
    model: AI_MODELS.BATTLE_CHOICE,
    messages: [
      {
        role: "system",
        content:
          "You are a Pokémon battle agent. Choose exactly ONE legal action from the list. Do not invent actions.",
      },
      {
        role: "user",
        content: `Legal actions: ${input.legal_actions.join(", ")}

State: ${input.active_pokemon} at ${input.state_summary.hp}, opponent ${input.state_summary.opponent_active}${
          input.state_summary.hazards.length > 0 ? `, Hazards: ${input.state_summary.hazards.join(", ")}` : ""
        }`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "battle_choice",
        schema: {
          type: "object",
          properties: {
            choice: { type: "string" },
            reasoning_short: { type: "string" },
          },
          required: ["choice"],
        },
        strict: true,
      },
    },
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error("No response from AI")

  return JSON.parse(content) as BattleChoice
}

// Weekly recap generator
export async function generateWeeklyRecap(weekData: {
  week: number
  results: any[]
  standings_delta: any[]
  streaks: any[]
  top_performers: any[]
}): Promise<string> {
  const openaiClient = getOpenAIClient()

  const response = await openaiClient.chat.completions.create({
    model: AI_MODELS.WEEKLY_RECAP,
    messages: [
      {
        role: "system",
        content:
          "You are the league commissioner. Write a compelling weekly recap that highlights big matchups, standings movement, streaks, MVP race, and upcoming week storylines. Be energetic and engaging. Do not invent results.",
      },
      {
        role: "user",
        content: `Generate a weekly recap for Week ${weekData.week}.

Data: ${JSON.stringify(weekData, null, 2)}`,
      },
    ],
  })

  return response.choices[0].message.content || "No recap generated"
}

// Match result parser (from Discord text)
export async function parseMatchResult(text: string): Promise<{
  week: number
  team_a: string
  team_b: string
  winner: string
  differential: number
  proof_url: string | null
  needs_review: boolean
  notes: string
}> {
  const openaiClient = getOpenAIClient()

  const response = await openaiClient.chat.completions.create({
    model: AI_MODELS.RESULT_PARSER,
    messages: [
      {
        role: "system",
        content:
          "Extract match results. If any required field is missing or ambiguous, set needs_review=true and explain in notes.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "match_result",
        schema: {
          type: "object",
          properties: {
            week: { type: "integer" },
            team_a: { type: "string" },
            team_b: { type: "string" },
            winner: { type: "string" },
            differential: { type: "integer" },
            proof_url: { type: "string", nullable: true },
            needs_review: { type: "boolean" },
            notes: { type: "string" },
          },
          required: ["week", "team_a", "team_b", "winner", "differential", "needs_review", "notes"],
        },
        strict: true,
      },
    },
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error("Failed to parse result")

  return JSON.parse(content)
}
