import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { fetchPublicLadder } from "@/lib/showdown/public-web-api"

/** Read-only proxy for pokemonshowdown.com/ladder/:format.json */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const format = request.nextUrl.searchParams.get("format")?.trim() || "gen9ou"

  try {
    const ladder = await fetchPublicLadder(format)
    return NextResponse.json({
      formatid: ladder.formatid,
      format: ladder.format,
      toplist: (ladder.toplist || []).slice(0, 25),
      note: "Ladder data is observational only — league standings remain app-owned.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load ladder",
      },
      { status: 502 },
    )
  }
}
