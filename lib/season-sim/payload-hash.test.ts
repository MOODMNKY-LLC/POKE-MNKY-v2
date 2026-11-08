import { describe, expect, it } from "vitest"
import { hashCommandPayload } from "@/lib/season-sim/payload-hash"

describe("hashCommandPayload", () => {
  it("is stable under key reordering", () => {
    const a = hashCommandPayload({ b: 1, a: 2, nested: { y: 1, x: 2 } })
    const b = hashCommandPayload({ a: 2, nested: { x: 2, y: 1 }, b: 1 })
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it("changes when payload changes", () => {
    const a = hashCommandPayload({ command_type: "advance", n: 1 })
    const b = hashCommandPayload({ command_type: "advance", n: 2 })
    expect(a).not.toBe(b)
  })
})
