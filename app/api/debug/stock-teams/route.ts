import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to fetch stock teams
    const { data: stockTeams, error: stockTeamsError, count } = await supabase
      .from("showdown_teams")
      .select("*", { count: "exact" })
      .eq("is_stock", true)
      .is("deleted_at", null)

    // Also try without RLS to see total count
    const { data: allTeams, error: allTeamsError } = await supabase
      .from("showdown_teams")
      .select("id, team_name, is_stock, deleted_at", { count: "exact" })
      .limit(100)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      stockTeams: {
        data: stockTeams || [],
        count: count || 0,
        error: stockTeamsError ? {
          code: stockTeamsError.code,
          message: stockTeamsError.message,
          details: stockTeamsError.details,
        } : null,
      },
      allTeams: {
        count: allTeams?.length || 0,
        sample: allTeams?.slice(0, 5) || [],
        error: allTeamsError ? {
          code: allTeamsError.code,
          message: allTeamsError.message,
        } : null,
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
