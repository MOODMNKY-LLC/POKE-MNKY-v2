import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  fallbackNone,
  resolveNextCountdownFromSeasons,
  type SeasonCountdownRow,
} from "@/lib/league-countdown"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: seasons, error } = await supabase
      .from("seasons")
      .select(
        "id, name, start_date, end_date, draft_open_at, draft_close_at, is_current"
      )
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false })
      .limit(20)

    if (error) {
      console.warn("[next-event] seasons error:", error)
      return NextResponse.json(fallbackNone())
    }

    if (!seasons?.length) {
      return NextResponse.json(fallbackNone())
    }

    const payload = resolveNextCountdownFromSeasons(
      seasons as SeasonCountdownRow[]
    )
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (e) {
    console.error("[next-event]", e)
    return NextResponse.json(fallbackNone())
  }
}
