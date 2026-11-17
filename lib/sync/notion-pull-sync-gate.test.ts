import { describe, expect, it } from "vitest"
import {
  NOTION_PULL_SYNC_DISABLED_CODE,
  NotionPullSyncDisabledError,
  assertNotionPullSyncAllowed,
  isNotionPullSyncEnabled,
  notionPullSyncDeniedResponse,
} from "./notion-pull-sync-gate"

describe("isNotionPullSyncEnabled", () => {
  it("defaults to off", () => {
    expect(isNotionPullSyncEnabled({})).toBe(false)
  })

  it.each(["", "   ", "false", "0", "no", "off", "enabled", "2"])("is off for %j", (value) => {
    expect(isNotionPullSyncEnabled({ NOTION_PULL_SYNC_ENABLED: value })).toBe(false)
  })

  it.each(["true", "1", "yes", "on", "TRUE", "Yes", " On ", "  1  "])("is on for %j", (value) => {
    expect(isNotionPullSyncEnabled({ NOTION_PULL_SYNC_ENABLED: value })).toBe(true)
  })
})

describe("notionPullSyncDeniedResponse", () => {
  it("returns 410 with the disabled code when off", async () => {
    const res = notionPullSyncDeniedResponse({})
    expect(res).not.toBeNull()
    expect(res!.status).toBe(410)
    const body = await res!.json()
    expect(body.code).toBe(NOTION_PULL_SYNC_DISABLED_CODE)
    expect(body.code).toBe("NOTION_PULL_SYNC_DISABLED")
    expect(typeof body.error).toBe("string")
    expect(body.error.length).toBeGreaterThan(0)
  })

  it("returns null when enabled", () => {
    expect(notionPullSyncDeniedResponse({ NOTION_PULL_SYNC_ENABLED: "true" })).toBeNull()
  })
})

describe("assertNotionPullSyncAllowed", () => {
  it("throws a typed error when off", () => {
    expect(() => assertNotionPullSyncAllowed({})).toThrow(NotionPullSyncDisabledError)
    try {
      assertNotionPullSyncAllowed({})
    } catch (err) {
      expect((err as NotionPullSyncDisabledError).code).toBe(NOTION_PULL_SYNC_DISABLED_CODE)
    }
  })

  it("does not throw when enabled", () => {
    expect(() => assertNotionPullSyncAllowed({ NOTION_PULL_SYNC_ENABLED: "1" })).not.toThrow()
  })
})
