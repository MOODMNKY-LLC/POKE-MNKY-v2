// @vitest-environment happy-dom

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/streamdown-wrapper", () => ({
  StreamdownWrapper: ({ children }: { children?: unknown }) => children ?? null,
}))

vi.mock("@/components/ui/blur-fade", () => ({
  BlurFade: ({ children }: { children?: unknown }) => children ?? null,
}))

vi.mock("@/components/ui/poke-mnky-avatar", () => ({
  PokeMnkyAssistant: () => null,
  PokeMnkyPremium: () => null,
}))

import { BaseChatInterface } from "./base-chat-interface"

describe("Ask POKE MNKY send", () => {
  let root: Root | null = null

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = null
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("posts the message to the page route with the extra body, not /api/chat", async () => {
    const source = readFileSync(join(process.cwd(), "components/ai/base-chat-interface.tsx"), "utf8")
    expect(source).not.toContain("window.fetch")
    expect(source).not.toContain('url === "/api/chat"')
    expect(source).not.toContain("url === '/api/chat'")

    const calls: Array<{ url: string; body: string }> = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), body: String(init?.body ?? "") })
        return new Response("unavailable", { status: 503, headers: { "content-type": "text/plain" } })
      }),
    )

    const container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root?.render(
        createElement(BaseChatInterface, {
          apiEndpoint: "/api/ai/draft-assistant",
          body: { teamId: "team-1", seasonId: "season-9" },
          title: "",
          showCharacter: false,
          quickActions: [],
        }),
      )
    })

    const textarea = container.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set
    await act(async () => {
      setter?.call(textarea, "Who should I pick?")
      textarea?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const send = container.querySelector("button[aria-label='Send message']")
    expect(send).toBeInstanceOf(HTMLButtonElement)
    await act(async () => {
      send?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    await vi.waitFor(() => {
      expect(calls.length).toBeGreaterThan(0)
    })

    const call = calls[0]
    expect(call?.url).toBe("/api/ai/draft-assistant")
    expect(call?.url).not.toContain("/api/chat")
    const payload = JSON.parse(call?.body ?? "{}") as {
      teamId?: string
      seasonId?: string
      messages?: Array<{ role?: string; parts?: Array<{ type?: string; text?: string }> }>
    }
    expect(payload.teamId).toBe("team-1")
    expect(payload.seasonId).toBe("season-9")
    const text = payload.messages
      ?.flatMap((message) => message.parts ?? [])
      .find((part) => part.type === "text")?.text
    expect(text).toBe("Who should I pick?")
  })
})
