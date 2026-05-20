import { randomUUID } from "crypto"
import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import { getOpenClawConfig, buildSessionKey } from "./config"
import { OpenClawGatewayClient } from "./gateway-client"
import { extractAssistantDelta, isTerminalChatEvent } from "./events"
import { extractLatestUserText } from "./messages"
import type { OpenClawAgentMode, OpenClawChatOptions } from "./types"

export function isOpenClawConfigured(): boolean {
  const config = getOpenClawConfig()
  return config.enabled && Boolean(config.gatewayToken)
}

export function openClawConfigError(): string {
  if (!process.env.OPENCLAW_GATEWAY_URL?.trim()) {
    return "OPENCLAW_GATEWAY_URL is not set"
  }
  if (!process.env.OPENCLAW_GATEWAY_TOKEN?.trim()) {
    return "OPENCLAW_GATEWAY_TOKEN is not set (use gateway.auth.token, not hooks.token)"
  }
  return "OpenClaw gateway is not configured"
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

  if (!config.gatewayToken) {
    return new Response(openClawConfigError(), { status: 503 })
  }

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

  const userText = extractLatestUserText(body.messages)
  if (!userText) {
    return new Response("Message text is required", { status: 400 })
  }

  const sessionKey =
    options.sessionKey ??
    buildSessionKey(options.mode, options.userId ?? null)
  const agentId = options.agentId ?? config.agentId

  const promptParts: string[] = []
  if (options.systemPrompt?.trim()) {
    promptParts.push(options.systemPrompt.trim())
    promptParts.push("")
  }
  promptParts.push(userText)
  const outboundMessage = promptParts.join("\n")

  const textId = randomUUID()

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const client = new OpenClawGatewayClient(config)
      try {
        await client.connect()

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
