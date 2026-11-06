/**
 * Named deterministic PRNG for season-sim foundation.
 * Algorithm: splitmix64 (public domain / permissive literature).
 * Version string must be stored on simulation_runs before first seeded use.
 */

export const SIM_PRNG_ALGORITHM = "splitmix64" as const
export const SIM_PRNG_ALGORITHM_VERSION = "1" as const

export type SimRngSubstream =
  | "config_generation"
  | "draft"
  | "lineup"
  | "statistical_outcomes"
  | "battle_engine"
  | "decision_policy"
  | "foundation"

const SUBSTREAM_SALTS: Record<SimRngSubstream, bigint> = {
  config_generation: 0x91n,
  draft: 0xd2n,
  lineup: 0x37n,
  statistical_outcomes: 0xa5n,
  battle_engine: 0x58n,
  decision_policy: 0xc3n,
  foundation: 0x11n,
}

/** Parse master seed hex (32–64 hex chars) or derive from utf8 string. */
export function parseMasterSeed(input: string): bigint {
  const trimmed = input.trim()
  if (/^[0-9a-fA-F]{16,64}$/.test(trimmed)) {
    return BigInt(`0x${trimmed.slice(0, 16)}`)
  }
  // FNV-1a 64-bit over utf8
  let hash = 0xcbf29ce484222325n
  const bytes = new TextEncoder().encode(trimmed)
  for (const b of bytes) {
    hash ^= BigInt(b)
    hash = BigInt.asUintN(64, hash * 0x100000001b3n)
  }
  return hash === 0n ? 0x9e3779b97f4a7c15n : hash
}

export function generateMasterSeedHex(
  randomBytes: () => Uint8Array = () => {
    const out = new Uint8Array(16)
    crypto.getRandomValues(out)
    return out
  },
): string {
  return Array.from(randomBytes(), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  )
}

function splitmix64(state: bigint): { value: bigint; next: bigint } {
  let z = BigInt.asUintN(64, state + 0x9e3779b97f4a7c15n)
  z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n)
  z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn)
  z = BigInt.asUintN(64, z ^ (z >> 31n))
  return { value: z, next: BigInt.asUintN(64, state + 0x9e3779b97f4a7c15n) }
}

export class SimSplitmix64 {
  private state: bigint

  constructor(seed: bigint) {
    this.state = BigInt.asUintN(64, seed)
  }

  nextUint64(): bigint {
    const { value, next } = splitmix64(this.state)
    this.state = next
    return value
  }

  /** Uniform float in [0, 1). */
  nextFloat(): number {
    const v = this.nextUint64()
    // top 53 bits → IEEE double fraction
    return Number(v >> 11n) / Number(1n << 53n)
  }

  /** Inclusive integer range. */
  nextInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error("Invalid nextInt range")
    }
    const span = max - min + 1
    return min + Number(this.nextUint64() % BigInt(span))
  }

  getState(): string {
    return this.state.toString(16).padStart(16, "0")
  }

  setState(hex: string): void {
    this.state = BigInt(`0x${hex}`)
  }
}

/** Derive a substream PRNG from master seed + counter (no silent reseed). */
export function createSubstreamPrng(
  masterSeed: string | bigint,
  substream: SimRngSubstream,
  counter = 0,
): SimSplitmix64 {
  const master =
    typeof masterSeed === "bigint" ? masterSeed : parseMasterSeed(masterSeed)
  const mixed = BigInt.asUintN(
    64,
    master ^
      (SUBSTREAM_SALTS[substream] << 56n) ^
      BigInt.asUintN(64, BigInt(counter) * 0x9e3779b97f4a7c15n),
  )
  return new SimSplitmix64(mixed)
}

export type RngCounters = Partial<Record<SimRngSubstream, number>>

export function bumpCounter(
  counters: RngCounters,
  substream: SimRngSubstream,
): { next: RngCounters; counter: number } {
  const counter = (counters[substream] ?? 0) + 1
  return { next: { ...counters, [substream]: counter }, counter }
}
