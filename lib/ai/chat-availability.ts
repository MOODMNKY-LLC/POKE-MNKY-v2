import { shouldRouteChatToOpenClaw } from "@/lib/openclaw/chat-route"
import { isOpenAIConfigured } from "@/lib/openai-client"

/**
 * League chat (Ask POKE MNKY and the mode chats) uses OpenClaw when that
 * gateway is configured, and OpenAI only as a fallback. Removing
 * OPENAI_API_KEY must not take the OpenClaw path down.
 */
export function isLeagueChatAvailable(): boolean {
  return shouldRouteChatToOpenClaw() || isOpenAIConfigured()
}
