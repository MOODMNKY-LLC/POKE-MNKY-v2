import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { FreeAgencySystem } from "@/lib/free-agency"
import { getCurrentUserProfile } from "@/lib/rbac"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const profile = await getCurrentUserProfile(supabase)
    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 })
    }

    const body = await request.json()
    const { team_id, season_id, transaction_type, added_pokemon_id, dropped_pokemon_id } = body

    // Validate required fields
    if (!team_id || !season_id || !transaction_type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: team_id, season_id, transaction_type" },
        { status: 400 }
      )
    }

    // Verify user is coach of this team
    const { data: team } = await supabase
      .from("teams")
      .select("coach_id, coaches!inner(user_id)")
      .eq("id", team_id)
      .single()

    if (!team || (team.coaches as any).user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "You are not the coach of this team" },
        { status: 403 }
      )
    }

    // Validate transaction type
    if (!["replacement", "addition", "drop_only"].includes(transaction_type)) {
      return NextResponse.json(
        { success: false, error: "Invalid transaction_type" },
        { status: 400 }
      )
    }

    // Validate transaction type requirements
    if (transaction_type === "replacement" && (!added_pokemon_id || !dropped_pokemon_id)) {
      return NextResponse.json(
        { success: false, error: "Replacement requires both added_pokemon_id and dropped_pokemon_id" },
        { status: 400 }
      )
    }

    if (transaction_type === "addition" && !added_pokemon_id) {
      return NextResponse.json(
        { success: false, error: "Addition requires added_pokemon_id" },
        { status: 400 }
      )
    }

    if (transaction_type === "drop_only" && !dropped_pokemon_id) {
      return NextResponse.json(
        { success: false, error: "Drop only requires dropped_pokemon_id" },
        { status: 400 }
      )
    }

    // Submit transaction
    const freeAgency = new FreeAgencySystem()
    const result = await freeAgency.submitTransaction(
      team_id,
      season_id,
      transaction_type,
      added_pokemon_id || null,
      dropped_pokemon_id || null,
      user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, validation: result.validation },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      validation: result.validation,
    })
  } catch (error: any) {
    console.error("Free agency submit error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
