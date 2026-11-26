import { createHash, randomUUID } from "crypto"
import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import { getOpenClawConfig, openClawMaxTokens, openClawTimeoutMs, toOpenClawHttpBaseUrl, type OpenClawConfig } from "./config"
import { openclawUnavailableResponse } from "./unavailable"
import type { LeagueChatMessage } from "@/lib/ai/chat-input"

const UPSTREAM_UNAVAILABLE = "AI chat is temporarily unavailable"
const UPSTREAM_BUSY = "AI chat is busy right now. Please try again in a moment."
const UPSTREAM_POLICY = "That message is too long or includes too many messages. Shorten it and try again."
const UPSTREAM_TIMEOUT = "AI chat timed out. Please try again."

type OpenAIChatChunk = {
  choices?: Array<{
    delta?: { content?: string }
    message?: { content?: string }
  }>
  error?: { message?: string; code?: string }
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export function isOpenClawHttpChatEnabled(): boolean {
  const config = getOpenClawConfig()
  if (!config.enabled) return false
  // Cloudflare Access only exposes POST /v1/chat/completions. Do not fall through to WebSocket.
  if (config.authMode === "cf-access") return true
  if (process.env.OPENCLAW_HTTP_CHAT === "false") return false
  return config.authMode === "token"
}

/** Stable non-PII label for the gateway `user` field. Never an email or raw id. */
export function openClawUserLabel(userId: string, mode: string): string {
  return createHash("sha256").update(`league-chat:${userId}:${mode}`).digest("hex").slice(0, 32)
}

export function openClawChatHeaders(config: OpenClawConfig, sessionKey: string): Headers {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  headers.set("Accept", "text/event-stream")
  headers.set("x-openclaw-session-key", sessionKey)
  switch (config.authMode) {
    case "cf-access":
      headers.set("CF-Access-Client-Id", config.cfAccessClientId ?? "")
      headers.set("CF-Access-Client-Secret", config.cfAccessClientSecret ?? "")
      break
    case "token":
      if (config.gatewayToken) headers.set("Authorization", `Bearer ${config.gatewayToken}`)
      break
    case "none":
      break
    default: {
      const unexpected: never = config.authMode
      throw new Error(`Unexpected OpenClaw auth mode: ${String(unexpected)}`)
    }
  }
  return headers
}

export function openClawChatBody(input: {
  agentId: string
  messages: LeagueChatMessage[]
  userId: string
  mode: string
  maxTokens?: number
}): Record<string, unknown> {
  const maxTokens = input.maxTokens ?? openClawMaxTokens()
  return {
    model: `openclaw/${input.agentId}`,
    messages: input.messages,
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: maxTokens,
    max_completion_tokens: maxTokens,
    user: openClawUserLabel(input.userId, input.mode),
  }
}

export function openClawUpstreamErrorMessage(status: number, code: string | undefined): string {
  if ((status === 400 || status === 413) && code === "aab_gateway_policy") return UPSTREAM_POLICY
  if (status === 429) return UPSTREAM_BUSY
  return UPSTREAM_UNAVAILABLE
}

export type OpenClawUpstreamFailure = {
  status: number | "timeout" | "error"
  code: string
  replyStarted: boolean
}

const SAFE_FAILURE_CODE = /^[A-Za-z0-9_.:-]{1,64}$/
const SECRET_LIKE_CODE = /secret|token|bearer|sk-|cf-access|authorization|api[_-]?key/i

/**
 * Keep an upstream code only when it is a short category.
 * Prompts, tokens, and Access credentials fall back to `category`.
 */
export function openClawFailureCode(
  code: string | undefined,
  category: string,
  messages?: LeagueChatMessage[],
): string {
  const fallback = SAFE_FAILURE_CODE.test(category) ? category : "upstream_error"
  if (!code || !SAFE_FAILURE_CODE.test(code) || SECRET_LIKE_CODE.test(code)) return fallback
  if (messages?.some((message) => messageRepeatsCode(message.content, code))) return fallback
  return code
}

function messageRepeatsCode(content: string, code: string): boolean {
  const text = content.trim()
  if (!text) return false
  if (text === code) return true
  return text.length >= 12 && code.includes(text)
}

function logUpstreamFailure(fields: {
  status: number | "timeout" | "error"
  code: string
  userId: string
  mode: string
}): void {
  console.error(JSON.stringify({
    event: "openclaw_upstream_failure",
    status: fields.status,
    code: fields.code,
    userId: fields.userId,
    mode: fields.mode,
  }))
}

function audit(fields: Record<string, string | number | undefined>): void {
  const payload: Record<string, string | number> = { event: "openclaw_chat" }
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" || typeof value === "number") payload[key] = value
  }
  console.info(JSON.stringify(payload))
}

async function upstreamCode(response: Response): Promise<string | undefined> {
  const raw = await response.text().catch(() => "")
  try {
    const parsed = JSON.parse(raw.slice(0, 2_000)) as { code?: unknown }
    if (typeof parsed.code === "string") return parsed.code.slice(0, 80)
  } catch {
    return undefined
  }
  return undefined
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

/**
 * Stream via the OpenClaw OpenAI-compatible HTTP API.
 * Cloudflare Access uses service-token headers and never sends Authorization.
 */
export function handleOpenClawHttpChatRequest(options: {
  messages: LeagueChatMessage[]
  sessionKey: string
  agentId: string
  userId: string
  mode: string
  onUpstreamFailure?: (failure: OpenClawUpstreamFailure) => void | Promise<void>
}): Response {
  const config = getOpenClawConfig()
  if (!config.enabled || config.authMode === "none") {
    return openclawUnavailableResponse()
  }

  const textId = randomUUID()
  const url = `${toOpenClawHttpBaseUrl(config.gatewayUrl)}/v1/chat/completions`
  const maxTokens = openClawMaxTokens()
  const timeoutMs = openClawTimeoutMs()
  const headers = openClawChatHeaders(config, options.sessionKey)
  const body = openClawChatBody({
    agentId: options.agentId,
    messages: options.messages,
    userId: options.userId,
    mode: options.mode,
    maxTokens,
  })

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const started = Date.now()
      let status: number | "timeout" | "error" = "error"
      let code: string | undefined
      let replyStarted = false
      let promptTokens: number | undefined
      let completionTokens: number | undefined
      let totalTokens: number | undefined

      const reportFailure = async (
        failureStatus: number | "timeout" | "error",
        failureCode: string,
        errorText: string,
      ) => {
        status = failureStatus
        code = failureCode
        logUpstreamFailure({
          status: failureStatus,
          code: failureCode,
          userId: options.userId,
          mode: options.mode,
        })
        if (options.onUpstreamFailure) {
          try {
            await options.onUpstreamFailure({
              status: failureStatus,
              code: failureCode,
              replyStarted,
            })
          } catch {
            // The caller logs refund problems. The coach still gets errorText.
          }
        }
        writer.write({ type: "error", errorText })
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        status = response.status

        if (!response.ok) {
          const rawCode = await upstreamCode(response)
          await reportFailure(
            response.status,
            openClawFailureCode(rawCode, "http_error", options.messages),
            openClawUpstreamErrorMessage(response.status, rawCode),
          )
          return
        }

        if (!response.body) {
          await reportFailure(response.status, "empty_body", UPSTREAM_UNAVAILABLE)
          return
        }

        writer.write({ type: "text-start", id: textId })
        const reader = response.body.getReader()
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

            if (chunk.usage) {
              if (typeof chunk.usage.prompt_tokens === "number") promptTokens = chunk.usage.prompt_tokens
              if (typeof chunk.usage.completion_tokens === "number") completionTokens = chunk.usage.completion_tokens
              if (typeof chunk.usage.total_tokens === "number") totalTokens = chunk.usage.total_tokens
            }

            if (chunk.error) {
              const rawCode = typeof chunk.error.code === "string" ? chunk.error.code.slice(0, 80) : undefined
              await reportFailure(
                response.status,
                openClawFailureCode(rawCode, "stream_error", options.messages),
                UPSTREAM_UNAVAILABLE,
              )
              return
            }

            const delta = chunk.choices?.[0]?.delta?.content
            if (typeof delta === "string" && delta.length > 0) {
              replyStarted = true
              writer.write({ type: "text-delta", id: textId, delta })
            }
          }
        }

        writer.write({ type: "text-end", id: textId })
      } catch (error) {
        if (isAbortError(error)) {
          await reportFailure("timeout", "timeout", UPSTREAM_TIMEOUT)
          return
        }
        await reportFailure("error", "network", UPSTREAM_UNAVAILABLE)
      } finally {
        clearTimeout(timer)
        audit({
          userId: options.userId,
          mode: options.mode,
          latencyMs: Date.now() - started,
          status: typeof status === "number" ? status : status,
          code,
          promptTokens,
          completionTokens,
          totalTokens,
        })
      }
    },
  })

  return createUIMessageStreamResponse({ stream })
}
