import { afterEach, describe, expect, it } from "vitest"
import { isLeagueChatAvailable } from "./chat-availability"
import { isOpenAIConfigured } from "@/lib/openai-client"

const KEYS = [
  "OPENAI_API_KEY",
  "AI_CHAT_PROVIDER",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_AGENT_ID",
  "OPENCLAW_HOOKS_TOKEN",
  "OPENCLAW_GATEWAY_URL",
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

  function setEnv(next: Record<string, string | undefined>) {
    for (const key of KEYS) {
      if (!previous.has(key)) previous.set(key, process.env[key])
      const value = next[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
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
