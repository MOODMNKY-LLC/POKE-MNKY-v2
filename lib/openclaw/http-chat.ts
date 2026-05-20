import { randomUUID } from "crypto"
import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import { getOpenClawConfig } from "./config"

function gatewayHttpBaseUrl(gatewayUrl: string): string {
  return gatewayUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:").replace(/\/$/, "")
}

export function isOpenClawHttpChatEnabled(): boolean {
  if (process.env.OPENCLAW_HTTP_CHAT === "false") return false
  return Boolean(getOpenClawConfig().gatewayToken)
}

type OpenAIChatChunk = {
  choices?: Array<{
    delta?: { content?: string }
    message?: { content?: string }
  }>
  error?: { message?: string }
}

/**
 * Stream via OpenClaw OpenAI-compatible HTTP API (full operator scopes with gateway token).
 * @see https://docs.openclaw.ai/gateway/openai-http-api
 */
export function handleOpenClawHttpChatRequest(options: {
  messages: unknown
  sessionKey: string
  agentId: string
  systemPrompt?: string
}): Response {
  const config = getOpenClawConfig()
  if (!config.gatewayToken) {
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "error", errorText: "OPENCLAW_GATEWAY_TOKEN is not set" })
      },
    })
    return createUIMessageStreamResponse({ stream, status: 503 })
  }

  const userMessages = extractOpenAiMessages(options.messages, options.systemPrompt)
  const textId = randomUUID()
  const base = gatewayHttpBaseUrl(config.gatewayUrl)
  const url = `${base}/v1/chat/completions`

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "text-start", id: textId })

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.gatewayToken}`,
          "Content-Type": "application/json",
          "x-openclaw-session-key": options.sessionKey,
        },
        body: JSON.stringify({
          model: `openclaw/${options.agentId}`,
          stream: true,
          messages: userMessages,
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => "")
        writer.write({
          type: "error",
          errorText: `OpenClaw HTTP ${res.status}: ${body.slice(0, 500)}`,
        })
        return
      }

      if (!res.body) {
        writer.write({ type: "error", errorText: "OpenClaw HTTP returned no body" })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data:")) continue
          const data = trimmed.slice(5).trim()
          if (data === "[DONE]") continue

          let chunk: OpenAIChatChunk
          try {
            chunk = JSON.parse(data) as OpenAIChatChunk
          } catch {
            continue
          }

          if (chunk.error?.message) {
            writer.write({ type: "error", errorText: chunk.error.message })
            return
          }

          const delta = chunk.choices?.[0]?.delta?.content
          if (typeof delta === "string" && delta.length > 0) {
            writer.write({ type: "text-delta", id: textId, delta })
          }
        }
      }

      writer.write({ type: "text-end", id: textId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function extractOpenAiMessages(
  raw: unknown,
  systemPrompt?: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const out: Array<{ role: "system" | "user" | "assistant"; content: string }> = []
  if (systemPrompt?.trim()) {
    out.push({ role: "system", content: systemPrompt.trim() })
  }

  if (!Array.isArray(raw)) return out

  for (const msg of raw) {
    const record = msg as Record<string, unknown>
    const role = record.role
    if (role !== "user" && role !== "assistant" && role !== "system") continue

    let text = ""
    const parts = record.parts
    if (Array.isArray(parts)) {
      text = parts
        .filter((p) => (p as { type?: string }).type === "text")
        .map((p) => String((p as { text?: string }).text ?? ""))
        .join("")
    } else if (typeof record.content === "string") {
      text = record.content
    }

    if (text.trim()) {
      out.push({ role, content: text.trim() })
    }
  }

  return out
}
