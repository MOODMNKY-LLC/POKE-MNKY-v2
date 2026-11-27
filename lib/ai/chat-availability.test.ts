import { afterEach, describe, expect, it, vi } from "vitest"
import { isLeagueChatAvailable } from "./chat-availability"
import { isOpenAIConfigured } from "@/lib/openai-client"

const KEYS = [
  "OPENAI_API_KEY",
  "AI_CHAT_PROVIDER",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_AGENT_ID",
  "OPENCLAW_HOOKS_TOKEN",
  "OPENCLAW_GATEWAY_URL",
  "OPENCLAW_CF_ACCESS_CLIENT_ID",
  "OPENCLAW_CF_ACCESS_CLIENT_SECRET",
] as const

describe("chat availability without OPENAI_API_KEY", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function setEnv(next: Partial<Record<(typeof KEYS)[number], string | undefined>>) {
    for (const key of KEYS) {
      // Empty string is falsy for Boolean(...?.trim()) checks; prefer stubEnv over
      // delete process.env, which is unreliable under Vitest's forks pool on CI.
      vi.stubEnv(key, next[key] ?? "")
    }
  }

  it("keeps league chat available on OpenClaw when the OpenAI key is absent", () => {
    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "league-agent",
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
    })
    expect(isOpenAIConfigured()).toBe(false)
    expect(isLeagueChatAvailable()).toBe(true)
  })

  it("disables league chat when OpenClaw is requested but URL or agent id is unset", () => {
    setEnv({
      OPENAI_API_KEY: "sk-test",
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "league-agent",
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: undefined,
    })
    expect(isLeagueChatAvailable()).toBe(false)

    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: undefined,
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
    })
    expect(isLeagueChatAvailable()).toBe(false)

    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "   ",
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: "   ",
    })
    expect(isLeagueChatAvailable()).toBe(false)
  })

  it("reports chat unavailable when neither provider is configured", () => {
    setEnv({
      OPENAI_API_KEY: "   ",
      AI_CHAT_PROVIDER: undefined,
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: undefined,
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: undefined,
    })
    expect(isOpenAIConfigured()).toBe(false)
    expect(isLeagueChatAvailable()).toBe(false)
  })

  it("keeps league chat available on Cloudflare Access without a gateway token or OpenAI key", () => {
    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "member-agent",
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: "https://gateway.example",
      OPENCLAW_CF_ACCESS_CLIENT_ID: "access-id",
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: "access-secret",
    })
    expect(isLeagueChatAvailable()).toBe(true)
  })

  it("disables league chat when a URL and agent id have no auth", () => {
    setEnv({
      OPENAI_API_KEY: "sk-test",
      AI_CHAT_PROVIDER: undefined,
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: "stale-agent",
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
      OPENCLAW_CF_ACCESS_CLIENT_ID: undefined,
      OPENCLAW_CF_ACCESS_CLIENT_SECRET: undefined,
    })
    expect(isLeagueChatAvailable()).toBe(false)
  })

  it("treats a non-blank OpenAI key as the fallback", () => {
    setEnv({
      OPENAI_API_KEY: "sk-test",
      AI_CHAT_PROVIDER: "openai",
      OPENCLAW_GATEWAY_TOKEN: undefined,
      OPENCLAW_AGENT_ID: undefined,
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: undefined,
    })
    expect(isOpenAIConfigured()).toBe(true)
    expect(isLeagueChatAvailable()).toBe(true)
  })
})
