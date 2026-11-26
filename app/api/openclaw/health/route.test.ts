import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/openclaw/gateway-client", () => ({
  OpenClawGatewayClient: class {
    constructor() {
      throw new Error("OpenClaw gateway client should not be constructed")
    }
  },
}))

import { GET } from "./route"

const KEYS = [
  "OPENCLAW_GATEWAY_URL",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_AGENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_SECRET",
] as const

describe("GET /api/openclaw/health", () => {
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

  it("returns JSON 503 and does not connect when the gateway is not configured", async () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: undefined,
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: undefined,
    })
    const response = await GET()
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "unavailable",
      message: "AI chat is unavailable right now",
      authMode: "token",
      enabled: false,
    })
  })

  it("reports configured for cf-access and does not open a socket or reveal secrets", async () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: "https://gateway.example",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "member-agent",
      OPENCLAW_CF_ACCESS_CLIENT_ID: "test-cf-id",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: "test-cf-secret",
    })
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      ok: true,
      configured: true,
      authMode: "cf-access",
      enabled: true,
      agentId: "member-agent",
    })
    expect(JSON.stringify(body)).not.toContain("test-cf-secret")
    expect(JSON.stringify(body)).not.toContain("test-cf-id")
  })

  it("fails closed for a URL and agent id with no auth", async () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "stale-agent",
      OPENCLAW_CF_ACCESS_CLIENT_ID: undefined,
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: undefined,
    })
    const response = await GET()
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      enabled: false,
      authMode: "none",
    })
  })
})
