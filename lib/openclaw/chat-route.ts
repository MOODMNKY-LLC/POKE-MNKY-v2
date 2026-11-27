import { randomUUID } from "crypto"
import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import { getOpenClawConfig, buildSessionKey } from "./config"
import { openclawUnavailableResponse } from "./unavailable"
import { OpenClawGatewayClient } from "./gateway-client"
import { extractAssistantDelta, isTerminalChatEvent } from "./events"
import { extractLatestUserText } from "./messages"
import { handleOpenClawHttpChatRequest, isOpenClawHttpChatEnabled, type OpenClawUpstreamFailure } from "./http-chat"
import { prepareLeagueChatMessages } from "@/lib/ai/chat-input"
import { enforceAiChatRateLimit, refundAiChatQuota } from "@/lib/ai/rate-limit"
import type { OpenClawAgentMode, OpenClawChatOptions } from "./types"

export function isOpenClawConfigured(): boolean {
  return getOpenClawConfig().enabled
}

/** True when env suggests OpenClaw is intended (avoid silent OpenAI fallback with a stale key). */
export function prefersOpenClawChat(): boolean {
  const provider = process.env.AI_CHAT_PROVIDER?.trim().toLowerCase()
  if (provider === "openai" || provider === "sources-only" || provider === "off") {
    return false
  }
  if (provider === "openclaw") {
    // Intended, but only when a real gateway URL is configured (empty URL = fail closed).
    return Boolean(process.env.OPENCLAW_GATEWAY_URL?.trim())
  }
  // Agent id / CF Access secrets alone must not force OpenClaw while the
  // member gateway hostname (aab-chat-gw) is still unrepaired (503).
  return Boolean(
    process.env.OPENCLAW_GATEWAY_URL?.trim() &&
      (process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
        (process.env.OPENCLAW_CF_ACCESS_CLIENT_ID?.trim() &&
          process.env.OPENCLAW_CF_ACCESS_CLIENT_SECRET?.trim()))
  )
}

export function openClawConfigError(): string {
  if (!process.env.OPENCLAW_GATEWAY_URL?.trim()) {
    return (
      "OpenClaw chat is disabled: OPENCLAW_GATEWAY_URL is empty. " +
      "League knowledge remains available via sources-only routes when AAB_KNOWLEDGE_ENABLED is on. " +
      "Do not use unrepaired hosts (aab-openclaw / aab-chat-gw) until Coolify+CF Access are live."
    )
  }
  if (!process.env.OPENCLAW_AGENT_ID?.trim()) return "OPENCLAW_AGENT_ID is not set"
  const hasAccess = Boolean(
    process.env.OPENCLAW_CF_ACCESS_CLIENT_ID?.trim() &&
      process.env.OPENCLAW_CF_ACCESS_CLIENT_SECRET?.trim()
  )
  if (!hasAccess && !process.env.OPENCLAW_GATEWAY_TOKEN?.trim()) {
    return "OpenClaw auth is not set (Cloudflare Access service token or gateway token)"
  }
  return "OpenClaw gateway is not configured"
}

/** Use OpenClaw when fully configured, or fail fast when OpenClaw was clearly intended. */
export function shouldRouteChatToOpenClaw(): boolean {
  return isOpenClawConfigured() || prefersOpenClawChat()
}

function logCallerUpstreamFailure(input: {
  userId: string
  mode: string
  failure: OpenClawUpstreamFailure
}): void {
  console.error(JSON.stringify({
    event: "openclaw_chat_upstream_failure",
    status: input.failure.status,
    code: input.failure.code,
    userId: input.userId,
    mode: input.mode,
  }))
}

/**
 * Stream an assistant reply from the OpenClaw gateway in AI SDK UI message format.
 */
export async function handleOpenClawChatRequest(
  request: Request,
  options: OpenClawChatOptions,
  parsedBody?: Record<string, unknown>
): Promise<Response> {
  const config = getOpenClawConfig()

  // Fail closed before any gateway socket or HTTP call.
  if (!config.enabled) {
    return openclawUnavailableResponse()
  }

  if (!options.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = options.userId

  let body: Record<string, unknown>
  if (parsedBody) {
    body = parsedBody
  } else {
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return new Response("Invalid JSON body", { status: 400 })
    }
  }

  const prepared = prepareLeagueChatMessages({
    raw: body.messages,
    systemPrompt: options.systemPrompt,
  })
  if (!prepared.ok) {
    if (prepared.code === "message_required") {
      return new Response("Message text is required", { status: 400 })
    }
    return Response.json(
      { error: prepared.code, code: prepared.code, message: prepared.message },
      { status: prepared.status },
    )
  }

  // Reserve the slot before the gateway call so concurrent sends still hit the limit.
  // A later refund uses this same timestamp. Counting only after the first byte would
  // let parallel requests pass the check together.
  const countedAt = new Date()
  const limited = await enforceAiChatRateLimit({
    userId,
    mode: options.mode,
    now: countedAt,
  })
  if (limited) return limited

  const userText = extractLatestUserText(body.messages)
  const sessionKey =
    options.sessionKey ??
    buildSessionKey(options.mode, userId, config.agentId)
  const agentId = options.agentId ?? config.agentId

  const promptParts: string[] = []
  if (options.systemPrompt?.trim()) {
    promptParts.push(options.systemPrompt.trim())
    promptParts.push("")
  }
  promptParts.push(userText)
  const outboundMessage = promptParts.join("\n")

  // Cloudflare Access and the legacy gateway token both use HTTPS chat completions.
  // WebSocket remains only for an explicit token-mode opt-out.
  if (isOpenClawHttpChatEnabled()) {
    return handleOpenClawHttpChatRequest({
      messages: prepared.messages,
      sessionKey,
      agentId,
      userId,
      mode: options.mode,
      onUpstreamFailure: async (failure) => {
        logCallerUpstreamFailure({ userId, mode: options.mode, failure })
        if (failure.replyStarted) return
        await refundAiChatQuota({ userId, mode: options.mode, now: countedAt })
      },
    })
  }

  const textId = randomUUID()

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const client = new OpenClawGatewayClient(config)
      try {
        await client.connect()
        client.requireScope("operator.write")

        await client.request("chat.send", {
          sessionKey,
          agentId,
          message: outboundMessage,
        })

        writer.write({ type: "text-start", id: textId })

        for await (const frame of client.streamChatEvents()) {
          const delta = extractAssistantDelta(frame)
          if (delta) {
            writer.write({ type: "text-delta", id: textId, delta })
          }
          if (isTerminalChatEvent(frame)) {
            break
          }
        }

        writer.write({ type: "text-end", id: textId })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "OpenClaw gateway error"
        writer.write({ type: "error", errorText: message })
      } finally {
        client.close()
      }
    },
  })

  return createUIMessageStreamResponse({ stream })
}

export function openClawModeSystemPrompt(
  mode: OpenClawAgentMode,
  context?: Record<string, string | null | undefined>
): string {
  const lines: string[] = [
    "You are POKE MNKY, the Average at Best Battle League assistant.",
    `Surface mode: ${mode}.`,
  ]

  if (context?.teamId) lines.push(`Team ID: ${context.teamId}`)
  if (context?.seasonId) lines.push(`Season ID: ${context.seasonId}`)
  if (context?.matchId) lines.push(`Match ID: ${context.matchId}`)
  if (context?.team1Id) lines.push(`Team 1 ID: ${context.team1Id}`)
  if (context?.team2Id) lines.push(`Team 2 ID: ${context.team2Id}`)
  if (context?.selectedPokemon) lines.push(`Pokémon focus: ${context.selectedPokemon}`)

  switch (mode) {
    case "draft":
      lines.push(
        "Help with draft pool picks, budget, roster balance, and real-time draft strategy."
      )
      break
    case "battle-strategy":
      lines.push("Help with weekly matchups, battle plans, and Showdown strategy.")
      break
    case "free-agency":
      lines.push("Help with trades, free agency, and roster transactions.")
      break
    case "pokedex":
      lines.push("Answer Pokémon competitive questions and draft value.")
      break
    default:
      lines.push("Help coaches navigate the league app, Discord workflows, and season ops.")
  }

  return lines.join("\n")
}
