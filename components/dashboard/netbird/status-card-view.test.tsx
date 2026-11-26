import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { deriveStatusCardState, type StatusCardState } from "@/lib/netbird/status-card-state"
import { NetbirdStatusCardView, type StatusCardViewProps } from "./status-card-view"

const noop = () => {}

function render(overrides: Partial<StatusCardViewProps> & { state: StatusCardState }) {
  return renderToStaticMarkup(
    createElement(NetbirdStatusCardView, {
      invite: { status: "loading" },
      deliveredViaDiscord: false,
      busy: false,
      error: null,
      onRequest: noop,
      onRetry: noop,
      ...overrides,
    }),
  )
}

describe("deriveStatusCardState", () => {
  const NOW = Date.parse("2026-11-26T12:00:00Z")
  const request = (status: string, invite_expires_at: string | null = null) => ({ status, invite_expires_at }) as never

  it("the switch being OFF always wins", () => {
    expect(deriveStatusCardState({ enabled: false, request: request("invited"), now: NOW })).toBe("paused")
    expect(deriveStatusCardState({ enabled: false, request: null, now: NOW })).toBe("paused")
  })

  it("maps each status", () => {
    const state = (status: string, expires: string | null = null) =>
      deriveStatusCardState({ enabled: true, request: request(status, expires), now: NOW })
    expect(deriveStatusCardState({ enabled: true, request: null, now: NOW })).toBe("none")
    expect(state("cancelled")).toBe("none")
    expect(state("pending")).toBe("pending")
    expect(state("approved")).toBe("approved")
    expect(state("invited", "2026-11-29T12:00:00Z")).toBe("invited")
    expect(state("invited", "2026-11-25T12:00:00Z")).toBe("expired")
    expect(state("failed")).toBe("failed")
    expect(state("expired")).toBe("expired")
    expect(state("denied")).toBe("blocked")
    expect(state("revoked")).toBe("blocked")
  })

  it("reports an unavailable lookup", () => {
    expect(deriveStatusCardState({ enabled: true, request: null, unavailable: true, now: NOW })).toBe("unavailable")
  })
})

describe("NetbirdStatusCardView", () => {
  it("paused: message and no button", () => {
    const html = render({ state: "paused" })
    expect(html).toContain("Battle network sign-up is paused right now. Check back soon.")
    expect(html).not.toContain("<button")
  })

  it("none: explains the rule and offers Get battle access", () => {
    const html = render({ state: "none" })
    expect(html).toContain("Get battle access")
    expect(html).toContain("Current league coaches get in right away")
  })

  it("pending: waiting message, no button", () => {
    const html = render({ state: "pending" })
    expect(html).toContain("Waiting for a league admin to approve you.")
    expect(html).not.toContain("<button")
  })

  it("invited: shows the link, expiry, copy button and Discord note", () => {
    const html = render({
      state: "invited",
      invite: { status: "ready", url: "https://battle.example.test/join/abc", expiresAt: "2026-11-29T15:00:00Z" },
      deliveredViaDiscord: true,
    })
    expect(html).toContain("https://battle.example.test/join/abc")
    expect(html).toContain("Nov 29, 2026")
    expect(html).toContain("Copy")
    expect(html).toContain("We also sent this to your Discord DMs.")
  })

  it("invited: omits the Discord note when it was not delivered there", () => {
    const html = render({
      state: "invited",
      invite: { status: "ready", url: "https://battle.example.test/join/abc", expiresAt: "2026-11-29T15:00:00Z" },
    })
    expect(html).not.toContain("Discord DMs.")
  })

  it("invited: falls back to a message when no link is stored", () => {
    const html = render({ state: "invited", invite: { status: "missing" } })
    expect(html).toContain("Check your Discord DMs and your email")
  })

  it.each([
    ["failed", "Your invite didn&#x27;t go through."],
    ["expired", "Your invite expired."],
  ] as const)("%s: message and Try again", (state, text) => {
    const html = render({ state })
    expect(html).toContain(text)
    expect(html).toContain("Try again")
  })

  it("blocked: contact an admin, no button", () => {
    const html = render({ state: "blocked" })
    expect(html).toContain("Contact a league admin.")
    expect(html).not.toContain("<button")
  })

  it("shows errors as an alert", () => {
    expect(render({ state: "none", error: "Too many tries" })).toContain('role="alert"')
  })
})
