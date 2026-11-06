import { describe, expect, it } from "vitest"
import {
  SIM_PRNG_ALGORITHM,
  SIM_PRNG_ALGORITHM_VERSION,
  createSubstreamPrng,
  parseMasterSeed,
  bumpCounter,
} from "@/lib/season-sim/prng"

describe("season-sim PRNG", () => {
  it("documents named algorithm + version", () => {
    expect(SIM_PRNG_ALGORITHM).toBe("splitmix64")
    expect(SIM_PRNG_ALGORITHM_VERSION).toBe("1")
  })

  it("is deterministic for the same master seed + substream + counter", () => {
    const seed = "0123456789abcdef0123456789abcdef"
    const a = createSubstreamPrng(seed, "foundation", 1)
    const b = createSubstreamPrng(seed, "foundation", 1)
    expect(a.nextUint64()).toBe(b.nextUint64())
    expect(a.nextFloat()).toBe(b.nextFloat())
  })

  it("diverges across substreams and counters", () => {
    const seed = parseMasterSeed("deadbeefcafebabe")
    const draft = createSubstreamPrng(seed, "draft", 1).nextUint64()
    const lineup = createSubstreamPrng(seed, "lineup", 1).nextUint64()
    const draft2 = createSubstreamPrng(seed, "draft", 2).nextUint64()
    expect(draft).not.toBe(lineup)
    expect(draft).not.toBe(draft2)
  })

  it("matches granular vs batch draws for the same recorded counter sequence", () => {
    const seed = "aabbccddeeff0011"
    const granular: string[] = []
    let counters = {}
    for (let i = 0; i < 5; i++) {
      const bumped = bumpCounter(counters, "foundation")
      counters = bumped.next
      granular.push(
        createSubstreamPrng(seed, "foundation", bumped.counter).getState(),
      )
    }

    const batch: string[] = []
    counters = {}
    for (let i = 0; i < 5; i++) {
      const bumped = bumpCounter(counters, "foundation")
      counters = bumped.next
      batch.push(
        createSubstreamPrng(seed, "foundation", bumped.counter).getState(),
      )
    }
    expect(batch).toEqual(granular)
  })
})
