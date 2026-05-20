/**
 * Smoke-test OpenClaw gateway scopes for in-app chat.
 * Usage: pnpm exec tsx scripts/test-openclaw-chat-scope.ts
 */
import { config } from "dotenv"
config({ path: ".env.local" })

import { getOpenClawConfig } from "../lib/openclaw/config"
import { OpenClawGatewayClient } from "../lib/openclaw/gateway-client"

async function main() {
  const cfg = getOpenClawConfig()
  console.log("gateway:", cfg.gatewayUrl)
  console.log("client:", cfg.clientId, cfg.clientMode)
  console.log("agent:", cfg.agentId)

  const client = new OpenClawGatewayClient(cfg)
  try {
    await client.connect(20_000)
    const scopes = client.getScopes()
    // @ts-expect-error debug
    if (scopes.length === 0) console.log("hello payload debug: re-run with LOG_OPENCLAW_HELLO=1")
    console.log("grantedScopes:", scopes.join(", ") || "(none)")
    console.log("canChatSend:", scopes.includes("operator.write"))

    client.requireScope("operator.write")
    console.log("chat.send: requesting…")
    await client.request(
      "chat.send",
      {
        sessionKey: `agent:${cfg.agentId}:web:smoke-test:general`,
        agentId: cfg.agentId,
        message: "Reply with one word: pong",
      },
      30_000
    )
    console.log("chat.send: accepted (watch gateway for streamed reply)")
  } finally {
    client.close()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
