export type OpenClawConfig = {
  gatewayUrl: string
  gatewayToken?: string
  agentId: string
  clientId: string
  clientMode: string
  insecureSkipTlsVerify: boolean
  enabled: boolean
}

export function getOpenClawConfig(): OpenClawConfig {
  const gatewayUrl =
    process.env.OPENCLAW_GATEWAY_URL?.trim() ||
    "wss://aab-openclaw.moodmnky.com"

  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN?.trim()
  const agentId = process.env.OPENCLAW_AGENT_ID?.trim() || "poke-mnky"
  // cli + cli: operator.write for chat.send. (backend = health/read only; webchat-ui may hit origin ACL.)
  const clientId = process.env.OPENCLAW_CLIENT_ID?.trim() || "cli"
  const clientMode = process.env.OPENCLAW_CLIENT_MODE?.trim() || "cli"

  return {
    gatewayUrl,
    gatewayToken,
    agentId,
    clientId,
    clientMode,
    insecureSkipTlsVerify:
      process.env.OPENCLAW_GATEWAY_INSECURE_SKIP_TLS_VERIFY === "true",
    enabled: Boolean(gatewayUrl),
  }
}

export function buildSessionKey(
  mode: string,
  userId?: string | null,
  agentId = process.env.OPENCLAW_AGENT_ID?.trim() || "poke-mnky"
): string {
  const uid = userId ?? "anonymous"
  return `agent:${agentId}:web:${uid}:${mode}`
}
