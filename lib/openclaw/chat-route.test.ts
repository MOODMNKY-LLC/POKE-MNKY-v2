import { afterEach, describe, expect, it, vi } from "vitest"
import { handleOpenClawChatRequest } from "./chat-route"
import {
  createMemoryAiChatUsageStore,
  enforceAiChatRateLimit,
  setAiChatUsageStore,
} from "@/lib/ai/rate-limit"

const KEYS = [
  "OPENCLAW_GATEWAY_URL",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_AGENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_SECRET",
  "OPENCLAW_HTTP_CHAT",
  "AI_CHAT_LIMIT_PER_HOUR",
  "AI_CHAT_LIMIT_PER_DAY",
  "AI_CHAT_LIMIT_GLOBAL_PER_DAY",
] as const

const PROMPT = "Draft Pikachu into the flex spot please"
const SYSTEM = "SYSTEM_PROMPT_SHOULD_NOT_LEAK"
const TOKEN = "gateway-token-should-not-leak"
const ACCESS_SECRET = "test-cf-secret"

function sse(payload: string) {
  return new Response(payload, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  })
}

describe("openclaw chat route upstream failures", () => {
  const previous = new Map<string, string | undefined>()
  const fetchMock = vi.fn()

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
    setAiChatUsageStore(null)
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

  function enableChat(limits: { hour: string; day: string; global: string }) {
    setEnv({
      OPENCLAW_GATEWAY_URL: "https://gateway.example/",
      OPENCLAW_GATEWAY_TOKEN: TOKEN,
      OPENCLAW_AGENT_ID: "aab-member",
      OPENCLAW_CF_ACCESS_CLIENT_ID: "test-cf-id",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: ACCESS_SECRET,
      OPENCLAW_HTTP_CHAT: undefined,
      AI_CHAT_LIMIT_PER_HOUR: limits.hour,
      AI_CHAT_LIMIT_PER_DAY: limits.day,
      AI_CHAT_LIMIT_GLOBAL_PER_DAY: limits.global,
    })
    setAiChatUsageStore(createMemoryAiChatUsageStore())
  }

  function send() {
    return handleOpenClawChatRequest(
      new Request("http://localhost/api/ai/assistant", { method: "POST" }),
      { mode: "general", userId: "coach-1", systemPrompt: SYSTEM },
      { messages: [{ role: "user", content: PROMPT }] },
    )
  }

  it("logs the caller failure, refunds the question, and still rate limits", async () => {
    enableChat({ hour: "1", day: "10", global: "10" })
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: "relay_down", message: PROMPT, detail: ACCESS_SECRET }),
          { status: 502 },
        ),
      )
      .mockResolvedValueOnce(sse('data: {"choices":[{"delta":{"content":"kept-reply"}}]}\n\ndata: [DONE]\n\n'))
    vi.stubGlobal("fetch", fetchMock)
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})

    try {
      const failed = await send()
      const failedText = await failed.text()
      expect(failedText).toContain("AI chat is temporarily unavailable")
      expect(failedText).not.toContain(PROMPT)
      expect(failedText).not.toContain(ACCESS_SECRET)
      expect(failedText).not.toContain("relay_down")

      const lines = [...consoleError.mock.calls, ...consoleInfo.mock.calls].map((call) => String(call[0]))
      const caller = lines
        .map((line) => JSON.parse(line) as { event?: string; status?: number; code?: string })
        .find((entry) => entry.event === "openclaw_chat_upstream_failure")
      const transport = lines
        .map((line) => JSON.parse(line) as { event?: string })
        .find((entry) => entry.event === "openclaw_upstream_failure")
      expect(caller).toMatchObject({ status: 502, code: "relay_down", userId: "coach-1", mode: "general" })
      expect(transport).toMatchObject({ event: "openclaw_upstream_failure", status: 502, code: "relay_down" })
      for (const line of lines) {
        expect(line).not.toContain(PROMPT)
        expect(line).not.toContain(SYSTEM)
        expect(line).not.toContain(ACCESS_SECRET)
        expect(line).not.toContain(TOKEN)
        expect(line).not.toContain("test-cf-id")
      }

      const replied = await send()
      expect(await replied.text()).toContain("kept-reply")
      const blocked = await send()
      expect(blocked.status).toBe(429)
      await expect(blocked.json()).resolves.toMatchObject({ code: "rate_limited", scope: "hour" })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      consoleError.mockRestore()
      consoleInfo.mockRestore()
    }
  })

  it("keeps the reservation when a reply byte already streamed", async () => {
    enableChat({ hour: "1", day: "10", global: "10" })
    fetchMock.mockResolvedValue(
      sse(
        'data: {"choices":[{"delta":{"content":"partial-reply"}}]}\n\ndata: {"error":{"message":"LEAK","code":"boom"}}\n\n',
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const first = await send()
    const text = await first.text()
    expect(text).toContain("partial-reply")
    expect(text).toContain("AI chat is temporarily unavailable")
    expect(text).not.toContain("LEAK")

    const blocked = await send()
    expect(blocked.status).toBe(429)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("does not call upstream when the coach is already at the limit", async () => {
    enableChat({ hour: "1", day: "10", global: "10" })
    const now = new Date()
    expect(await enforceAiChatRateLimit({ userId: "coach-1", mode: "general", now })).toBeNull()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: "relay_down" }), { status: 502 }))
    vi.stubGlobal("fetch", fetchMock)

    const blocked = await send()
    expect(blocked.status).toBe(429)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
