export const AI_CHAT_UNAVAILABLE_MESSAGE = "AI chat is unavailable right now"

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
