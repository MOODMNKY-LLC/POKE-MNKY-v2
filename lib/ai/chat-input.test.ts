import { describe, expect, it } from "vitest"
import { prepareLeagueChatMessages } from "./chat-input"

describe("prepareLeagueChatMessages", () => {
  it("rejects a message longer than 2000 characters", () => {
    const result = prepareLeagueChatMessages({
      raw: [{ role: "user", content: "a".repeat(2001) }],
      systemPrompt: "You are POKE MNKY.",
      maxMessageChars: 2000,
      maxHistory: 10,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(413)
  })

  it("keeps the system prompt and the last 10 turns", () => {
    const raw = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: `turn-${index}` }],
    }))
    const result = prepareLeagueChatMessages({
      raw,
      systemPrompt: "Server system prompt",
      maxMessageChars: 2000,
      maxHistory: 10,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.messages[0]).toEqual({ role: "system", content: "Server system prompt" })
    const conversation = result.messages.filter((message) => message.role !== "system")
    expect(conversation).toHaveLength(10)
    expect(conversation[0]?.content).toBe("turn-2")
    expect(conversation.at(-1)?.content).toBe("turn-11")
    expect(conversation.some((message) => message.content === "turn-0")).toBe(false)
  })
})
