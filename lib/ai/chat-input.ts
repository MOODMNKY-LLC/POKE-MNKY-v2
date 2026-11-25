export type LeagueChatRole = "system" | "user" | "assistant"

export type LeagueChatMessage = {
  role: LeagueChatRole
  content: string
}

export type PrepareLeagueChatResult =
  | { ok: true; messages: LeagueChatMessage[] }
  | { ok: false; status: 400 | 413; code: string; message: string }

const DEFAULT_MAX_MESSAGE_CHARS = 2_000
const DEFAULT_MAX_HISTORY = 10
const DEFAULT_MAX_BODY_BYTES = 48_000
const MAX_HISTORY_MESSAGE_CHARS = 4_000
const MAX_SYSTEM_CHARS = 8_000

function positiveInt(name: string, fallback: number): number {
  const raw = Number(process.env[name])
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return Math.floor(raw)
}

export function aiChatMaxMessageChars(): number {
  return positiveInt("AI_CHAT_MAX_MESSAGE_CHARS", DEFAULT_MAX_MESSAGE_CHARS)
}

export function aiChatMaxHistory(): number {
  return positiveInt("AI_CHAT_MAX_HISTORY", DEFAULT_MAX_HISTORY)
}

export function aiChatMaxBodyBytes(): number {
  return positiveInt("AI_CHAT_MAX_BODY_BYTES", DEFAULT_MAX_BODY_BYTES)
}

function textFromUnknownMessage(message: unknown): { role: LeagueChatRole; content: string } | null {
  if (!message || typeof message !== "object") return null
  const record = message as Record<string, unknown>
  const role = record.role
  if (role !== "user" && role !== "assistant" && role !== "system") return null

  let text = ""
  if (Array.isArray(record.parts)) {
    text = record.parts
      .filter((part) => (part as { type?: string }).type === "text")
      .map((part) => String((part as { text?: string }).text ?? ""))
      .join("")
  } else if (typeof record.content === "string") {
    text = record.content
  } else if (Array.isArray(record.content)) {
    text = record.content
      .filter((part) => (part as { type?: string }).type === "text")
      .map((part) => String((part as { text?: string }).text ?? ""))
      .join("")
  }

  const content = text.trim()
  if (!content) return null
  return { role, content }
}

function tooLong(maxMessageChars: number): PrepareLeagueChatResult {
  return {
    ok: false,
    status: 413,
    code: "message_too_long",
    message: `That message is too long. Please shorten it to ${maxMessageChars} characters or less.`,
  }
}

/**
 * Keep the server system prompt and the last N user/assistant turns.
 * Reject an over-long latest user message before any gateway call.
 */
export function prepareLeagueChatMessages(input: {
  raw: unknown
  systemPrompt?: string
  maxMessageChars?: number
  maxHistory?: number
  maxBodyBytes?: number
}): PrepareLeagueChatResult {
  const maxMessageChars = input.maxMessageChars ?? aiChatMaxMessageChars()
  const maxHistory = input.maxHistory ?? aiChatMaxHistory()
  const maxBodyBytes = input.maxBodyBytes ?? aiChatMaxBodyBytes()

  const conversation: LeagueChatMessage[] = []
  if (Array.isArray(input.raw)) {
    for (const message of input.raw) {
      const parsed = textFromUnknownMessage(message)
      if (!parsed || parsed.role === "system") continue
      conversation.push(parsed)
    }
  }

  const latestUser = [...conversation].reverse().find((message) => message.role === "user")
  if (!latestUser) {
    return {
      ok: false,
      status: 400,
      code: "message_required",
      message: "Message text is required",
    }
  }
  if (latestUser.content.length > maxMessageChars) return tooLong(maxMessageChars)

  const history = conversation.slice(-maxHistory).map((message) => ({
    role: message.role,
    content: message.content.slice(0, MAX_HISTORY_MESSAGE_CHARS),
  }))

  const messages: LeagueChatMessage[] = []
  const system = input.systemPrompt?.trim()
  if (system) {
    messages.push({ role: "system", content: system.slice(0, MAX_SYSTEM_CHARS) })
  }
  messages.push(...history)

  while (Buffer.byteLength(JSON.stringify(messages), "utf8") > maxBodyBytes && messages.length > 2) {
    const systemOffset = messages[0]?.role === "system" ? 1 : 0
    if (messages.length - systemOffset <= 1) break
    messages.splice(systemOffset, 1)
  }

  if (Buffer.byteLength(JSON.stringify(messages), "utf8") > maxBodyBytes) {
    return {
      ok: false,
      status: 413,
      code: "message_too_long",
      message: "That message is too long or includes too many messages. Shorten it and try again.",
    }
  }

  return { ok: true, messages }
}
