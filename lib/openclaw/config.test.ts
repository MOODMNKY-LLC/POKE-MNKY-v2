import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildSessionKey, getOpenClawConfig, openClawMaxTokens, toOpenClawHttpBaseUrl } from "./config"

const KEYS = [
  "OPENCLAW_GATEWAY_URL",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_AGENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_SECRET",
  "OPENCLAW_ALLOWED_AGENT_ID",
  "OPENCLAW_MAX_TOKENS",
] as const

describe("getOpenClawConfig", () => {
  const previous = new Map<string, string | undefined>()

  afterEach(() => {
    for (const key of KEYS) {
      const value = previous.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    previous.clear()
  })

  function setEnv(next: Partial<Record<(typeof KEYS)[number], string | undefined>>) {
    for (const key of KEYS) {
      if (!previous.has(key)) previous.set(key, process.env[key])
      const value = next[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }

  it("does not embed a default gateway host or agent id", () => {
    const source = readFileSync(join(process.cwd(), "lib/openclaw/config.ts"), "utf8")
    expect(source).not.toContain("aab-openclaw.moodmnky.com")
    expect(source).not.toContain("poke-mnky")
    expect(source).not.toContain("aab-member")
    expect(source).not.toContain("aab-chat-gw")
  })

  it("disables OpenClaw when the gateway URL or agent id is missing", () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: undefined,
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "league-agent",
    })
    expect(getOpenClawConfig()).toMatchObject({
      gatewayUrl: "",
      agentId: "league-agent",
      enabled: false,
    })

    setEnv({
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: undefined,
    })
    expect(getOpenClawConfig()).toMatchObject({
      gatewayUrl: "wss://gateway.example/ws",
      agentId: "",
      enabled: false,
    })

    setEnv({
      OPENCLAW_GATEWAY_URL: "   ",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "   ",
    })
    const blank = getOpenClawConfig()
    expect(blank.gatewayUrl).toBe("")
    expect(blank.agentId).toBe("")
    expect(blank.enabled).toBe(false)
    expect(buildSessionKey("general", null)).toBe("agent::web:anonymous:general")
  })

  it("disables a stale URL and agent id when no auth is set", () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "stale-agent",
      OPENCLAW_CF_ACCESS_CLIENT_ID: undefined,
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: undefined,
    })
    expect(getOpenClawConfig()).toMatchObject({
      authMode: "none",
      enabled: false,
    })
  })

  it("selects cf-access when both Access credentials are set, even if a token is also set", () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: "https://gateway.example",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "member-agent",
      OPENCLAW_CF_ACCESS_CLIENT_ID: " access-id ",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: " access-secret ",
    })
    expect(getOpenClawConfig()).toMatchObject({
      gatewayUrl: "https://gateway.example",
      authMode: "cf-access",
      cfAccessClientId: "access-id",
      cfAccessClientSecret: "access-secret",
      enabled: true,
    })
  })

  it("selects token mode when only the gateway token is set", () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "league-agent",
      OPENCLAW_CF_ACCESS_CLIENT_ID: undefined,
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: "only-one",
    })
    expect(getOpenClawConfig()).toMatchObject({
      authMode: "token",
      enabled: true,
    })
  })

  it("requires the allowed agent id in cf-access mode when that variable is set", () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: "https://gateway.example",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "other-agent",
      OPENCLAW_CF_ACCESS_CLIENT_ID: "access-id",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: "access-secret",
      OPENCLAW_ALLOWED_AGENT_ID: "member-agent",
    })
    expect(getOpenClawConfig().enabled).toBe(false)

    setEnv({
      OPENCLAW_GATEWAY_URL: "https://gateway.example",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "member-agent",
      OPENCLAW_CF_ACCESS_CLIENT_ID: "access-id",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: "access-secret",
      OPENCLAW_ALLOWED_AGENT_ID: "member-agent",
    })
    expect(getOpenClawConfig().enabled).toBe(true)
  })

  it("accepts an https gateway URL and converts legacy websocket schemes", () => {
    expect(toOpenClawHttpBaseUrl("https://gateway.example/")).toBe("https://gateway.example")
    expect(toOpenClawHttpBaseUrl("wss://gateway.example/ws")).toBe("https://gateway.example/ws")
    expect(toOpenClawHttpBaseUrl("ws://gateway.example")).toBe("http://gateway.example")
    setEnv({ OPENCLAW_MAX_TOKENS: "5000" })
    expect(openClawMaxTokens()).toBe(800)
    setEnv({ OPENCLAW_MAX_TOKENS: undefined })
    expect(openClawMaxTokens()).toBe(800)
  })

  it("enables OpenClaw when URL, agent id, and gateway token are set", () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: " wss://gateway.example/ws ",
      OPENCLAW_GATEWAY_TOKEN: " gateway-token ",
      OPENCLAW_AGENT_ID: " league-agent ",
    })
    expect(getOpenClawConfig()).toMatchObject({
      gatewayUrl: "wss://gateway.example/ws",
      gatewayToken: "gateway-token",
      agentId: "league-agent",
      enabled: true,
    })
    expect(buildSessionKey("draft", "user-1")).toBe("agent:league-agent:web:user-1:draft")
  })
})
