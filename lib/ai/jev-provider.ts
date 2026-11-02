/**
 * Resolve a TypeSafe-compatible Jev client from env.
 * Preference: Vercel AI Gateway → OpenRouter → TypeSafe direct.
 */

import { TypeSafeClient } from "@typesafe-ai/sdk"

export type JevProviderId = "vercel-ai-gateway" | "openrouter" | "typesafe"

export type JevProviderConfig = {
  id: JevProviderId
  baseURL: string
  apiKey: string
  model: string
  label: string
}

const GATEWAY_BASE = "https://ai-gateway.vercel.sh/typesafe"
const OPENROUTER_BASE = "https://openrouter.ai/api"
const TYPESAFE_BASE = "https://api.typesafe.ai"

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Pick provider: Gateway creds first, then OpenRouter, then TypeSafe. */
export function resolveJevProvider(
  env: NodeJS.ProcessEnv = process.env,
): JevProviderConfig | null {
  const forced = nonEmpty(env.JEV_PROVIDER)?.toLowerCase()

  const gatewayKey =
    nonEmpty(env.AI_GATEWAY_API_KEY) || nonEmpty(env.VERCEL_OIDC_TOKEN)
  const openRouterKey = nonEmpty(env.OPENROUTER_API_KEY)
  const typesafeKey = nonEmpty(env.TYPESAFE_API_KEY) || nonEmpty(env.JEV_API_KEY)

  const gateway: JevProviderConfig = {
    id: "vercel-ai-gateway",
    baseURL: nonEmpty(env.JEV_BASE_URL) || GATEWAY_BASE,
    apiKey: gatewayKey || "",
    model: nonEmpty(env.JEV_MODEL) || "typesafe-ai/jev",
    label: "Vercel AI Gateway",
  }

  const openrouter: JevProviderConfig = {
    id: "openrouter",
    baseURL: nonEmpty(env.JEV_BASE_URL) || OPENROUTER_BASE,
    apiKey: openRouterKey || "",
    model: nonEmpty(env.JEV_MODEL) || "typesafe/jev-1.13",
    label: "OpenRouter",
  }

  const typesafe: JevProviderConfig = {
    id: "typesafe",
    baseURL: nonEmpty(env.JEV_BASE_URL) || TYPESAFE_BASE,
    apiKey: typesafeKey || "",
    model: nonEmpty(env.JEV_MODEL) || "jev-1.13.0",
    label: "TypeSafe direct",
  }

  if (forced === "vercel" || forced === "gateway" || forced === "vercel-ai-gateway") {
    return gatewayKey ? gateway : null
  }
  if (forced === "openrouter") {
    return openRouterKey ? openrouter : null
  }
  if (forced === "typesafe" || forced === "direct") {
    return typesafeKey ? typesafe : null
  }

  if (gatewayKey) return gateway
  if (openRouterKey) return openrouter
  if (typesafeKey) return typesafe
  return null
}

export function createJevClient(config: JevProviderConfig): TypeSafeClient {
  return new TypeSafeClient({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultModel: config.model,
    // Gateway / OpenRouter may not accept zstd request bodies.
    compression: false,
  })
}

export function missingProviderMessage(): string {
  return [
    "Jev pilot: no provider credentials found. Set one of:",
    "  (1) AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN  → Vercel AI Gateway (default when present)",
    "  (2) OPENROUTER_API_KEY                      → OpenRouter System One",
    "  (3) TYPESAFE_API_KEY (or legacy JEV_API_KEY) → TypeSafe direct",
    "Optional: JEV_PROVIDER=vercel-ai-gateway|openrouter|typesafe, JEV_MODEL, JEV_BASE_URL",
    "See scripts/jev-pilot/README.md",
  ].join("\n")
}
