import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { AI_CHAT_UNAVAILABLE_MESSAGE, leagueChatDockMode } from "./league-chat-dock"

const root = process.cwd()

describe("league chat dock", () => {
  it("uses sources-only knowledge when chat is down and knowledge is on", () => {
    expect(leagueChatDockMode({ leagueChatAvailable: false, knowledgeEnabled: true })).toBe("knowledge")
  })

  it("says AI chat is unavailable when knowledge is off", () => {
    expect(leagueChatDockMode({ leagueChatAvailable: false, knowledgeEnabled: false })).toBe("unavailable")
    expect(AI_CHAT_UNAVAILABLE_MESSAGE).toBe("AI chat is unavailable right now")
  })

  it("keeps generative chat when league chat is available", () => {
    expect(leagueChatDockMode({ leagueChatAvailable: true, knowledgeEnabled: true })).toBe("chat")
    expect(leagueChatDockMode({ leagueChatAvailable: true, knowledgeEnabled: false })).toBe("chat")
  })

  it("wires the dock to that choice and leaves the other chat disabled state alone", () => {
    const popup = readFileSync(join(root, "components/ai/unified-assistant-popup.tsx"), "utf8")
    expect(popup).toContain("leagueChatDockMode")
    expect(popup).toContain("AI_CHAT_UNAVAILABLE_MESSAGE")
    expect(popup).toContain("AabKnowledgePanel")

    const composer = readFileSync(join(root, "components/ai/base-chat-interface.tsx"), "utf8")
    expect(composer).toContain(
      "Ask POKE MNKY is unavailable. OpenAI is disabled, and the OpenClaw gateway is not configured.",
    )
  })
})
