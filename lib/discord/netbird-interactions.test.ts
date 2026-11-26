import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  resolveLeagueAdminAccess: vi.fn(),
  requestAccess: vi.fn(),
  retryInvite: vi.fn(),
  approveRequest: vi.fn(),
  denyRequest: vi.fn(),
  enabled: true,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({ rpc: mocks.rpc }),
}))
vi.mock("@/lib/admin-api-auth", () => ({ resolveLeagueAdminAccess: mocks.resolveLeagueAdminAccess }))
vi.mock("@/lib/netbird/automation", () => ({
  ONBOARDING_PAUSED_MESSAGE: "Battle network sign-up is paused right now. Check back soon.",
  isOnboardingEnabled: () => mocks.enabled,
  getAdminDiscordIds: () =>
    (process.env.NETBIRD_ADMIN_DISCORD_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  retryInvite: mocks.retryInvite,
  approveRequest: mocks.approveRequest,
  denyRequest: mocks.denyRequest,
}))

import type { InteractionPayload } from "@/lib/discord/interactions-handler"
import { handleJoinBattles, handleNetbirdComponent } from "./netbird-interactions"

const GUILD = "111111111111111111"
const ADMIN_DISCORD = "2".repeat(18)
const MEMBER_DISCORD = "3".repeat(18)
const REQUEST_ID = "9b2f6c1e-1c43-4a8e-9a55-3f0f2f0a1b11"
const APP_URL = "https://app.example.test"

function command(overrides: Partial<InteractionPayload> = {}): InteractionPayload {
  return {
    type: 2,
    application_id: "444444444444444444",
    token: "interaction-token",
    guild_id: GUILD,
    member: { user: { id: MEMBER_DISCORD, username: "ash" } },
    data: { id: "1", name: "join-battles" },
    ...overrides,
  } as InteractionPayload
}

function click(action: "approve" | "deny", overrides: Partial<InteractionPayload> = {}): InteractionPayload {
  return {
    type: 3,
    application_id: "444444444444444444",
    token: "interaction-token",
    user: { id: ADMIN_DISCORD, username: "simeon" },
    data: { id: "1", name: "", custom_id: `nbreq:${action}:${REQUEST_ID}`, component_type: 2 },
    ...overrides,
  } as InteractionPayload
}

function memberRequest(status: string) {
  return { id: REQUEST_ID, status, display_name: "Ash", discord_username: "ash" }
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubEnv("DISCORD_LEAGUE_GUILD_ID", GUILD)
  vi.stubEnv("NETBIRD_ADMIN_DISCORD_IDS", ADMIN_DISCORD)
  mocks.enabled = true
  mocks.rpc.mockReset().mockResolvedValue({ data: "user-1", error: null })
  mocks.resolveLeagueAdminAccess.mockReset().mockResolvedValue({ allowed: true, userId: "user-1", role: "admin" })
  mocks.requestAccess.mockReset()
  mocks.retryInvite.mockReset()
  mocks.approveRequest.mockReset()
  mocks.denyRequest.mockReset()
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

async function finishJoin(payload: InteractionPayload) {
  const result = handleJoinBattles(payload, APP_URL)
  await result.followUp?.()
  const patch = fetchMock.mock.calls[0]
  return { result, patch, content: patch ? (JSON.parse(patch[1].body) as { content: string }).content : null }
}

describe("/join-battles", () => {
  it("refuses other guilds and DMs with an ephemeral message and no work", async () => {
    for (const payload of [command({ guild_id: "999" }), command({ guild_id: undefined })]) {
      const result = handleJoinBattles(payload, APP_URL)
      expect(result.followUp).toBeUndefined()
      expect(result.response).toMatchObject({
        type: 4,
        data: { content: "This command only works in the league server.", flags: 64 },
      })
    }
    expect(mocks.retryInvite).not.toHaveBeenCalled()
  })

  it("refuses everyone when the league guild is not configured", () => {
    vi.stubEnv("DISCORD_LEAGUE_GUILD_ID", "")
    const result = handleJoinBattles(command(), APP_URL)
    expect(result.response).toMatchObject({ type: 4, data: { flags: 64 } })
  })

  it("defers ephemerally and edits the original response through the interaction webhook", async () => {
    mocks.retryInvite.mockResolvedValue({ ok: true, created: true, request: memberRequest("pending") })
    const { result, patch } = await finishJoin(command())
    expect(result.response).toEqual({ type: 5, data: { flags: 64 } })
    expect(patch[0]).toBe("https://discord.com/api/v10/webhooks/444444444444444444/interaction-token/messages/@original")
    expect(patch[1].method).toBe("PATCH")
    expect(patch[1].headers.authorization).toBeUndefined()
  })

  it("tells people without a linked account how to sign in", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null })
    const { content } = await finishJoin(command())
    expect(content).toBe(
      `Sign in to POKE MNKY with Discord once at ${APP_URL}/auth/login, then run /join-battles again.`,
    )
    expect(mocks.retryInvite).not.toHaveBeenCalled()
  })

  it("coach path: confirms access and never includes an invite link", async () => {
    mocks.retryInvite.mockResolvedValue({ ok: true, created: true, request: memberRequest("invited") })
    const { content } = await finishJoin(command())
    expect(mocks.retryInvite).toHaveBeenCalledWith({ userId: "user-1", source: "discord", discordId: MEMBER_DISCORD })
    expect(content).toContain("You're in! Check your DMs for your invite link and setup steps")
    expect(content).not.toMatch(/invite_url|netbird\.io|\/join\//)
  })

  it("pending path: says the request is with a league admin", async () => {
    mocks.retryInvite.mockResolvedValue({ ok: true, created: true, request: memberRequest("pending") })
    const { content } = await finishJoin(command())
    expect(content).toBe("Your request is with a league admin. You'll get a DM when it's approved.")
  })

  it("paused path: says it is paused and does not look anyone up", async () => {
    mocks.enabled = false
    const { content } = await finishJoin(command())
    expect(content).toBe("Battle network sign-up is paused right now. Check back soon.")
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.retryInvite).not.toHaveBeenCalled()
  })

  it("rate limited path: passes the try-again-later message through", async () => {
    mocks.retryInvite.mockResolvedValue({ ok: false, code: "rate_limited", message: "Too many tries. Try again later." })
    const { content } = await finishJoin(command())
    expect(content).toBe("Too many tries. Try again later.")
  })

  it("already invited path: points to DMs and the app page", async () => {
    mocks.retryInvite.mockResolvedValue({ ok: true, created: false, request: memberRequest("invited") })
    const { content } = await finishJoin(command())
    expect(content).toContain("Check your DMs")
    expect(content).toContain(`${APP_URL}/dashboard/guides/netbird`)
  })

  it("replies with a generic message if something throws", async () => {
    mocks.retryInvite.mockRejectedValue(new Error("database exploded with secret-value"))
    const { content } = await finishJoin(command())
    expect(content).toBe("Something went wrong on our side. Please try again later.")
  })
})

describe("admin buttons", () => {
  it("ignores custom ids that are not NetBird buttons", async () => {
    const payload = click("approve", { data: { id: "1", name: "", custom_id: "other:thing" } })
    expect(await handleNetbirdComponent(payload)).toBeNull()
  })

  it("rejects a clicker who is not in the admin id list", async () => {
    const result = await handleNetbirdComponent(click("approve", { user: { id: MEMBER_DISCORD, username: "ash" } }))
    expect(result?.response).toMatchObject({ type: 4, data: { flags: 64 } })
    expect(result?.followUp).toBeUndefined()
    expect(mocks.approveRequest).not.toHaveBeenCalled()
  })

  it("rejects a listed clicker who is not an admin in the app", async () => {
    mocks.resolveLeagueAdminAccess.mockResolvedValue({ allowed: false, error: "Forbidden", status: 403 })
    const result = await handleNetbirdComponent(click("approve"))
    expect(result?.response).toMatchObject({ type: 4, data: { flags: 64 } })
    expect(mocks.approveRequest).not.toHaveBeenCalled()
    expect(mocks.denyRequest).not.toHaveBeenCalled()
  })

  it("rejects a listed clicker with no linked app account", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null })
    const result = await handleNetbirdComponent(click("deny"))
    expect(result?.response).toMatchObject({ type: 4, data: { flags: 64 } })
    expect(mocks.denyRequest).not.toHaveBeenCalled()
  })

  it("rejects clicks from a server that is not the league server", async () => {
    const result = await handleNetbirdComponent(click("approve", { guild_id: "999" }))
    expect(result?.response).toMatchObject({ type: 4, data: { flags: 64 } })
    expect(mocks.approveRequest).not.toHaveBeenCalled()
  })

  it("accepts an approve from a listed admin in a DM, then updates the message without buttons", async () => {
    mocks.approveRequest.mockResolvedValue({ ok: true, request: memberRequest("invited") })
    const result = await handleNetbirdComponent(click("approve"))
    expect(result?.response).toEqual({ type: 6 })
    await result?.followUp?.()
    expect(mocks.approveRequest).toHaveBeenCalledWith(REQUEST_ID, "user-1")
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.components).toEqual([])
    expect(body.content).toContain("Approved Ash")
  })

  it("approve while onboarding is paused says no invite was sent yet", async () => {
    mocks.approveRequest.mockResolvedValue({ ok: true, request: memberRequest("approved"), paused: true })
    const result = await handleNetbirdComponent(click("approve", { guild_id: GUILD, member: { user: { id: ADMIN_DISCORD, username: "simeon" } } }))
    await result?.followUp?.()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).content).toContain("no invite was sent yet")
  })

  it("accepts a deny from a listed admin and replaces the message with the result", async () => {
    mocks.denyRequest.mockResolvedValue({ ok: true, request: memberRequest("denied") })
    const result = await handleNetbirdComponent(click("deny"))
    expect(mocks.denyRequest).toHaveBeenCalledWith(REQUEST_ID, "user-1")
    expect(result?.response).toMatchObject({ type: 7, data: { components: [] } })
    expect((result?.response as { data: { content: string } }).data.content).toContain("Denied the request from Ash")
  })

  it("shows 'already handled' when the request has moved on", async () => {
    mocks.denyRequest.mockResolvedValue({ ok: false, code: "invalid_state", message: "nope" })
    const result = await handleNetbirdComponent(click("deny"))
    expect((result?.response as { data: { content: string } }).data.content).toBe("This request has already been handled.")
  })
})
