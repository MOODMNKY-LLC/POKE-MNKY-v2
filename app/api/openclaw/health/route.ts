import { NextResponse } from "next/server"
import { getOpenClawConfig } from "@/lib/openclaw/config"
import { OpenClawGatewayClient } from "@/lib/openclaw/gateway-client"
import { openClawConfigError } from "@/lib/openclaw/chat-route"

export const runtime = "nodejs"

/**
 * GET /api/openclaw/health — debug gateway connectivity (admin-friendly).
 */
export async function GET() {
  const config = getOpenClawConfig()

  if (!config.gatewayToken) {
    return NextResponse.json(
      {
        ok: false,
        error: openClawConfigError(),
        gatewayUrl: config.gatewayUrl,
        agentId: config.agentId,
      },
      { status: 503 }
    )
  }

  const client = new OpenClawGatewayClient(config)
  try {
    await client.connect(15_000)
    const payload = await client.request("health", undefined, 10_000)
    client.close()
    return NextResponse.json({
      ok: true,
      gatewayUrl: config.gatewayUrl,
      agentId: config.agentId,
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
        gatewayUrl: config.gatewayUrl,
        agentId: config.agentId,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}
