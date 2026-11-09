import { describe, expect, it } from "vitest"
import {
  filterAdminSeasonPickerRows,
  labelSandboxSeasonName,
  preferredCompetitiveSeasonId,
} from "@/lib/season-sim/admin-season-list"

describe("admin season list helpers", () => {
  const rows = [
    { id: "live", name: "Season 7", is_current: false, sheet_sync_enabled: true },
    {
      id: "sbx",
      name: "Sandbox",
      is_current: false,
      is_sandbox: true,
      sheet_sync_enabled: false,
    },
    { id: "draft", name: "Season 8", is_current: true, sheet_sync_enabled: false },
  ]

  it("excludes sandboxes from competitive pickers by default", () => {
    expect(filterAdminSeasonPickerRows(rows).map((r) => r.id)).toEqual([
      "live",
      "draft",
    ])
    expect(preferredCompetitiveSeasonId(rows)).toBe("live")
  })

  it("can include sandboxes when explicitly labeled for inventory", () => {
    expect(filterAdminSeasonPickerRows(rows, { includeSandbox: true })).toHaveLength(
      3,
    )
    expect(labelSandboxSeasonName("Sandbox Sim", true)).toContain("[SANDBOX]")
  })
})
