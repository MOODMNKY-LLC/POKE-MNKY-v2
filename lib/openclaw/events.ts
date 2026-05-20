import type { GatewayFrame } from "./types"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

/** Extract streaming assistant text from Gateway event frames. */
export function extractAssistantDelta(frame: GatewayFrame): string | null {
  if (frame.type !== "event") return null

  const payload = asRecord(frame.payload)
  if (!payload) return null

  const eventName = frame.event

  if (eventName === "chat") {
    const deltaText = payload.deltaText
    if (typeof deltaText === "string" && deltaText.length > 0) {
      return deltaText
    }
  }

  if (eventName === "agent" || eventName === "session.message") {
    const stream = payload.stream
    if (stream === "assistant" || stream === "output") {
      const delta = payload.delta ?? payload.text ?? payload.deltaText
      if (typeof delta === "string" && delta.length > 0) {
        return delta
      }
    }
  }

  return null
}

export function isTerminalChatEvent(frame: GatewayFrame): boolean {
  if (frame.type !== "event") return false
  const payload = asRecord(frame.payload)
  if (!payload) return false
  if (frame.event !== "chat") return false
  const state = payload.state
  return state === "done" || state === "error" || state === "aborted"
}
