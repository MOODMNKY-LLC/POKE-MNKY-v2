export type OpenClawAuthMode = "cf-access" | "token" | "none"

export type OpenClawConfig = {
  gatewayUrl: string
  gatewayToken?: string
  cfAccessClientId?: string
  cfAccessClientSecret?: string
  authMode: OpenClawAuthMode
  agentId: string
  clientId: string
  clientMode: string
  insecureSkipTlsVerify: boolean
  enabled: boolean
}

function trimmed(name: string): string {
  return process.env[name]?.trim() || ""
}

function resolveAuthMode(cfAccessClientId: string, cfAccessClientSecret: string, gatewayToken: string): OpenClawAuthMode {
  if (cfAccessClientId && cfAccessClientSecret) return "cf-access"
  if (gatewayToken) return "token"
  return "none"
}

export function getOpenClawConfig(): OpenClawConfig {
  // No default host or agent. An unset value disables OpenClaw.
  const gatewayUrl = trimmed("OPENCLAW_GATEWAY_URL")
  const gatewayToken = trimmed("OPENCLAW_GATEWAY_TOKEN")
  const cfAccessClientId = trimmed("OPENCLAW_CF_ACCESS_CLIENT_ID")
  const cfAccessClientSecret = trimmed("OPENCLAW_CF_ACCESS_CLIENT_SECRET")
  const agentId = trimmed("OPENCLAW_AGENT_ID")
  // cli + cli: operator.write for chat.send. (backend = health/read only; webchat-ui may hit origin ACL.)
  const clientId = trimmed("OPENCLAW_CLIENT_ID") || "cli"
  const clientMode = trimmed("OPENCLAW_CLIENT_MODE") || "cli"
  const authMode = resolveAuthMode(cfAccessClientId, cfAccessClientSecret, gatewayToken)
  const allowedAgentId = trimmed("OPENCLAW_ALLOWED_AGENT_ID")
  const agentAllowed = authMode !== "cf-access" || !allowedAgentId || agentId === allowedAgentId

  return {
    gatewayUrl,
    gatewayToken: gatewayToken || undefined,
    cfAccessClientId: cfAccessClientId || undefined,
    cfAccessClientSecret: cfAccessClientSecret || undefined,
    authMode,
    agentId,
    clientId,
    clientMode,
    insecureSkipTlsVerify: process.env.OPENCLAW_GATEWAY_INSECURE_SKIP_TLS_VERIFY === "true",
    enabled: Boolean(gatewayUrl && agentId && authMode !== "none" && agentAllowed),
  }
}

/** Origin for POST /v1/chat/completions. Accepts https:// and legacy ws(s)://. */
export function toOpenClawHttpBaseUrl(gatewayUrl: string): string {
  return gatewayUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:").replace(/\/$/, "")
}

export function openClawMaxTokens(): number {
  const raw = Number(process.env.OPENCLAW_MAX_TOKENS)
  if (!Number.isFinite(raw)) return 800
  return Math.min(800, Math.max(1, Math.floor(raw)))
}

export function openClawTimeoutMs(): number {
  const raw = Number(process.env.OPENCLAW_TIMEOUT_MS)
  if (!Number.isFinite(raw) || raw <= 0) return 60_000
  return Math.floor(raw)
}

export function buildSessionKey(
  mode: string,
  userId?: string | null,
  agentId = process.env.OPENCLAW_AGENT_ID?.trim() || ""
): string {
  const uid = userId ?? "anonymous"
  return `agent:${agentId}:web:${uid}:${mode}`
}
