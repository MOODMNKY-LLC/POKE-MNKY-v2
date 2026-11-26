import { afterEach, describe, expect, it, vi } from "vitest"
import {
  handleOpenClawHttpChatRequest,
  openClawChatBody,
  openClawChatHeaders,
  openClawUpstreamErrorMessage,
  openClawUserLabel,
} from "./http-chat"
import { getOpenClawConfig } from "./config"

const KEYS = [
  "OPENCLAW_GATEWAY_URL",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_AGENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_SECRET",
  "OPENCLAW_MAX_TOKENS",
  "OPENCLAW_TIMEOUT_MS",
  "OPENCLAW_HTTP_CHAT",
] as const

function sseResponse(payload: string) {
  return new Response(payload, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  })
}

describe("openclaw http chat", () => {
  const previous = new Map<string, string | undefined>()
  const fetchMock = vi.fn()

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
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

  function accessEnv() {
    setEnv({
      OPENCLAW_GATEWAY_URL: "https://gateway.example/",
      OPENCLAW_GATEWAY_TOKEN: "legacy-token",
      OPENCLAW_AGENT_ID: "aab-member",
      OPENCLAW_CF_ACCESS_CLIENT_ID: "test-cf-id",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: "test-cf-secret",
      OPENCLAW_MAX_TOKENS: "5000",
      OPENCLAW_TIMEOUT_MS: undefined,
      OPENCLAW_HTTP_CHAT: undefined,
    })
  }

  it("sends Access headers and omits Authorization in cf-access mode", () => {
    accessEnv()
    const config = getOpenClawConfig()
    const headers = openClawChatHeaders(config, "agent:aab-member:web:coach-1:general")
    expect(headers.get("CF-Access-Client-Id")).toBe("test-cf-id")
    expect(headers.get("CF-Access-Client-Secret")).toBe("test-cf-secret")
    expect(headers.get("Authorization")).toBeNull()
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(headers.get("Accept")).toBe("text/event-stream")
    expect(headers.get("x-openclaw-session-key")).toBe("agent:aab-member:web:coach-1:general")

    const body = openClawChatBody({
      agentId: config.agentId,
      messages: [{ role: "user", content: "Who should I draft?" }],
      userId: "coach-1",
      mode: "general",
    })
    expect(body.model).toBe("openclaw/aab-member")
    expect(body.max_tokens).toBeLessThanOrEqual(800)
    expect(body.max_completion_tokens).toBeLessThanOrEqual(800)
    expect(body.user).toBe(openClawUserLabel("coach-1", "general"))
    expect(String(body.user)).not.toContain("coach-1")
    expect(String(body.user)).not.toContain("@")
  })

  it("sends only the bearer token in token mode", () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "league-agent",
      OPENCLAW_CF_ACCESS_CLIENT_ID: undefined,
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: undefined,
    })
    const headers = openClawChatHeaders(getOpenClawConfig(), "agent:league-agent:web:coach-1:draft")
    expect(headers.get("Authorization")).toBe("Bearer gateway-token")
    expect(headers.get("CF-Access-Client-Id")).toBeNull()
    expect(headers.get("CF-Access-Client-Secret")).toBeNull()
  })

  it("posts the clamped body and does not echo upstream errors", async () => {
    accessEnv()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "nope", detail: "UPSTREAM_SECRET_BODY" }), { status: 401 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = handleOpenClawHttpChatRequest({
      messages: [{ role: "user", content: "Hello" }],
      sessionKey: "agent:aab-member:web:coach-1:general",
      agentId: "aab-member",
      userId: "coach-1",
      mode: "general",
    })
    const text = await response.text()
    expect(text).toContain("AI chat is temporarily unavailable")
    expect(text).not.toContain("UPSTREAM_SECRET_BODY")

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get("Authorization")).toBeNull()
    expect(headers.get("CF-Access-Client-Id")).toBe("test-cf-id")
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://gateway.example/v1/chat/completions")
    const sent = JSON.parse(String(init.body)) as { model: string; max_tokens: number; max_completion_tokens: number }
    expect(sent.model).toBe("openclaw/aab-member")
    expect(sent.max_tokens).toBe(800)
    expect(sent.max_completion_tokens).toBe(800)
  })

  it.each([
    [403, { error: "forbidden LEAK" }, "AI chat is temporarily unavailable"],
    [413, { code: "aab_gateway_policy", message: "LEAK too many" }, "too many messages"],
    [400, { code: "aab_gateway_policy", message: "LEAK too long" }, "too long"],
    [429, { error: "cloudflare LEAK" }, "AI chat is busy right now"],
    [502, { error: "bad gateway LEAK" }, "AI chat is temporarily unavailable"],
  ])("maps upstream %s to a friendly error", async (status, payload, expected) => {
    accessEnv()
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status: Number(status) }))
    vi.stubGlobal("fetch", fetchMock)
    const response = handleOpenClawHttpChatRequest({
      messages: [{ role: "user", content: "Hello" }],
      sessionKey: "agent:aab-member:web:coach-1:general",
      agentId: "aab-member",
      userId: "coach-1",
      mode: "general",
    })
    const text = await response.text()
    expect(text).toContain(expected)
    expect(text).not.toContain("LEAK")
    expect(openClawUpstreamErrorMessage(Number(status), (payload as { code?: string }).code)).toContain(expected)
  })

  it("aborts when the upstream stream exceeds the timeout", async () => {
    setEnv({
      OPENCLAW_GATEWAY_URL: "https://gateway.example/",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "aab-member",
      OPENCLAW_CF_ACCESS_CLIENT_ID: "test-cf-id",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: "test-cf-secret",
      OPENCLAW_MAX_TOKENS: undefined,
      OPENCLAW_TIMEOUT_MS: "30",
      OPENCLAW_HTTP_CHAT: undefined,
    })
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("The operation was aborted")
          error.name = "AbortError"
          reject(error)
        })
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    const response = handleOpenClawHttpChatRequest({
      messages: [{ role: "user", content: "Hello" }],
      sessionKey: "agent:aab-member:web:coach-1:general",
      agentId: "aab-member",
      userId: "coach-1",
      mode: "general",
    })
    const text = await response.text()
    expect(text).toContain("AI chat timed out")
    expect(text).not.toContain("test-cf-secret")
  })

  it("does not forward an SSE error body", async () => {
    accessEnv()
    fetchMock.mockResolvedValue(
      sseResponse('data: {"error":{"message":"LEAK from stream","code":"boom"}}\n\n'),
    )
    vi.stubGlobal("fetch", fetchMock)
    const response = handleOpenClawHttpChatRequest({
      messages: [{ role: "user", content: "Hello" }],
      sessionKey: "agent:aab-member:web:coach-1:general",
      agentId: "aab-member",
      userId: "coach-1",
      mode: "general",
    })
    const text = await response.text()
    expect(text).toContain("AI chat is temporarily unavailable")
    expect(text).not.toContain("LEAK")
  })
})
