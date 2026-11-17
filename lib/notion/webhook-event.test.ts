import { describe, expect, it } from "vitest"
import {
  checkWebhookTimestamp,
  isAllowedNotionEventType,
  isAllowedNotionSource,
  normalizeNotionId,
  resolveNotionEventSourceId,
} from "./webhook-event"

const DB = "5e58ccd73ceb44ed83de826b51cf5c36"
const DS_DASHED = "7efba35e-03ef-4597-82ad-1c38e47bd06b"
const DS = "7efba35e03ef459782ad1c38e47bd06b"

describe("normalizeNotionId", () => {
  it("lowercases, strips collection:// and dashes", () => {
    expect(normalizeNotionId(`collection://${DS_DASHED.toUpperCase()}`)).toBe(DS)
    expect(normalizeNotionId(` ${DS_DASHED} `)).toBe(DS)
  })
})

describe("resolveNotionEventSourceId", () => {
  it("prefers data.parent.id", () => {
    expect(
      resolveNotionEventSourceId({
        data: { parent: { id: DB, data_source_id: DS_DASHED }, database_id: "x" },
        entity: { id: "e" },
        database_id: "y",
      }),
    ).toBe(DB)
  })

  it("then data.parent.data_source_id, entity.id, data.database_id, database_id", () => {
    expect(resolveNotionEventSourceId({ data: { parent: { data_source_id: DS_DASHED } }, entity: { id: "e" } })).toBe(DS)
    expect(resolveNotionEventSourceId({ data: { parent: {} }, entity: { id: DS_DASHED }, database_id: "y" })).toBe(DS)
    expect(resolveNotionEventSourceId({ data: { database_id: DB }, database_id: "y" })).toBe(DB)
    expect(resolveNotionEventSourceId({ database_id: DB })).toBe(DB)
  })

  it("skips empty strings and returns null when nothing is present", () => {
    expect(resolveNotionEventSourceId({ data: { parent: { id: "  " } }, entity: { id: DB } })).toBe(DB)
    expect(resolveNotionEventSourceId({})).toBeNull()
  })
})

describe("isAllowedNotionSource", () => {
  it("allows only the draft board database and data source", () => {
    expect(isAllowedNotionSource(DB)).toBe(true)
    expect(isAllowedNotionSource(DS)).toBe(true)
    expect(isAllowedNotionSource("other")).toBe(false)
    expect(isAllowedNotionSource(null)).toBe(false)
  })
})

describe("isAllowedNotionEventType", () => {
  it("allows the four event types only", () => {
    for (const t of ["database.content_updated", "data_source.content_updated", "page.properties_updated", "page.created"]) {
      expect(isAllowedNotionEventType(t)).toBe(true)
    }
    expect(isAllowedNotionEventType("page.deleted")).toBe(false)
    expect(isAllowedNotionEventType(undefined)).toBe(false)
  })
})

describe("checkWebhookTimestamp", () => {
  const now = Date.parse("2026-11-17T12:00:00.000Z")
  const at = (deltaMs: number) => new Date(now + deltaMs).toISOString()

  it("accepts within +/- 5 minutes", () => {
    expect(checkWebhookTimestamp(at(0), now)).toEqual({ ok: true })
    expect(checkWebhookTimestamp(at(-5 * 60 * 1000), now)).toEqual({ ok: true })
    expect(checkWebhookTimestamp(at(5 * 60 * 1000), now)).toEqual({ ok: true })
  })

  it("rejects missing, invalid, too old and future timestamps", () => {
    expect(checkWebhookTimestamp(undefined, now)).toEqual({ ok: false, reason: "missing" })
    expect(checkWebhookTimestamp(null, now)).toEqual({ ok: false, reason: "missing" })
    expect(checkWebhookTimestamp("", now)).toEqual({ ok: false, reason: "missing" })
    expect(checkWebhookTimestamp("nope", now)).toEqual({ ok: false, reason: "invalid" })
    expect(checkWebhookTimestamp(123, now)).toEqual({ ok: false, reason: "invalid" })
    expect(checkWebhookTimestamp(at(-5 * 60 * 1000 - 1), now)).toEqual({ ok: false, reason: "too_old" })
    expect(checkWebhookTimestamp(at(5 * 60 * 1000 + 1), now)).toEqual({ ok: false, reason: "in_future" })
  })
})
