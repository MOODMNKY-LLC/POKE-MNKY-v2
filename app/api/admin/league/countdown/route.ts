/**
 * Admin: homepage countdown / draft schedule
 *
 * GET  — list seasons with draft times + resolved homepage preview
 * PATCH — set draft_open_at (and optional draft_close_at) from Chicago local date/time
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { hasAnyRole, UserRole } from "@/lib/rbac"
import {
  HOMEPAGE_COUNTDOWN_TIMEZONE,
  resolveNextCountdownFromSeasons,
  season7DraftUtcIso,
  splitUtcIsoToChicagoLocal,
  zonedLocalToUtcIso,
  type SeasonCountdownRow,
} from "@/lib/league-countdown"

const patchSchema = z.object({
  season_id: z.string().uuid(),
  draft_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  draft_time: z.string().regex(/^\d{2}:\d{2}$/),
  draft_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  draft_close_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  clear_draft_close: z.boolean().optional(),
})

async function requireLeagueAdmin(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const allowed = await hasAnyRole(supabase, user.id, [
    UserRole.ADMIN,
    UserRole.COMMISSIONER,
  ])
  if (!allowed) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user }
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const auth = await requireLeagueAdmin(supabase)
    if ("error" in auth && auth.error) return auth.error

    const { data: seasons, error } = await supabase
      .from("seasons")
      .select(
        "id, name, season_id, is_current, start_date, end_date, draft_open_at, draft_close_at"
      )
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Failed to load seasons", details: error.message },
        { status: 500 }
      )
    }

    const rows = (seasons ?? []) as (SeasonCountdownRow & {
      season_id: string | null
    })[]
    const homepagePreview = resolveNextCountdownFromSeasons(rows)

    const seasonsWithLocal = rows.map((s) => {
      const draftLocal = s.draft_open_at
        ? splitUtcIsoToChicagoLocal(s.draft_open_at)
        : null
      const closeLocal = s.draft_close_at
        ? splitUtcIsoToChicagoLocal(s.draft_close_at)
        : null
      return {
        ...s,
        draft_local: draftLocal,
        draft_close_local: closeLocal,
      }
    })

    return NextResponse.json({
      timezone: HOMEPAGE_COUNTDOWN_TIMEZONE,
      homepagePreview,
      seasons: seasonsWithLocal,
      season7Defaults: {
        draft_date: "2026-08-15",
        draft_time: "14:00",
        draft_open_at_utc: season7DraftUtcIso(),
      },
    })
  } catch (e) {
    console.error("[admin/league/countdown GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const auth = await requireLeagueAdmin(supabase)
    if ("error" in auth && auth.error) return auth.error

    const body = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      season_id,
      draft_date,
      draft_time,
      draft_close_date,
      draft_close_time,
      clear_draft_close,
    } = parsed.data

    let draft_open_at: string
    try {
      draft_open_at = zonedLocalToUtcIso(draft_date, draft_time)
    } catch {
      return NextResponse.json({ error: "Invalid draft date or time" }, { status: 400 })
    }

    let draft_close_at: string | null = null
    if (clear_draft_close) {
      draft_close_at = null
    } else if (draft_close_date && draft_close_time) {
      try {
        draft_close_at = zonedLocalToUtcIso(draft_close_date, draft_close_time)
      } catch {
        return NextResponse.json(
          { error: "Invalid draft close date or time" },
          { status: 400 }
        )
      }
      if (new Date(draft_close_at).getTime() <= new Date(draft_open_at).getTime()) {
        return NextResponse.json(
          { error: "Draft close must be after draft open" },
          { status: 400 }
        )
      }
    }

    const update: {
      draft_open_at: string
      draft_close_at?: string | null
      updated_at: string
    } = {
      draft_open_at,
      updated_at: new Date().toISOString(),
    }
    if (clear_draft_close || (draft_close_date && draft_close_time)) {
      update.draft_close_at = draft_close_at
    }

    const { data, error } = await supabase
      .from("seasons")
      .update(update)
      .eq("id", season_id)
      .select("id, name, draft_open_at, draft_close_at, is_current")
      .single()

    if (error) {
      return NextResponse.json(
        { error: "Failed to update season", details: error.message },
        { status: 500 }
      )
    }

    const { data: allSeasons } = await supabase
      .from("seasons")
      .select(
        "id, name, start_date, end_date, draft_open_at, draft_close_at, is_current"
      )
      .order("is_current", { ascending: false })
      .limit(20)

    const homepagePreview = resolveNextCountdownFromSeasons(
      (allSeasons ?? []) as SeasonCountdownRow[]
    )

    return NextResponse.json({
      season: data,
      draft_open_at,
      draft_close_at: update.draft_close_at ?? data?.draft_close_at ?? null,
      draft_local: splitUtcIsoToChicagoLocal(draft_open_at),
      homepagePreview,
    })
  } catch (e) {
    console.error("[admin/league/countdown PATCH]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
