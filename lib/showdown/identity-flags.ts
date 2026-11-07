/**
 * Showdown identity feature flags (Phase 0).
 *
 * Legacy loginserver auto-registration is fail-closed (default OFF).
 * Central OAuth link requires BOTH an implemented capability and a client id.
 * Setting SHOWDOWN_OAUTH_CLIENT_ID alone must never expose a functional Link
 * control — OAuth routes/UI land in Phase 2.
 *
 * Server-only env names (never NEXT_PUBLIC_*): SHOWDOWN_LEGACY_LOGINSERVER_SYNC,
 * SHOWDOWN_OAUTH_CLIENT_ID. Status endpoint returns booleans/messages only.
 *
 * Does not touch SIM_LEGACY_SIMULATION_WRITES.
 */

import { NextResponse } from "next/server"

type EnvLike = Record<string, string | undefined>

function truthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

/**
 * Hard capability gate: flip only when Phase 2 OAuth start/callback routes and
 * assertion+state verification actually ship. Env alone is insufficient.
 */
export const SHOWDOWN_OAUTH_LINK_IMPLEMENTED = false

/** Explicit opt-in for parallel loginserver register. Default off. */
export function isLegacyLoginserverSyncEnabled(
  env: EnvLike = process.env,
): boolean {
  return truthy(env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC)
}

/** Raw client id if present — never return this to browsers via status API. */
export function getShowdownOauthClientId(
  env: EnvLike = process.env,
): string | null {
  const id = env.SHOWDOWN_OAUTH_CLIENT_ID?.trim()
  return id ? id : null
}

/**
 * True only when OAuth is implemented AND client id is configured.
 * CLIENT_ID without implementation ⇒ unavailable.
 */
export function isShowdownOauthLinkAvailable(
  env: EnvLike = process.env,
): boolean {
  return (
    SHOWDOWN_OAUTH_LINK_IMPLEMENTED && Boolean(getShowdownOauthClientId(env))
  )
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
  "Verified central Showdown account linking is not available yet. " +
  "OAuth link flow has not shipped; configuring a client id alone does not enable linking."

export type ShowdownIdentityStatus = {
  legacy_sync_enabled: boolean
  /** Capability + client id. Never true until Phase 2 implements OAuth. */
  oauth_link_available: boolean
  /** Implementation shipped? Independent of env — for honest UI. */
  oauth_link_implemented: boolean
  oauth_unavailable_reason: string | null
  /** Honest product copy — never claim "linked" via legacy sync alone. */
  team_import_note: string
}

export function getShowdownIdentityStatus(
  env: EnvLike = process.env,
): ShowdownIdentityStatus {
  const oauth = isShowdownOauthLinkAvailable(env)
  let reason: string | null = null
  if (!oauth) {
    if (!SHOWDOWN_OAUTH_LINK_IMPLEMENTED) {
      reason = SHOWDOWN_OAUTH_UNAVAILABLE_MESSAGE
    } else if (!getShowdownOauthClientId(env)) {
      reason =
        "Verified linking requires SHOWDOWN_OAUTH_CLIENT_ID once OAuth is implemented."
    } else {
      reason = SHOWDOWN_OAUTH_UNAVAILABLE_MESSAGE
    }
  }
  return {
    legacy_sync_enabled: isLegacyLoginserverSyncEnabled(env),
    oauth_link_available: oauth,
    oauth_link_implemented: SHOWDOWN_OAUTH_LINK_IMPLEMENTED,
    oauth_unavailable_reason: reason,
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
