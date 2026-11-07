import { describe, expect, it } from "vitest"
import {
  isReplayIngestEnabled,
  replayIngestDeniedResponse,
  REPLAY_INGEST_DISABLED_CODE,
} from "./replay-ingest-flags"

describe("replay ingest flags", () => {
  it("defaults off", () => {
    expect(isReplayIngestEnabled({})).toBe(false)
  })

  it("returns 410 when disabled", async () => {
    const res = replayIngestDeniedResponse({})
    expect(res?.status).toBe(410)
    const body = await res!.json()
    expect(body.code).toBe(REPLAY_INGEST_DISABLED_CODE)
  })

  it("allows when enabled", () => {
    expect(
      replayIngestDeniedResponse({ REPLAY_INGEST_ENABLED: "true" }),
    ).toBeNull()
  })
})
