import { AI_CHAT_UNAVAILABLE_MESSAGE } from "@/lib/ai/league-chat-dock"

/** HTTP 503 for league chat when OpenClaw must not be called. */
export function openclawUnavailableResponse(): Response {
  return Response.json(
    { error: "unavailable", message: AI_CHAT_UNAVAILABLE_MESSAGE },
    { status: 503 },
  )
}
