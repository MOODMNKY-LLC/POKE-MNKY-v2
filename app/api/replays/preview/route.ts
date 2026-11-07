import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { replayIngestDeniedResponse } from "@/lib/showdown/replay-ingest-flags"
import { previewOfficialPublicReplay } from "@/lib/showdown/replay-archive"
import { checkReplayRateLimit } from "@/lib/showdown/replay-rate-limit"

/**
 * Preview a public official Showdown replay (no DB write).
 * Requires auth; gated by REPLAY_INGEST_ENABLED.
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

  const limited = checkReplayRateLimit(`preview:${user.id}`)
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    )
  }

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const result = await previewOfficialPublicReplay(body.url || "")
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status && result.status >= 400 ? result.status : 400 },
    )
  }

  return NextResponse.json({
    source_id: result.source_id,
    source_url: result.source_url,
    format: result.format,
    players: result.players,
    visibility: result.visibility,
    content_hash: result.content_hash,
    observation: result.observation,
  })
}
