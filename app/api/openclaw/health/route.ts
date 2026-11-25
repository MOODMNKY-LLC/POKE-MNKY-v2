import { NextResponse } from "next/server"
import { AI_CHAT_UNAVAILABLE_MESSAGE } from "@/lib/ai/league-chat-dock"
import { getOpenClawConfig } from "@/lib/openclaw/config"
import { OpenClawGatewayClient } from "@/lib/openclaw/gateway-client"

export const runtime = "nodejs"

/**
 * GET /api/openclaw/health — debug gateway connectivity (admin-friendly).
 */
export async function GET() {
  const config = getOpenClawConfig()
  const identity = {
    authMode: config.authMode,
    enabled: config.enabled,
    gatewayUrl: config.gatewayUrl,
    agentId: config.agentId,
  }

  if (!config.enabled) {
    return NextResponse.json(
      {
        ok: false,
        error: "unavailable",
        message: AI_CHAT_UNAVAILABLE_MESSAGE,
        ...identity,
      },
      { status: 503 }
    )
  }

  // The Access worker 404s GET and /v1/models, and this path must not call the model.
  if (config.authMode === "cf-access") {
    return NextResponse.json({
      ok: true,
      configured: true,
      ...identity,
    })
  }

  const client = new OpenClawGatewayClient(config)
  try {
    await client.connect(15_000)
    const payload = await client.request("health", undefined, 10_000)
    client.close()
    return NextResponse.json({
      ok: true,
      ...identity,
      clientId: config.clientId,
      clientMode: config.clientMode,
      grantedScopes: client.getScopes(),
      canChatSend: client.getScopes().includes("operator.write"),
      health: payload,
    })
  } catch (error) {
    client.close()
    return NextResponse.json(
      {
        ok: false,
        ...identity,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}
