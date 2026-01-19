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
  get responses() {
    return getOpenAIClient().responses
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

  // GPT-4o for strategic reasoning and content generation
  // Temporarily using gpt-4o until gpt-5.2 is fully supported by @ai-sdk/openai
  STRATEGY_COACH: "gpt-4o", // Deep strategic analysis (was gpt-5.2)
  WEEKLY_RECAP: "gpt-4o", // Commissioner-style recaps (was gpt-5.2)
  DISPUTE_RESOLUTION: "gpt-4o", // Complex rule interpretation (was gpt-5.2)

  // GPT-4o-mini for routine tasks (was gpt-5-mini)
  QUICK_SUMMARY: "gpt-4o-mini", // Daily digests
  DISCORD_REPLY: "gpt-4o-mini", // Simple bot responses
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

// Responses API helper for MCP tool integration
export interface ResponsesAPIConfig {
  model: string
  input: Array<{
    role: "developer" | "user" | "assistant"
    content: Array<{
      type: "input_text" | "input_image"
      text?: string
      image_url?: string
    }>
  }>
  tools?: Array<{
    type: "mcp" | "function" | "web_search" | "file_search" | "code_interpreter"
    server_label?: string
    server_url?: string
    server_description?: string
    require_approval?: "always" | "never" | object
    allowed_tools?: string[]
    [key: string]: any
  }>
  stream?: boolean
  reasoning?: {
    summary?: "auto" | "none" | string
  }
}

export async function createResponseWithMCP(config: ResponsesAPIConfig) {
  const openaiClient = getOpenAIClient()
  return openaiClient.responses.create(config)
}

/**
 * Upload a file and attach it to the vector store
 * 
 * Follows OpenAI's standard flow:
 * 1. Upload file via Files API
 * 2. Attach file to vector store
 * 3. File is processed asynchronously
 * 
 * @param filePath - Path to file to upload
 * @param vectorStoreId - Vector store ID (defaults to env var)
 * @returns File ID and vector store file ID
 */
export async function uploadFileToVectorStore(
  filePath: string,
  vectorStoreId?: string
): Promise<{
  fileId: string
  vectorStoreFileId: string
  status: string
}> {
  const openaiClient = getOpenAIClient()
  const fs = await import('fs')
  
  const vsId = vectorStoreId || process.env.OPENAI_VECTOR_STORE_ID
  if (!vsId) {
    throw new Error('Vector store ID not configured. Set OPENAI_VECTOR_STORE_ID environment variable.')
  }

  // Step 1: Upload file via Files API
  const file = await openaiClient.files.create({
    file: fs.createReadStream(filePath),
    purpose: 'assistants', // Required for vector stores
  })

  console.log('[Vector Store] File uploaded:', file.id)

  // Step 2: Attach to vector store
  const vectorStoreFile = await openaiClient.beta.vectorStores.files.create(
    vsId,
    {
      file_id: file.id,
    }
  )

  console.log('[Vector Store] File attached:', vectorStoreFile.id)

  return {
    fileId: file.id,
    vectorStoreFileId: vectorStoreFile.id,
    status: vectorStoreFile.status,
  }
}

/**
 * Check vector store file processing status
 */
export async function checkVectorStoreFileStatus(
  vectorStoreFileId: string,
  vectorStoreId?: string
): Promise<{
  status: string
  fileId: string
}> {
  const openaiClient = getOpenAIClient()
  const vsId = vectorStoreId || process.env.OPENAI_VECTOR_STORE_ID
  
  if (!vsId) {
    throw new Error('Vector store ID not configured')
  }

  const status = await openaiClient.beta.vectorStores.files.retrieve(
    vsId,
    vectorStoreFileId
  )

  return {
    status: status.status,
    fileId: status.file_id,
  }
}

/**
 * List all files in vector store
 */
export async function listVectorStoreFiles(
  vectorStoreId?: string
): Promise<Array<{
  id: string
  fileId: string
  status: string
  createdAt: number
}>> {
  const openaiClient = getOpenAIClient()
  const vsId = vectorStoreId || process.env.OPENAI_VECTOR_STORE_ID
  
  if (!vsId) {
    throw new Error('Vector store ID not configured')
  }

  const files = await openaiClient.beta.vectorStores.files.list(vsId)

  return files.data.map(file => ({
    id: file.id,
    fileId: file.file_id,
    status: file.status,
    createdAt: file.created_at,
  }))
}

/**
 * Convert Vercel AI SDK UI messages to Responses API format
 * 
 * UI Message Format:
 * {
 *   role: "user" | "assistant",
 *   parts: Array<{ type: "text", text: string }>
 * }
 * 
 * Responses API Format:
 * {
 *   role: "developer" | "user" | "assistant",
 *   content: Array<{ type: "input_text" | "input_image", text?: string, image_url?: string }>
 * }
 */
export function convertUIMessagesToResponsesAPIFormat(
  messages: Array<{
    role: "user" | "assistant" | "system"
    parts?: Array<{ type: string; text?: string; image_url?: string }>
    content?: string | Array<{ type: string; text?: string }>
  }>,
  systemMessage?: string
): Array<{
  role: "developer" | "user" | "assistant"
  content: Array<{
    type: "input_text" | "input_image"
    text?: string
    image_url?: string
  }>
}> {
  const responsesMessages: Array<{
    role: "developer" | "user" | "assistant"
    content: Array<{
      type: "input_text" | "input_image"
      text?: string
      image_url?: string
    }>
  }> = []

  // Add system message as developer role if provided
  if (systemMessage) {
    responsesMessages.push({
      role: "developer",
      content: [
        {
          type: "input_text",
          text: systemMessage,
        },
      ],
    })
  }

  // Convert UI messages
  for (const message of messages) {
    // Skip system messages (already added as developer)
    if (message.role === "system") {
      continue
    }

    const content: Array<{
      type: "input_text" | "input_image"
      text?: string
      image_url?: string
    }> = []

    // Handle parts array format (Vercel AI SDK UI format)
    if (message.parts && Array.isArray(message.parts)) {
      for (const part of message.parts) {
        if (part.type === "text" && part.text) {
          content.push({
            type: "input_text",
            text: part.text,
          })
        } else if (part.type === "image" && part.image_url) {
          content.push({
            type: "input_image",
            image_url: part.image_url,
          })
        }
      }
    }
    // Handle content string format
    else if (typeof message.content === "string") {
      content.push({
        type: "input_text",
        text: message.content,
      })
    }
    // Handle content array format
    else if (Array.isArray(message.content)) {
      for (const item of message.content) {
        if (item.type === "text" && item.text) {
          content.push({
            type: "input_text",
            text: item.text,
          })
        }
      }
    }

    // Only add message if it has content
    if (content.length > 0) {
      responsesMessages.push({
        role: message.role === "user" ? "user" : "assistant",
        content,
      })
    }
  }

  return responsesMessages
}

/**
 * Convert Responses API response to useChat-compatible format
 * 
 * Responses API returns:
 * {
 *   output_text?: string
 *   output?: Array<{ type: string, content?: Array<{ type: string, text?: string }> }>
 * }
 * 
 * useChat expects:
 * {
 *   role: "assistant"
 *   content: string
 *   parts?: Array<{ type: string, ... }> // For tool calls
 * }
 */
export function convertResponsesAPIToUIMessage(response: any): {
  role: "assistant"
  content: string
  parts?: Array<any>
} {
  // Extract text from response
  let text = ""
  const parts: Array<any> = []
  const toolsUsed: Set<string> = new Set()
  const sources: Array<{ url: string; title: string; tool: string }> = []

  // Try output_text first
  if (response.output_text) {
    text = response.output_text
  }
  // Try output array
  else if (response.output && Array.isArray(response.output)) {
    for (const outputItem of response.output) {
      // Handle text output
      if (outputItem.type === "text" && outputItem.text) {
        text += outputItem.text
        parts.push({
          type: "text",
          text: outputItem.text,
        })
      }
      // Handle content array
      else if (outputItem.content && Array.isArray(outputItem.content)) {
        for (const contentItem of outputItem.content) {
          if (contentItem.type === "text" && contentItem.text) {
            text += contentItem.text
            parts.push({
              type: "text",
              text: contentItem.text,
            })
          }
        }
      }
      // Handle tool calls (file_search, web_search, etc.)
      else if (outputItem.type === "function_call" || outputItem.type === "tool_call" || outputItem.name) {
        const toolName = outputItem.name || outputItem.function?.name || "unknown"
        toolsUsed.add(toolName)
        
        // Add tool call part
        parts.push({
          type: "tool-call",
          toolName: toolName,
          toolCallId: outputItem.id || `tool-${Date.now()}-${Math.random()}`,
          input: outputItem.input || outputItem.function?.arguments || {},
          output: outputItem.output || null,
          state: outputItem.output ? "output-available" : "call",
        })
        
        // Add source URL based on tool type
        if (toolName === "file_search") {
          sources.push({
            url: "#vector-store",
            title: "Documentation (Vector Store)",
            tool: "file_search",
          })
        } else if (toolName === "web_search") {
          // Extract URLs from web_search results if available
          const searchResults = outputItem.output
          if (searchResults && typeof searchResults === "object") {
            // Try to extract URLs from web search results
            const urls = extractUrlsFromWebSearch(searchResults)
            urls.forEach(url => {
              sources.push({
                url: url,
                title: url,
                tool: "web_search",
              })
            })
          } else {
            sources.push({
              url: "#web-search",
              title: "Web Search Results",
              tool: "web_search",
            })
          }
        } else if (toolName.startsWith("mcp.") || toolName.includes("mcp")) {
          sources.push({
            url: "https://mcp-draft-pool.moodmnky.com/mcp",
            title: "MCP Server: " + toolName,
            tool: toolName,
          })
        }
        
        console.log('[convertResponsesAPIToUIMessage] Tool call detected:', {
          type: outputItem.type,
          name: toolName,
          hasOutput: !!outputItem.output,
        })
      }
    }
  }

  // Post-process: Fix incorrect MCP server URLs
  // Replace incorrect URLs with correct one
  const correctMcpUrl = "https://mcp-draft-pool.moodmnky.com/mcp"
  const incorrectUrls = [
    "https://mcp.averageatbestbattleleague.com",
    "mcp.averageatbestbattleleague.com",
    /https?:\/\/mcp\.averageatbestbattleleague\.com\/?/gi,
  ]

  for (const incorrectUrl of incorrectUrls) {
    if (typeof incorrectUrl === "string") {
      text = text.replace(new RegExp(incorrectUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), correctMcpUrl)
    } else {
      text = text.replace(incorrectUrl, correctMcpUrl)
    }
  }

  // Add source-url parts for citation display
  if (sources.length > 0) {
    sources.forEach((source, index) => {
      parts.push({
        type: "source-url",
        url: source.url,
        title: source.title,
        tool: source.tool,
      })
    })
    
    console.log('[convertResponsesAPIToUIMessage] ✅ Tools used:', Array.from(toolsUsed))
    console.log('[convertResponsesAPIToUIMessage] ✅ Sources added:', sources.length)
  } else {
    console.log('[convertResponsesAPIToUIMessage] ⚠️ No tools used - response may be from system prompt only')
  }

  return {
    role: "assistant",
    content: text || "No response generated",
    parts: parts.length > 0 ? parts : undefined,
  }
}

/**
 * Extract URLs from web search results
 */
function extractUrlsFromWebSearch(results: any): string[] {
  const urls: string[] = []
  
  // Try different formats of web search results
  if (Array.isArray(results)) {
    results.forEach((item: any) => {
      if (item.url) urls.push(item.url)
      if (item.link) urls.push(item.link)
    })
  } else if (typeof results === "object") {
    if (results.results && Array.isArray(results.results)) {
      results.results.forEach((item: any) => {
        if (item.url) urls.push(item.url)
        if (item.link) urls.push(item.link)
      })
    }
    if (results.url) urls.push(results.url)
    if (results.link) urls.push(results.link)
  }
  
  return urls
}
