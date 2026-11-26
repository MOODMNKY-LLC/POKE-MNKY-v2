import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryAiChatUsageStore, setAiChatUsageStore } from "@/lib/ai/rate-limit"

const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null } }> => ({
    data: { user: { id: "11111111-1111-1111-1111-111111111111" } },
  })),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}))

vi.mock("@/lib/openclaw/gateway-client", () => ({
  OpenClawGatewayClient: class {
    constructor() {
      throw new Error("OpenClaw gateway client should not be constructed")
    }
  },
}))

import { POST as assistantPost } from "./assistant/route"
import { POST as pokedexPost } from "./pokedex/route"

const KEYS = [
  "OPENAI_API_KEY",
  "AI_CHAT_PROVIDER",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_AGENT_ID",
  "OPENCLAW_GATEWAY_URL",
  "OPENCLAW_CF_ACCESS_CLIENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_SECRET",
  "OPENCLAW_HTTP_CHAT",
  "AI_CHAT_LIMIT_PER_HOUR",
  "AI_CHAT_LIMIT_PER_DAY",
  "AI_CHAT_LIMIT_GLOBAL_PER_DAY",
  "AI_CHAT_MAX_MESSAGE_CHARS",
  "AI_CHAT_MAX_HISTORY",
] as const

const fetchMock = vi.fn()

describe("league chat caps and rate limits", () => {
  const previous = new Map<string, string | undefined>()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n', {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
    getUser.mockReset()
    getUser.mockResolvedValue({ data: { user: { id: "11111111-1111-1111-1111-111111111111" } } })
    setAiChatUsageStore(createMemoryAiChatUsageStore())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  function enableChat() {
    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "aab-member",
      OPENCLAW_GATEWAY_URL: "https://gateway.example",
      OPENCLAW_CF_ACCESS_CLIENT_ID: "test-cf-id",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: "test-cf-secret",
      OPENCLAW_HTTP_CHAT: undefined,
      AI_CHAT_LIMIT_PER_HOUR: "20",
      AI_CHAT_LIMIT_PER_DAY: "100",
      AI_CHAT_LIMIT_GLOBAL_PER_DAY: "300",
      AI_CHAT_MAX_MESSAGE_CHARS: "2000",
      AI_CHAT_MAX_HISTORY: "10",
    })
  }

  function post(path: string, body: Record<string, unknown>) {
    return new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("rejects a 2001-character message before the gateway and does not count it", async () => {
    enableChat()
    const tooLong = await assistantPost(
      post("/api/ai/assistant", { messages: [{ role: "user", content: "a".repeat(2001) }] }),
    )
    expect(tooLong.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await assistantPost(
        post("/api/ai/assistant", { messages: [{ role: "user", content: `hello ${attempt}` }] }),
      )
      expect(response.status).not.toBe(429)
      await response.text()
    }
    const blocked = await assistantPost(
      post("/api/ai/assistant", { messages: [{ role: "user", content: "one more" }] }),
    )
    expect(blocked.status).toBe(429)
    await expect(blocked.json()).resolves.toMatchObject({ code: "rate_limited", scope: "hour" })
    expect(fetchMock).toHaveBeenCalledTimes(20)
  })

  it("trims history to 10 turns before calling the gateway", async () => {
    enableChat()
    const messages = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `turn-${index}`,
    }))
    const response = await assistantPost(post("/api/ai/assistant", { messages }))
    await response.text()
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const sent = JSON.parse(String(init.body)) as { messages: Array<{ role: string; content: string }> }
    const conversation = sent.messages.filter((message) => message.role !== "system")
    expect(conversation).toHaveLength(10)
    expect(conversation.some((message) => message.content === "turn-0")).toBe(false)
    expect(sent.messages[0]?.role).toBe("system")
  })

  it("returns 503 when the limiter store errors and does not call the gateway", async () => {
    enableChat()
    setAiChatUsageStore({
      async consume() {
        throw new Error("store exploded with secret")
      },
      async refund() {
        throw new Error("store exploded with secret")
      },
    })
    const response = await assistantPost(
      post("/api/ai/assistant", { messages: [{ role: "user", content: "hello" }] }),
    )
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body).toMatchObject({ code: "chat_unavailable" })
    expect(JSON.stringify(body)).not.toContain("secret")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("still returns 401 for a signed-out coach", async () => {
    enableChat()
    getUser.mockResolvedValueOnce({ data: { user: null } })
    const assistant = await assistantPost(
      post("/api/ai/assistant", { messages: [{ role: "user", content: "hello" }] }),
    )
    expect(assistant.status).toBe(401)
    await expect(assistant.json()).resolves.toEqual({ error: "Unauthorized" })

    getUser.mockResolvedValueOnce({ data: { user: null } })
    const pokedex = await pokedexPost(
      post("/api/ai/pokedex", { messages: [{ role: "user", content: "hello" }] }),
    )
    expect(pokedex.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
