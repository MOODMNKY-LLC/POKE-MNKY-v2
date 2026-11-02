import { afterEach, describe, expect, it } from "vitest"
import { resolveJevProvider } from "./jev-provider"

function env(vars: Record<string, string>): NodeJS.ProcessEnv {
  return vars as NodeJS.ProcessEnv
}

afterEach(() => {
  for (const key of [
    "AI_GATEWAY_API_KEY",
    "VERCEL_OIDC_TOKEN",
    "OPENROUTER_API_KEY",
    "TYPESAFE_API_KEY",
    "JEV_API_KEY",
    "JEV_PROVIDER",
    "JEV_MODEL",
    "JEV_BASE_URL",
  ]) {
    delete process.env[key]
  }
})

describe("resolveJevProvider", () => {
  it("returns null when no credentials are set", () => {
    expect(resolveJevProvider(env({}))).toBeNull()
  })

  it("prefers Vercel AI Gateway when AI_GATEWAY_API_KEY is set", () => {
    const cfg = resolveJevProvider(
      env({
        AI_GATEWAY_API_KEY: "gw_test",
        OPENROUTER_API_KEY: "or_test",
        TYPESAFE_API_KEY: "ts_test",
      }),
    )
    expect(cfg?.id).toBe("vercel-ai-gateway")
    expect(cfg?.model).toBe("typesafe-ai/jev")
    expect(cfg?.baseURL).toBe("https://ai-gateway.vercel.sh/typesafe")
    expect(cfg?.apiKey).toBe("gw_test")
  })

  it("accepts VERCEL_OIDC_TOKEN for Gateway", () => {
    const cfg = resolveJevProvider(env({ VERCEL_OIDC_TOKEN: "oidc_test" }))
    expect(cfg?.id).toBe("vercel-ai-gateway")
    expect(cfg?.apiKey).toBe("oidc_test")
  })

  it("falls back to OpenRouter when Gateway is absent", () => {
    const cfg = resolveJevProvider(
      env({
        OPENROUTER_API_KEY: "or_test",
        TYPESAFE_API_KEY: "ts_test",
      }),
    )
    expect(cfg?.id).toBe("openrouter")
    expect(cfg?.model).toBe("typesafe/jev-1.13")
    expect(cfg?.baseURL).toBe("https://openrouter.ai/api")
  })

  it("falls back to TypeSafe direct last", () => {
    const cfg = resolveJevProvider(env({ TYPESAFE_API_KEY: "ts_test" }))
    expect(cfg?.id).toBe("typesafe")
    expect(cfg?.model).toBe("jev-1.13.0")
    expect(cfg?.baseURL).toBe("https://api.typesafe.ai")
  })

  it("accepts legacy JEV_API_KEY for TypeSafe", () => {
    const cfg = resolveJevProvider(env({ JEV_API_KEY: "legacy" }))
    expect(cfg?.id).toBe("typesafe")
    expect(cfg?.apiKey).toBe("legacy")
  })

  it("honors JEV_PROVIDER force when that route has credentials", () => {
    const cfg = resolveJevProvider(
      env({
        AI_GATEWAY_API_KEY: "gw",
        OPENROUTER_API_KEY: "or",
        JEV_PROVIDER: "openrouter",
      }),
    )
    expect(cfg?.id).toBe("openrouter")
  })
})
