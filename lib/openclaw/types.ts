export type OpenClawAgentMode =
  | "general"
  | "draft"
  | "battle-strategy"
  | "free-agency"
  | "pokedex"
  | "coach"
  | "parse-result"
  | "weekly-recap"
  | "draft-board-analysis"
  | "sql"
  | "pokedex-v2"

export type GatewayFrame =
  | { type: "req"; id: string; method: string; params?: unknown }
  | { type: "res"; id: string; ok: boolean; payload?: unknown; error?: unknown }
  | { type: "event"; event: string; payload?: unknown; seq?: number }

export type OpenClawChatOptions = {
  mode: OpenClawAgentMode
  userId?: string | null
  systemPrompt?: string
  sessionKey?: string
  agentId?: string
}
