import { describe, expect, it } from "vitest"
import { detectAssistantContext } from "./assistant-context"

describe("detectAssistantContext", () => {
  it("uses the draft assistant on the public draft room and the coach draft pages", () => {
    for (const pathname of ["/draft", "/draft/board", "/dashboard/draft", "/dashboard/draft/board", "/dashboard/draft/roster"]) {
      const context = detectAssistantContext(pathname, { teamId: "team-1", seasonId: "season-9" })
      expect(context.agentType).toBe("draft")
      expect(context.apiEndpoint).toBe("/api/ai/draft-assistant")
      expect(context.context).toEqual({ teamId: "team-1", seasonId: "season-9" })
    }
  })

  it("keeps the other page assistants on their own routes", () => {
    expect(detectAssistantContext("/showdown").apiEndpoint).toBe("/api/ai/battle-strategy")
    expect(detectAssistantContext("/battle-strategy").apiEndpoint).toBe("/api/ai/battle-strategy")
    expect(detectAssistantContext("/dashboard/free-agency").apiEndpoint).toBe("/api/ai/free-agency")
    expect(detectAssistantContext("/pokedex").apiEndpoint).toBe("/api/ai/pokedex")
    expect(detectAssistantContext("/standings").apiEndpoint).toBe("/api/ai/assistant")
  })
})
