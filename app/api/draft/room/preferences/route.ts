import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const patchSchema = z.object({
  season_id: z.string().uuid(),
  shortlist: z.array(z.string()).max(200).optional(),
  notes: z.string().max(8000).optional().nullable(),
  mock_draft_config: z.record(z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const seasonId = request.nextUrl.searchParams.get("season_id")
    if (!seasonId) {
      return NextResponse.json({ error: "season_id required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("draft_coach_preferences")
      .select("*")
      .eq("season_id", seasonId)
      .eq("profile_id", user.id)
      .maybeSingle()

    if (error) {
      console.error("[draft room preferences GET]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferences: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { season_id, shortlist, notes, mock_draft_config } = parsed.data

    const row = {
      season_id,
      profile_id: user.id,
      shortlist: shortlist ?? [],
      notes: notes ?? null,
      mock_draft_config: mock_draft_config ?? {},
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("draft_coach_preferences")
      .upsert(row, { onConflict: "season_id,profile_id" })
      .select()
      .single()

    if (error) {
      console.error("[draft room preferences PATCH]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferences: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}
