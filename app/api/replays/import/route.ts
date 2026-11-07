import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { replayIngestDeniedResponse } from "@/lib/showdown/replay-ingest-flags"
import {
  archiveOfficialPublicReplay,
  assertCallerOwnsMatchSide,
  linkArchiveToMatch,
} from "@/lib/showdown/replay-archive"
import { checkReplayRateLimit } from "@/lib/showdown/replay-rate-limit"

/**
 * Confirm-import a public official replay into league_replay_archives and
 * optionally attach to a match the caller participates in.
 * Does not write standings / MVP / pokemon_stats.
 */
export async function POST(request: NextRequest) {
  const denied = replayIngestDeniedResponse()
  if (denied) return denied

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = checkReplayRateLimit(`import:${user.id}`)
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    )
  }

  let body: { url?: string; match_id?: string; confirm?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      {
        error: "confirm:true is required to archive (preview first)",
        code: "CONFIRM_REQUIRED",
      },
      { status: 400 },
    )
  }

  if (!body.match_id || typeof body.match_id !== "string") {
    return NextResponse.json(
      { error: "match_id is required", code: "MATCH_ID_REQUIRED" },
      { status: 400 },
    )
  }

  const ownership = await assertCallerOwnsMatchSide(
    supabase,
    user.id,
    body.match_id,
  )
  if (!ownership.ok) {
    return NextResponse.json(
      { error: ownership.error, code: ownership.code },
      { status: ownership.status },
    )
  }

  const service = createServiceRoleClient()
  const archived = await archiveOfficialPublicReplay(service, {
    userId: user.id,
    rawUrl: body.url || "",
    seasonId: ownership.ownership.seasonId,
    aclOwnerTeamId: ownership.ownership.callerTeamId,
  })

  if (!archived.ok) {
    return NextResponse.json(
      { error: archived.error, code: archived.code },
      { status: archived.status && archived.status >= 400 ? archived.status : 400 },
    )
  }

  const linked = await linkArchiveToMatch(service, {
    userId: user.id,
    matchId: body.match_id,
    archiveId: archived.archiveId,
    ownership: ownership.ownership,
  })

  if (!linked.ok) {
    // Do not return archive_id on ACL failure — avoids leaking foreign archives.
    return NextResponse.json(
      { error: linked.error, code: linked.code },
      { status: linked.status },
    )
  }

  return NextResponse.json({
    archive_id: archived.archiveId,
    parse_run_id: archived.parseRunId,
    link_id: linked.linkId,
    deduped: archived.deduped,
    source_id: archived.source_id,
    observation: archived.observation,
    message:
      "Archived public replay and attached to match. Observed facts only — standings unchanged.",
  })
}
