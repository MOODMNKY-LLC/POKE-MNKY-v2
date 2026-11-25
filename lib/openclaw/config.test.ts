import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildSessionKey, getOpenClawConfig } from "./config"

const KEYS = ["OPENCLAW_GATEWAY_URL", "OPENCLAW_GATEWAY_TOKEN", "OPENCLAW_AGENT_ID"] as const

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

  function setEnv(next: Record<(typeof KEYS)[number], string | undefined>) {
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

  it("enables OpenClaw only when both URL and agent id are set", () => {
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
