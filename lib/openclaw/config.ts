export type OpenClawConfig = {
  gatewayUrl: string
  gatewayToken?: string
  agentId: string
  insecureSkipTlsVerify: boolean
  enabled: boolean
}

export function getOpenClawConfig(): OpenClawConfig {
  const gatewayUrl =
    process.env.OPENCLAW_GATEWAY_URL?.trim() ||
    "wss://aab-openclaw.moodmnky.com"

  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN?.trim()
  const agentId = process.env.OPENCLAW_AGENT_ID?.trim() || "poke-mnky"

  return {
    gatewayUrl,
    gatewayToken,
    agentId,
    insecureSkipTlsVerify:
      process.env.OPENCLAW_GATEWAY_INSECURE_SKIP_TLS_VERIFY === "true",
    enabled: Boolean(gatewayUrl),
  }
}

export function buildSessionKey(
  mode: string,
  userId?: string | null
): string {
  const uid = userId ?? "anonymous"
  return `poke-mnky:web:${uid}:${mode}`
}
