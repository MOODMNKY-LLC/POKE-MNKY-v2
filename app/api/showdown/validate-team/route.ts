import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { validateShowdownTeamForCoach } from "@/lib/showdown/validate-team-core"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const team_text =
      typeof body.team_text === "string" ? body.team_text : ""
    const season_id =
      typeof body.season_id === "string" ? body.season_id : null
    const team_id = typeof body.team_id === "string" ? body.team_id : null
    const check =
      body.check === "parse" || body.check === "roster" ? body.check : "roster"

    // Service role for coach/team/roster joins; authorization is user session above
    // plus ownership checks inside validateShowdownTeamForCoach.
    const serviceSupabase = createServiceRoleClient()
    const result = await validateShowdownTeamForCoach(
      serviceSupabase,
      user.id,
      { team_text, season_id, team_id, check },
    )

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          valid: false,
          parse_ok: result.parse_ok ?? false,
          roster_checked: false,
          roster_valid: null,
          fully_validated: false,
          errors: result.errors ?? [result.error],
        },
        { status: result.status },
      )
    }

    return NextResponse.json({
      // Backward-compatible: `valid` means fully roster-validated when roster
      // was requested; parse-only never sets valid true.
      valid: result.fully_validated,
      parse_ok: result.parse_ok,
      roster_checked: result.roster_checked,
      roster_valid: result.roster_valid,
      fully_validated: result.fully_validated,
      errors: result.errors,
      season_id: result.season_id,
      team_id: result.team_id,
      coach_id: result.coach_id,
      roster_size: result.roster_size,
      team: {
        pokemon: result.parsed.pokemon,
        count: result.parsed.pokemon.length,
      },
      canonical_text: result.parsed.canonicalText,
      metadata: result.parsed.metadata,
      message: result.fully_validated
        ? "Team passed parse and roster checks"
        : result.roster_checked
          ? "Parsed OK; roster validation failed"
          : "Parsed OK; roster not checked",
    })
  } catch (error) {
    console.error("[Showdown] Validate team error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        valid: false,
        fully_validated: false,
      },
      { status: 500 },
    )
  }
}
