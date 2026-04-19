import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { NextEventPayload } from "@/lib/homepage-types"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: seasons, error } = await supabase
      .from("seasons")
      .select("id, name, start_date, end_date, is_current")
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false })
      .limit(5)

    if (error) {
      console.warn("[next-event] seasons error:", error)
      return NextResponse.json(fallbackNone())
    }

    const current =
      seasons?.find((s) => s.is_current) ?? seasons?.[0] ?? null

    if (!current) {
      return NextResponse.json(fallbackNone())
    }

    const now = new Date()
    const start = current.start_date ? new Date(`${current.start_date}T00:00:00.000Z`) : null
    const end = current.end_date ? new Date(`${current.end_date}T23:59:59.999Z`) : null

    if (start && start > now) {
      const payload: NextEventPayload = {
        kind: "season_start",
        label: "Next season kickoff",
        targetIso: start.toISOString(),
        seasonName: current.name,
      }
      return NextResponse.json(payload)
    }

    if (end && end > now) {
      const payload: NextEventPayload = {
        kind: "season_end",
        label: "Season finale",
        targetIso: end.toISOString(),
        seasonName: current.name,
      }
      return NextResponse.json(payload)
    }

    return NextResponse.json({
      kind: "none",
      label: "Off-season — stay tuned for the next draft",
      targetIso: null,
      seasonName: current.name,
    } satisfies NextEventPayload)
  } catch (e) {
    console.error("[next-event]", e)
    return NextResponse.json(fallbackNone())
  }
}

function fallbackNone(): NextEventPayload {
  return {
    kind: "none",
    label: "League calendar",
    targetIso: null,
    seasonName: null,
  }
}
