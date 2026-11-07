/**
 * Named deterministic PRNG for season-sim foundation.
 * Algorithm: splitmix64 (public domain / permissive literature).
 * Version string must be stored on simulation_runs before first seeded use.
 *
 * Uses BigInt() constructors (not bigint literals) so tsc target ES6/Next build succeeds.
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

const U64 = BigInt("0xFFFFFFFFFFFFFFFF")
const GOLDEN = BigInt("0x9e3779b97f4a7c15")
const SM_A = BigInt("0xbf58476d1ce4e5b9")
const SM_B = BigInt("0x94d049bb133111eb")
const FNV_OFFSET = BigInt("0xcbf29ce484222325")
const FNV_PRIME = BigInt("0x100000001b3")

const SUBSTREAM_SALTS: Record<SimRngSubstream, bigint> = {
  config_generation: BigInt(0x91),
  draft: BigInt(0xd2),
  lineup: BigInt(0x37),
  statistical_outcomes: BigInt(0xa5),
  battle_engine: BigInt(0x58),
  decision_policy: BigInt(0xc3),
  foundation: BigInt(0x11),
}

function asU64(n: bigint): bigint {
  return n & U64
}

/** Parse master seed hex (32–64 hex chars) or derive from utf8 string. */
export function parseMasterSeed(input: string): bigint {
  const trimmed = input.trim()
  if (/^[0-9a-fA-F]{16,64}$/.test(trimmed)) {
    return BigInt(`0x${trimmed.slice(0, 16)}`)
  }
  // FNV-1a 64-bit over utf8
  let hash = FNV_OFFSET
  const bytes = new TextEncoder().encode(trimmed)
  for (const b of bytes) {
    hash ^= BigInt(b)
    hash = asU64(hash * FNV_PRIME)
  }
  return hash === BigInt(0) ? GOLDEN : hash
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
  let z = asU64(state + GOLDEN)
  z = asU64((z ^ (z >> BigInt(30))) * SM_A)
  z = asU64((z ^ (z >> BigInt(27))) * SM_B)
  z = asU64(z ^ (z >> BigInt(31)))
  return { value: z, next: asU64(state + GOLDEN) }
}

export class SimSplitmix64 {
  private state: bigint

  constructor(seed: bigint) {
    this.state = asU64(seed)
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
    return Number(v >> BigInt(11)) / Number(BigInt(1) << BigInt(53))
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
  const mixed = asU64(
    master ^
      (SUBSTREAM_SALTS[substream] << BigInt(56)) ^
      asU64(BigInt(counter) * GOLDEN),
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
