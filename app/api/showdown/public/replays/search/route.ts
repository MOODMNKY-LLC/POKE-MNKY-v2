import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { isReplayIngestEnabled } from "@/lib/showdown/replay-ingest-flags"
import {
  publicReplayViewerUrl,
  searchPublicReplays,
} from "@/lib/showdown/public-web-api"

/**
 * Optional discovery assist for public replays.
 * Gated by REPLAY_INGEST_ENABLED (same as paste→preview→confirm).
 * Private / passworded hits are filtered out. Coach must still paste/confirm attach.
 */
export async function GET(request: NextRequest) {
  if (!isReplayIngestEnabled()) {
    return NextResponse.json(
      {
        error: "Replay discovery is disabled until REPLAY_INGEST_ENABLED is approved.",
        code: "REPLAY_INGEST_DISABLED",
      },
      { status: 410 },
    )
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const userName = sp.get("user")?.trim()
  const user2 = sp.get("user2")?.trim()
  const format = sp.get("format")?.trim()
  const beforeRaw = sp.get("before")
  const before = beforeRaw ? Number(beforeRaw) : undefined

  if (!userName && !user2 && !format) {
    return NextResponse.json(
      { error: "Provide at least one of user, user2, or format" },
      { status: 400 },
    )
  }

  try {
    const { hits, hasMore } = await searchPublicReplays({
      user: userName,
      user2,
      format,
      before: Number.isFinite(before) ? before : undefined,
    })

    return NextResponse.json({
      hits: hits.map((hit) => ({
        ...hit,
        url: publicReplayViewerUrl(hit.id),
      })),
      hasMore,
      next_before: hits.length ? hits[hits.length - 1].uploadtime : null,
      note: "Discovery only — attach still requires explicit preview + confirm on a match.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Replay search failed",
      },
      { status: 502 },
    )
  }
}
