/**
 * Pure helpers for Notion webhook events: source allowlist, event allowlist, replay window.
 */

/** Draft Board database (legacy id used in `database_id`). */
export const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"
/** Draft Board data source (Notion API 2025+ parent.data_source_id / entity.id). */
export const DRAFT_BOARD_DATA_SOURCE_ID = "7efba35e-03ef-4597-82ad-1c38e47bd06b"

export const ALLOWED_NOTION_SOURCE_IDS: ReadonlySet<string> = new Set([
  normalizeNotionId(DRAFT_BOARD_DATABASE_ID),
  normalizeNotionId(DRAFT_BOARD_DATA_SOURCE_ID),
])

export const ALLOWED_NOTION_EVENT_TYPES: ReadonlySet<string> = new Set([
  "database.content_updated",
  "data_source.content_updated",
  "page.properties_updated",
  "page.created",
])

/** Events older (or further in the future) than this are rejected as replays. */
export const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

/** Lowercase, strip `collection://`, strip dashes and whitespace. */
export function normalizeNotionId(raw: string): string {
  return raw.trim().toLowerCase().replace(/^collection:\/\//, "").replace(/-/g, "")
}

export interface NotionEventSourceFields {
  entity?: { id?: string | null } | null
  data?: {
    parent?: { id?: string | null; data_source_id?: string | null } | null
    database_id?: string | null
  } | null
  database_id?: string | null
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim() !== "") return v
  }
  return null
}

/**
 * Source id order: data.parent.id, data.parent.data_source_id, entity.id, then the
 * legacy data.database_id / database_id. Returned normalized, or null when absent.
 */
export function resolveNotionEventSourceId(event: NotionEventSourceFields): string | null {
  const raw = firstNonEmpty(
    event.data?.parent?.id,
    event.data?.parent?.data_source_id,
    event.entity?.id,
    event.data?.database_id,
    event.database_id,
  )
  return raw === null ? null : normalizeNotionId(raw)
}

export function isAllowedNotionSource(normalizedId: string | null): boolean {
  return normalizedId !== null && ALLOWED_NOTION_SOURCE_IDS.has(normalizedId)
}

export function isAllowedNotionEventType(type: unknown): type is string {
  return typeof type === "string" && ALLOWED_NOTION_EVENT_TYPES.has(type)
}

export type TimestampCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "too_old" | "in_future" }

/** Rejects a missing/unparseable timestamp or one outside +/- 5 minutes of `now`. */
export function checkWebhookTimestamp(
  timestamp: unknown,
  now: number = Date.now(),
  toleranceMs: number = WEBHOOK_TIMESTAMP_TOLERANCE_MS,
): TimestampCheck {
  if (timestamp === undefined || timestamp === null || timestamp === "") {
    return { ok: false, reason: "missing" }
  }
  if (typeof timestamp !== "string") return { ok: false, reason: "invalid" }
  const ms = Date.parse(timestamp)
  if (Number.isNaN(ms)) return { ok: false, reason: "invalid" }
  if (now - ms > toleranceMs) return { ok: false, reason: "too_old" }
  if (ms - now > toleranceMs) return { ok: false, reason: "in_future" }
  return { ok: true }
}
