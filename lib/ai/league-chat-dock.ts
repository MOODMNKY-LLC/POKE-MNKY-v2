export const AI_CHAT_UNAVAILABLE_MESSAGE = "AI chat is unavailable right now"

const OPENAI_NOT_CONFIGURED_MESSAGE =
  "This AI assistant is currently unavailable (OpenAI is not configured)."

const RATE_LIMIT_FALLBACK = "You've reached the league chat limit. Please try again later."

function jsonStringField(raw: string, field: string): string | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const value = parsed[field]
    return typeof value === "string" && value.trim() ? value : null
  } catch {
    const match = raw.match(new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`))
    return match?.[1] ?? null
  }
}

/** Friendly composer copy for rate limits and a down gateway. Knowledge stays available separately. */
export function formatLeagueChatComposerError(raw: string | undefined): string {
  const text = raw?.trim() ?? ""
  if (!text) return "Failed to get response"
  if (/"code"\s*:\s*"rate_limited"/.test(text) || text.includes("rate_limited")) {
    return jsonStringField(text, "message") ?? RATE_LIMIT_FALLBACK
  }
  if (/"code"\s*:\s*"chat_unavailable"/.test(text)) return AI_CHAT_UNAVAILABLE_MESSAGE
  if (/"error"\s*:\s*"unavailable"/.test(text) || /not configured/i.test(text)) {
    return OPENAI_NOT_CONFIGURED_MESSAGE
  }
  if (
    text === "AI chat is temporarily unavailable" ||
    text.startsWith("That message is too long") ||
    text.startsWith("AI chat is busy") ||
    text.startsWith("AI chat timed out")
  ) {
    return text
  }
  return `Error: ${text}`
}

export type LeagueChatDockMode = "chat" | "knowledge" | "unavailable"

/**
 * Ask POKE MNKY dock when generative chat cannot run.
 * Sources-only league knowledge stays usable; otherwise the dock says chat is down.
 */
export function leagueChatDockMode(input: {
  leagueChatAvailable: boolean
  knowledgeEnabled: boolean
}): LeagueChatDockMode {
  if (input.leagueChatAvailable) return "chat"
  if (input.knowledgeEnabled) return "knowledge"
  return "unavailable"
}
