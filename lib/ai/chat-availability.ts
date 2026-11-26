import { isOpenClawConfigured, prefersOpenClawChat } from "@/lib/openclaw/chat-route"
import { isOpenAIConfigured } from "@/lib/openai-client"

/**
 * League chat uses OpenClaw only when the gateway URL, agent id, and an auth
 * mode are all set (Cloudflare Access service token, or a legacy gateway token).
 * A missing OpenAI key does not disable that path. URL and agent id without
 * auth, or a requested OpenClaw path that is incomplete, stays unavailable:
 * no default host, and no silent OpenAI fallback.
 */
export function isLeagueChatAvailable(): boolean {
  if (isOpenClawConfigured()) return true
  if (prefersOpenClawChat()) return false
  return isOpenAIConfigured()
}
