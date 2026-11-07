/**
 * Showdown identity feature flags (Phase 0).
 *
 * Legacy loginserver auto-registration is fail-closed (default OFF).
 * Central OAuth link is unavailable until SHOWDOWN_OAUTH_CLIENT_ID is set
 * (Phase 2) — do not present legacy sync as a verified Main-account link.
 *
 * Does not touch SIM_LEGACY_SIMULATION_WRITES.
 */

import { NextResponse } from "next/server"

type EnvLike = Record<string, string | undefined>

function truthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

/** Explicit opt-in for parallel loginserver register. Default off. */
export function isLegacyLoginserverSyncEnabled(
  env: EnvLike = process.env,
): boolean {
  return truthy(env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC)
}

/** Central PS OAuth client id present (Phase 2). Phase 0 always treats missing as unavailable. */
export function getShowdownOauthClientId(
  env: EnvLike = process.env,
): string | null {
  const id = env.SHOWDOWN_OAUTH_CLIENT_ID?.trim()
  return id ? id : null
}

export function isShowdownOauthLinkAvailable(
  env: EnvLike = process.env,
): boolean {
  return Boolean(getShowdownOauthClientId(env))
}

export const LEGACY_SHOWDOWN_SYNC_DISABLED_CODE =
  "LEGACY_SHOWDOWN_SYNC_DISABLED" as const

export const LEGACY_SHOWDOWN_SYNC_DISABLED_MESSAGE =
  "Legacy Showdown loginserver auto-registration is disabled. " +
  "It does not verify ownership of a central Pokémon Showdown account or import teams. " +
  "Paste or upload team exports instead. " +
  "Set SHOWDOWN_LEGACY_LOGINSERVER_SYNC=true only with explicit coordinator approval."

export const SHOWDOWN_OAUTH_UNAVAILABLE_CODE =
  "SHOWDOWN_OAUTH_UNAVAILABLE" as const

export const SHOWDOWN_OAUTH_UNAVAILABLE_MESSAGE =
  "Verified central Showdown account linking is not available yet (OAuth client not configured)."

export type ShowdownIdentityStatus = {
  legacy_sync_enabled: boolean
  oauth_link_available: boolean
  oauth_unavailable_reason: string | null
  /** Honest product copy for clients — never claim "linked" via legacy sync alone. */
  team_import_note: string
}

export function getShowdownIdentityStatus(
  env: EnvLike = process.env,
): ShowdownIdentityStatus {
  const oauth = isShowdownOauthLinkAvailable(env)
  return {
    legacy_sync_enabled: isLegacyLoginserverSyncEnabled(env),
    oauth_link_available: oauth,
    oauth_unavailable_reason: oauth ? null : SHOWDOWN_OAUTH_UNAVAILABLE_MESSAGE,
    team_import_note:
      "Teams are added by pasting or uploading a Showdown export. Cloud account team sync is not supported.",
  }
}

/** HTTP fail-closed for legacy register routes. Null when explicitly enabled. */
export function legacyShowdownSyncDeniedResponse(
  env: EnvLike = process.env,
): NextResponse | null {
  if (isLegacyLoginserverSyncEnabled(env)) return null
  return NextResponse.json(
    {
      error: LEGACY_SHOWDOWN_SYNC_DISABLED_MESSAGE,
      code: LEGACY_SHOWDOWN_SYNC_DISABLED_CODE,
      identity: getShowdownIdentityStatus(env),
    },
    { status: 410 },
  )
}
