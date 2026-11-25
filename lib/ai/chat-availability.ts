import { isOpenClawConfigured, prefersOpenClawChat } from "@/lib/openclaw/chat-route"
import { isOpenAIConfigured } from "@/lib/openai-client"

/**
 * League chat uses OpenClaw only when the gateway URL, agent id, and token
 * are all set. A missing OpenAI key does not disable that path. If OpenClaw
 * was requested but URL or agent id is unset, chat is unavailable: no default
 * host, and no silent OpenAI fallback.
 */
export function isLeagueChatAvailable(): boolean {
  if (isOpenClawConfigured()) return true
  if (prefersOpenClawChat()) return false
  return isOpenAIConfigured()
}
