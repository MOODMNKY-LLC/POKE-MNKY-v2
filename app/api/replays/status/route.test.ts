import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { GET } from "./route"

describe("GET /api/replays/status", () => {
  const prev = process.env.REPLAY_INGEST_ENABLED

  beforeEach(() => {
    delete process.env.REPLAY_INGEST_ENABLED
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.REPLAY_INGEST_ENABLED
    else process.env.REPLAY_INGEST_ENABLED = prev
  })

  it("reports disabled by default without secrets", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.enabled).toBe(false)
    expect(JSON.stringify(body)).not.toMatch(/REPLAY_INGEST_ENABLED/)
    expect(JSON.stringify(body)).not.toMatch(/SERVICE_ROLE/)
  })
})
