import nacl from "tweetnacl"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  afterCalls: [] as (() => Promise<void>)[],
}))

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => Promise<void>) => {
    state.afterCalls.push(fn)
  },
}))

const handlers = vi.hoisted(() => ({
  handleJoinBattles: vi.fn(),
  handleNetbirdComponent: vi.fn(),
  handleApplicationCommand: vi.fn(),
}))

vi.mock("@/lib/discord/netbird-interactions", () => ({
  JOIN_BATTLES_COMMAND: "join-battles",
  COMPONENT_PREFIX: "nbreq:",
  handleJoinBattles: handlers.handleJoinBattles,
  handleNetbirdComponent: handlers.handleNetbirdComponent,
}))
vi.mock("@/lib/discord/interactions-handler", () => ({
  handleApplicationCommand: handlers.handleApplicationCommand,
}))

import { POST } from "./route"

const keys = nacl.sign.keyPair()
const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex")

function signedRequest(body: unknown, options: { tamper?: boolean; omit?: boolean } = {}): NextRequest {
  const raw = JSON.stringify(body)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signed = nacl.sign.detached(new TextEncoder().encode(timestamp + raw), keys.secretKey)
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (!options.omit) {
    headers["x-signature-ed25519"] = toHex(signed)
    headers["x-signature-timestamp"] = timestamp
  }
  return new NextRequest("https://app.example.test/api/discord/interactions", {
    method: "POST",
    headers,
    body: options.tamper ? raw.replace("join-battles", "join-battlez") : raw,
  })
}

const joinCommand = { type: 2, guild_id: "1", data: { id: "1", name: "join-battles" } }

beforeEach(() => {
  vi.stubEnv("DISCORD_PUBLIC_KEY", toHex(keys.publicKey))
  state.afterCalls.length = 0
  handlers.handleJoinBattles.mockReset()
  handlers.handleNetbirdComponent.mockReset()
  handlers.handleApplicationCommand.mockReset()
})

describe("POST /api/discord/interactions", () => {
  it("rejects a missing signature with 401 and runs no handler", async () => {
    const response = await POST(signedRequest(joinCommand, { omit: true }))
    expect(response.status).toBe(401)
    expect(handlers.handleJoinBattles).not.toHaveBeenCalled()
  })

  it("rejects a body that was changed after signing with 401", async () => {
    const response = await POST(signedRequest(joinCommand, { tamper: true }))
    expect(response.status).toBe(401)
    expect(handlers.handleJoinBattles).not.toHaveBeenCalled()
  })

  it("rejects a button click with a bad signature with 401", async () => {
    const response = await POST(signedRequest({ type: 3, data: { custom_id: "nbreq:approve:x" } }, { omit: true }))
    expect(response.status).toBe(401)
    expect(handlers.handleNetbirdComponent).not.toHaveBeenCalled()
  })

  it("still answers a signed ping", async () => {
    const response = await POST(signedRequest({ type: 1 }))
    expect(await response.json()).toEqual({ type: 1 })
  })

  it("routes /join-battles and schedules the follow-up with after()", async () => {
    const followUp = vi.fn(async () => {})
    handlers.handleJoinBattles.mockReturnValue({ response: { type: 5, data: { flags: 64 } }, followUp })
    const response = await POST(signedRequest(joinCommand))
    expect(await response.json()).toEqual({ type: 5, data: { flags: 64 } })
    expect(state.afterCalls).toEqual([followUp])
    expect(handlers.handleApplicationCommand).not.toHaveBeenCalled()
  })

  it("routes NetBird button clicks to the component handler", async () => {
    handlers.handleNetbirdComponent.mockResolvedValue({ response: { type: 7, data: { content: "done", components: [] } } })
    const response = await POST(signedRequest({ type: 3, data: { id: "1", name: "", custom_id: "nbreq:deny:abc" } }))
    expect(response.status).toBe(200)
    expect((await response.json()).type).toBe(7)
    expect(state.afterCalls).toHaveLength(0)
  })
})
