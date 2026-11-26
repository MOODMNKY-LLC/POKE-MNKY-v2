import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AI_CHAT_UNAVAILABLE_MESSAGE } from "@/lib/ai/league-chat-dock"
import { OPENAI_UNAVAILABLE_MESSAGE } from "@/lib/openai-client"

const { getUser, fetchMock, gatewayConstructs } = vi.hoisted(() => ({
  getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null } }> => ({
    data: { user: { id: "user-1" } },
  })),
  fetchMock: vi.fn(),
  gatewayConstructs: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}))

vi.mock("@/lib/openclaw/gateway-client", () => ({
  OpenClawGatewayClient: class {
    constructor() {
      gatewayConstructs()
      throw new Error("OpenClaw gateway client should not be constructed")
    }
  },
}))

import { POST as assistantPost } from "./assistant/route"
import { POST as battlePost } from "./battle-strategy/route"
import { POST as draftPost } from "./draft-assistant/route"
import { POST as freeAgencyPost } from "./free-agency/route"
import { POST as pokedexPost } from "./pokedex/route"

const KEYS = [
  "OPENAI_API_KEY",
  "AI_CHAT_PROVIDER",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_AGENT_ID",
  "OPENCLAW_HOOKS_TOKEN",
  "OPENCLAW_GATEWAY_URL",
  "OPENCLAW_HTTP_CHAT",
  "OPENCLAW_CF_ACCESS_CLIENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_SECRET",
] as const

const messages = [{ role: "user", parts: [{ type: "text", text: "Who should I draft?" }] }]

describe("league chat routes when OpenClaw is not configured", () => {
  const previous = new Map<string, string | undefined>()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockRejectedValue(new Error("fetch should not be called"))
    vi.stubGlobal("fetch", fetchMock)
    gatewayConstructs.mockClear()
    getUser.mockReset()
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  function post(path: string, body: Record<string, unknown>) {
    return new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  async function expectUnavailable(response: Response, message: string) {
    expect(response.status).toBe(503)
    expect(response.headers.get("content-type")).toContain("application/json")
    await expect(response.json()).resolves.toEqual({ error: "unavailable", message })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(gatewayConstructs).not.toHaveBeenCalled()
  }

  const routes: Array<{
    name: string
    path: string
    post: (request: Request) => Promise<Response>
    body: Record<string, unknown>
  }> = [
    { name: "assistant", path: "/api/ai/assistant", post: assistantPost, body: { messages } },
    { name: "battle-strategy", path: "/api/ai/battle-strategy", post: battlePost, body: { messages } },
    {
      name: "draft-assistant",
      path: "/api/ai/draft-assistant",
      post: draftPost,
      body: { messages, teamId: "team-1" },
    },
    {
      name: "free-agency",
      path: "/api/ai/free-agency",
      post: freeAgencyPost,
      body: { messages, teamId: "team-1" },
    },
    { name: "pokedex", path: "/api/ai/pokedex", post: pokedexPost, body: { messages } },
  ]

  for (const route of routes) {
    it(`${route.name} returns JSON 503 and does not call the gateway when URL or agent id is unset`, async () => {
      setEnv({
        OPENAI_API_KEY: undefined,
        AI_CHAT_PROVIDER: "openclaw",
        OPENCLAW_GATEWAY_TOKEN: "gateway-token",
        OPENCLAW_AGENT_ID: undefined,
        OPENCLAW_HOOKS_TOKEN: undefined,
        OPENCLAW_GATEWAY_URL: undefined,
        OPENCLAW_HTTP_CHAT: undefined,
      })
      await expectUnavailable(await route.post(post(route.path, route.body)), AI_CHAT_UNAVAILABLE_MESSAGE)

      setEnv({
        OPENCLAW_GATEWAY_URL: "wss://aab-openclaw.moodmnky.com",
        OPENCLAW_AGENT_ID: undefined,
        OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      })
      await expectUnavailable(await route.post(post(route.path, route.body)), AI_CHAT_UNAVAILABLE_MESSAGE)
    })

    it(`${route.name} keeps the OpenAI-absent 503 when OpenClaw is not requested`, async () => {
      setEnv({
        OPENAI_API_KEY: undefined,
        AI_CHAT_PROVIDER: undefined,
        OPENCLAW_GATEWAY_TOKEN: undefined,
        OPENCLAW_AGENT_ID: undefined,
        OPENCLAW_HOOKS_TOKEN: undefined,
        OPENCLAW_GATEWAY_URL: undefined,
        OPENCLAW_HTTP_CHAT: undefined,
      })
      await expectUnavailable(await route.post(post(route.path, route.body)), OPENAI_UNAVAILABLE_MESSAGE)
    })
  }

  it("still requires auth on the assistant route", async () => {
    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: undefined,
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: undefined,
      OPENCLAW_HTTP_CHAT: undefined,
    })
    getUser.mockResolvedValueOnce({ data: { user: null } })
    const response = await assistantPost(post("/api/ai/assistant", { messages }))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })
})
