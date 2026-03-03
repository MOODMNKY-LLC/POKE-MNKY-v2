/**
 * GET /api/admin/league-config/sections
 * List rules and draft_settings sections from league_config for Create Draft wizard
 * Admin/commissioner only
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const configTypes = searchParams.get("types") || "rules,draft_settings"

    const types = configTypes.split(",").map((t) => t.trim())

    const { data: sections, error } = await supabase
      .from("league_config")
      .select("id, config_type, section_title, section_type")
      .in("config_type", types)
      .order("config_type", { ascending: true })
      .order("section_title", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sections: sections || [],
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
