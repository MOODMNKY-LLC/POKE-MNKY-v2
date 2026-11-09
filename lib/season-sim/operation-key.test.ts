import { describe, expect, it } from "vitest"
import { domainOperationKey } from "@/lib/season-sim/operation-key"

describe("domainOperationKey", () => {
  it("passthrough when epoch missing or zero", () => {
    expect(domainOperationKey(undefined, "draft_pick:1")).toBe("draft_pick:1")
    expect(domainOperationKey({}, "draft_pick:1")).toBe("draft_pick:1")
    expect(domainOperationKey({ domain_epoch: 0 }, "draft_pick:1")).toBe(
      "draft_pick:1",
    )
  })

  it("prefixes after domain reset epoch bump", () => {
    expect(
      domainOperationKey({ domain_epoch: 2 }, "season_schedule:regular"),
    ).toBe("e2:season_schedule:regular")
  })
})
