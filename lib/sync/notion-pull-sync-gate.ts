/**
 * Fail-closed gate for Notion -> Supabase pull sync (draft board, pokemon, etc.).
 *
 * The app is the source of truth for the draft board. Default OFF. Set
 * NOTION_PULL_SYNC_ENABLED=true only to deliberately re-enable pulling from Notion.
 *
 * This gate covers the pull direction only. The app -> Notion pick push
 * (lib/sync/push-draft-state-to-notion.ts) is intentionally NOT gated here.
 */

import { NextResponse } from "next/server"

type EnvLike = Record<string, string | undefined>

function truthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

/** Re-enables Notion -> Supabase pull sync. Default off - fail closed. */
export function isNotionPullSyncEnabled(env: EnvLike = process.env): boolean {
  return truthy(env.NOTION_PULL_SYNC_ENABLED)
}

export const NOTION_PULL_SYNC_DISABLED_CODE = "NOTION_PULL_SYNC_DISABLED" as const

export const NOTION_PULL_SYNC_DISABLED_MESSAGE =
  "Notion -> app pull sync is disabled. The app is the source of truth for the draft board. " +
  "Set NOTION_PULL_SYNC_ENABLED=true only to deliberately re-enable it."

export class NotionPullSyncDisabledError extends Error {
  readonly code = NOTION_PULL_SYNC_DISABLED_CODE

  constructor(message = NOTION_PULL_SYNC_DISABLED_MESSAGE) {
    super(message)
    this.name = "NotionPullSyncDisabledError"
  }
}

/**
 * HTTP fail-closed for route handlers. Call before auth, body parsing, or any
 * DB / service-role work. Returns null when pull sync is explicitly enabled.
 */
export function notionPullSyncDeniedResponse(
  env: EnvLike = process.env,
): NextResponse | null {
  if (isNotionPullSyncEnabled(env)) return null
  return NextResponse.json(
    {
      error: NOTION_PULL_SYNC_DISABLED_MESSAGE,
      code: NOTION_PULL_SYNC_DISABLED_CODE,
    },
    { status: 410 },
  )
}

/** Worker / script fail-closed before any client construction or DB write. */
export function assertNotionPullSyncAllowed(env: EnvLike = process.env): void {
  if (!isNotionPullSyncEnabled(env)) {
    throw new NotionPullSyncDisabledError()
  }
}
