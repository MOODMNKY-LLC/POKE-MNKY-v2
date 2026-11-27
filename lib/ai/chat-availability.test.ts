import { afterEach, describe, expect, it } from "vitest"
import { isLeagueChatAvailable } from "./chat-availability"
import { isOpenAIConfigured } from "@/lib/openai-client"
import { prefersOpenClawChat } from "@/lib/openclaw/chat-route"

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
      // Assign empty string when clearing so parallel CI workers cannot revive a prior value.
      if (value === undefined) {
        process.env[key] = ""
        delete process.env[key]
      } else {
        process.env[key] = value
      }
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

  it("fails closed on OpenClaw when the gateway URL is empty, even if openclaw is requested", () => {
    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "league-agent",
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: undefined,
    })
    expect(prefersOpenClawChat()).toBe(false)
    expect(isLeagueChatAvailable()).toBe(false)

    setEnv({
      OPENAI_API_KEY: "sk-test",
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "league-agent",
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: undefined,
    })
    // Empty URL must not pin the OpenClaw path; OpenAI remains usable when configured.
    expect(prefersOpenClawChat()).toBe(false)
    expect(isLeagueChatAvailable()).toBe(true)
  })

  it("disables league chat when OpenClaw is preferred but the agent id is unset", () => {
    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: undefined,
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: "wss://gateway.example/ws",
    })
    expect(prefersOpenClawChat()).toBe(true)
    expect(isLeagueChatAvailable()).toBe(false)

    setEnv({
      OPENAI_API_KEY: undefined,
      AI_CHAT_PROVIDER: "openclaw",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      OPENCLAW_AGENT_ID: "   ",
      OPENCLAW_HOOKS_TOKEN: undefined,
      OPENCLAW_GATEWAY_URL: "   ",
    })
    expect(prefersOpenClawChat()).toBe(false)
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

  it("does not prefer OpenClaw when a URL and agent id have no auth", () => {
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
    expect(prefersOpenClawChat()).toBe(false)
    expect(isLeagueChatAvailable()).toBe(true)

    setEnv({
      OPENAI_API_KEY: undefined,
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
