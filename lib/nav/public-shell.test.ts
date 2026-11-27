import { describe, expect, it } from "vitest"
import { shouldHidePublicChrome } from "./public-shell"

describe("shouldHidePublicChrome", () => {
  it("hides on dashboard and admin trees", () => {
    expect(shouldHidePublicChrome("/dashboard")).toBe(true)
    expect(shouldHidePublicChrome("/dashboard/teams")).toBe(true)
    expect(shouldHidePublicChrome("/admin")).toBe(true)
    expect(shouldHidePublicChrome("/admin/netbird-requests")).toBe(true)
  })

  it("shows on public routes", () => {
    expect(shouldHidePublicChrome("/")).toBe(false)
    expect(shouldHidePublicChrome("/standings")).toBe(false)
    expect(shouldHidePublicChrome("/auth/login")).toBe(false)
    expect(shouldHidePublicChrome("/demo/season-sim")).toBe(false)
  })
})
