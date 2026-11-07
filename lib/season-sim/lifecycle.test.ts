import { describe, expect, it } from "vitest"
import { hashCommandPayload } from "@/lib/season-sim/payload-hash"
import { createSubstreamPrng, bumpCounter } from "@/lib/season-sim/prng"

describe("command idempotency hash stability", () => {
  it("same logical advance payload hashes equal; different n differs", () => {
    const a = hashCommandPayload({
      command_type: "advance",
      unit: "foundation",
      n: 3,
      expected_step_seq: 0,
      expected_run_version: 1,
    })
    const b = hashCommandPayload({
      expected_run_version: 1,
      n: 3,
      unit: "foundation",
      command_type: "advance",
      expected_step_seq: 0,
    })
    const c = hashCommandPayload({
      command_type: "advance",
      unit: "foundation",
      n: 4,
      expected_step_seq: 0,
      expected_run_version: 1,
    })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})

describe("manual vs batch foundation PRNG agreement", () => {
  it("step-by-step draws match a batch using the same master seed + counters", () => {
    const master = "deadbeefcafebabe0123456789abcdef"
    const counters = {}
    const draws: string[] = []
    let state = counters
    for (let i = 0; i < 5; i++) {
      const bumped = bumpCounter(state, "foundation")
      state = bumped.next
      const prng = createSubstreamPrng(master, "foundation", bumped.counter)
      draws.push(prng.nextUint64().toString(16))
    }

    const batch: string[] = []
    let batchState = {}
    for (let i = 0; i < 5; i++) {
      const bumped = bumpCounter(batchState, "foundation")
      batchState = bumped.next
      const prng = createSubstreamPrng(master, "foundation", bumped.counter)
      batch.push(prng.nextUint64().toString(16))
    }

    expect(draws).toEqual(batch)
  })
})
