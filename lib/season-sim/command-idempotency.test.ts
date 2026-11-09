import { describe, expect, it } from "vitest"
import { hashCommandPayload } from "@/lib/season-sim/payload-hash"

/**
 * Pure idempotency contract tests (no DB).
 * Same command_id + same hash → replay; same id + different hash → conflict.
 */
describe("command idempotency contract", () => {
  it("treats identical canonical payloads as the same hash", () => {
    const payload = {
      command_type: "advance",
      unit: "foundation",
      n: 3,
      expected_step_seq: 0,
      expected_run_version: 1,
    }
    expect(hashCommandPayload(payload)).toBe(hashCommandPayload({ ...payload }))
  })

  it("detects changed payload under the same command_id scenario", () => {
    const base = {
      command_type: "advance",
      unit: "foundation",
      n: 1,
      expected_step_seq: 0,
      expected_run_version: 1,
    }
    const changed = { ...base, n: 2 }
    expect(hashCommandPayload(base)).not.toBe(hashCommandPayload(changed))
  })

  it("includes expected cursor/version in the hash so stale cursor is a different payload", () => {
    const a = hashCommandPayload({
      command_type: "advance",
      unit: "foundation",
      n: 1,
      expected_step_seq: 0,
      expected_run_version: 1,
    })
    const b = hashCommandPayload({
      command_type: "advance",
      unit: "foundation",
      n: 1,
      expected_step_seq: 5,
      expected_run_version: 1,
    })
    expect(a).not.toBe(b)
  })
})
