/**
 * Phase 1 public-replay ingest gate. Default OFF.
 * When disabled, API routes must not fetch remote replays or write archives.
 */

import { NextResponse } from "next/server"

type EnvLike = Record<string, string | undefined>

function truthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

export function isReplayIngestEnabled(env: EnvLike = process.env): boolean {
  return truthy(env.REPLAY_INGEST_ENABLED)
}

export const REPLAY_INGEST_DISABLED_CODE = "REPLAY_INGEST_DISABLED" as const

export const REPLAY_INGEST_DISABLED_MESSAGE =
  "Public Showdown replay archive ingest is disabled. " +
  "Set REPLAY_INGEST_ENABLED=true only after coordinator approval."

export function replayIngestDeniedResponse(
  env: EnvLike = process.env,
): NextResponse | null {
  if (isReplayIngestEnabled(env)) return null
  return NextResponse.json(
    {
      error: REPLAY_INGEST_DISABLED_MESSAGE,
      code: REPLAY_INGEST_DISABLED_CODE,
    },
    { status: 410 },
  )
}
