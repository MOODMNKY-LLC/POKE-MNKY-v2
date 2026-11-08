import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "u1" } } }),
    },
  })),
}))

vi.mock("@/lib/showdown/replay-archive", () => ({
  previewOfficialPublicReplay: vi.fn(async () => ({
    ok: true,
    source_id: "gen8doublesubers-1097585496",
    source_url: "https://replay.pokemonshowdown.com/gen8doublesubers-1097585496",
    format: "test",
    players: ["a", "b"],
    visibility: "public",
    content_hash: "abc",
    observation: { winner: "p1", disclaimers: [] },
  })),
}))

import { POST } from "./route"
import { previewOfficialPublicReplay } from "@/lib/showdown/replay-archive"

describe("POST /api/replays/preview", () => {
  const prev = process.env.REPLAY_INGEST_ENABLED

  beforeEach(() => {
    delete process.env.REPLAY_INGEST_ENABLED
    vi.mocked(previewOfficialPublicReplay).mockClear()
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.REPLAY_INGEST_ENABLED
    else process.env.REPLAY_INGEST_ENABLED = prev
  })

  it("does not fetch when ingest disabled", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/replays/preview", {
        method: "POST",
        body: JSON.stringify({ url: "https://replay.pokemonshowdown.com/x" }),
      }),
    )
    expect(res.status).toBe(410)
    expect(previewOfficialPublicReplay).not.toHaveBeenCalled()
  })

  it("previews when enabled", async () => {
    process.env.REPLAY_INGEST_ENABLED = "true"
    const res = await POST(
      new NextRequest("http://localhost/api/replays/preview", {
        method: "POST",
        body: JSON.stringify({
          url: "https://replay.pokemonshowdown.com/gen8doublesubers-1097585496",
        }),
      }),
    )
    expect(res.status).toBe(200)
    expect(previewOfficialPublicReplay).toHaveBeenCalled()
  })
})
