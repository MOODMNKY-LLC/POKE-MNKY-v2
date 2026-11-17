import { describe, expect, it } from "vitest"
import { draftPoolAccessView } from "@/lib/draft-pool-builder/access-view"

const editor = { userId: "u1", isEditor: true, isAdmin: false }

describe("draftPoolAccessView", () => {
  it("is loading while the check is in flight, even if stale data or error exist", () => {
    expect(draftPoolAccessView({ access: undefined, error: undefined, loading: true })).toBe("loading")
    expect(draftPoolAccessView({ access: editor, error: new Error("x"), loading: true })).toBe("loading")
  })

  it("is loading when nothing has been fetched yet", () => {
    expect(draftPoolAccessView({ access: undefined, error: undefined, loading: false })).toBe("loading")
  })

  it("never reports a failed check as forbidden", () => {
    expect(draftPoolAccessView({ access: undefined, error: new Error("boom"), loading: false })).toBe("error")
    expect(draftPoolAccessView({ access: { ...editor, isEditor: false }, error: new Error("boom"), loading: false })).toBe("error")
  })

  it("asks signed-out users to sign in", () => {
    expect(draftPoolAccessView({ access: null, error: undefined, loading: false })).toBe("signed-out")
  })

  it("is forbidden only after a successful check that says not an editor", () => {
    expect(draftPoolAccessView({ access: { ...editor, isEditor: false }, error: undefined, loading: false })).toBe("forbidden")
  })

  it("is ok for editors and admins", () => {
    expect(draftPoolAccessView({ access: editor, error: undefined, loading: false })).toBe("ok")
    expect(draftPoolAccessView({ access: { ...editor, isAdmin: true }, error: undefined, loading: false })).toBe("ok")
  })
})
