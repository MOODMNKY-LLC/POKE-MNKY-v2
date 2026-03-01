import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role so we see the real DB state (same as Team Library page)
    const serviceSupabase = createServiceRoleClient()
    const { data: stockTeams, error: stockTeamsError, count } = await serviceSupabase
      .from("showdown_teams")
      .select("*", { count: "exact" })
      .eq("is_stock", true)
      .is("deleted_at", null)
      .limit(100)

    const { data: allTeams, error: allTeamsError } = await serviceSupabase
      .from("showdown_teams")
      .select("id, team_name, is_stock, deleted_at", { count: "exact" })
      .limit(100)

    const projectHint = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : "(not set)"

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      appDatabase: projectHint,
      stockTeams: {
        data: (stockTeams || []).slice(0, 10),
        count: count ?? 0,
        error: stockTeamsError ? { code: stockTeamsError.code, message: stockTeamsError.message } : null,
      },
      allTeams: {
        count: allTeams?.length ?? 0,
        sample: (allTeams || []).slice(0, 5),
        error: allTeamsError ? { code: allTeamsError.code, message: allTeamsError.message } : null,
      },
    })
  } catch (error: any) {
    console.error("[Debug Stock Teams] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
