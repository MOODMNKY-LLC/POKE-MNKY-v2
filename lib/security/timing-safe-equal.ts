import { timingSafeEqual } from "node:crypto"

/**
 * Constant-time string equality for secrets.
 * Returns false when either side is empty (fail closed).
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8")
  const right = Buffer.from(b, "utf8")
  if (left.length === 0 || right.length === 0) return false
  if (left.length !== right.length) {
    // Still compare to a copy of left to reduce length-oracle timing skew.
    timingSafeEqual(left, Buffer.alloc(left.length, 0))
    return false
  }
  return timingSafeEqual(left, right)
}
