import { afterEach, describe, expect, it } from "vitest"
import { isAiMcpToolsEnabledByEnv, resolveMcpToolsEnabled } from "./mcp-tools-enabled"

const KEY = "AI_MCP_TOOLS_ENABLED"

afterEach(() => {
  delete process.env[KEY]
})

describe("AI MCP tools flag", () => {
  it("defaults to off when unset", () => {
    delete process.env[KEY]
    expect(isAiMcpToolsEnabledByEnv()).toBe(false)
    expect(resolveMcpToolsEnabled(true)).toBe(false)
  })

  it("enables only when env is true and the request asks for MCP", () => {
    process.env[KEY] = "true"
    expect(resolveMcpToolsEnabled(true)).toBe(true)
    expect(resolveMcpToolsEnabled(false)).toBe(false)
    expect(resolveMcpToolsEnabled(undefined)).toBe(false)
  })

  it("treats 1 and yes as enabled", () => {
    process.env[KEY] = "1"
    expect(isAiMcpToolsEnabledByEnv()).toBe(true)
    process.env[KEY] = "yes"
    expect(isAiMcpToolsEnabledByEnv()).toBe(true)
  })
})
