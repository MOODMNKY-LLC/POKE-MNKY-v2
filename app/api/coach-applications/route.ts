import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { hasAnyRole } from "@/lib/rbac"
import { UserRole } from "@/lib/rbac"

const postSchema = z.object({
  team_name: z.string().min(2).max(120),
  age: z.number().int().min(13).max(120),
  is_age_21_plus: z.boolean(),
  liability_acknowledged: z.literal(true),
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

    const ok = await hasAnyRole(supabase, user.id, [UserRole.ADMIN, UserRole.COMMISSIONER])
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let q = supabase
      .from("coach_applications")
      .select("*")
      .order("created_at", { ascending: false })

    if (status && status !== "all") {
      q = q.eq("status", status)
    }
    // status=all or omitted → no filter

    const { data, error } = await q
    if (error) {
      console.error("[coach-applications GET]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ applications: data ?? [] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("discord_username, username")
      .eq("id", user.id)
      .single()

    const discordUsername = profile?.discord_username ?? profile?.username ?? null

    const { data: existing } = await supabase
      .from("coach_applications")
      .select("id, status")
      .eq("applicant_id", user.id)
      .maybeSingle()

    if (existing && existing.status !== "pending" && existing.status !== "hold" && existing.status !== "follow_up") {
      return NextResponse.json(
        { error: "You already have a processed application. Contact staff if you need a new review." },
        { status: 409 }
      )
    }

    const payload = {
      applicant_id: user.id,
      team_name: parsed.data.team_name.trim(),
      age: parsed.data.age,
      is_age_21_plus: parsed.data.is_age_21_plus,
      liability_acknowledged: parsed.data.liability_acknowledged,
      discord_username: discordUsername,
      status: "pending" as const,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { data: updated, error } = await supabase
        .from("coach_applications")
        .update({
          team_name: payload.team_name,
          age: payload.age,
          is_age_21_plus: payload.is_age_21_plus,
          liability_acknowledged: payload.liability_acknowledged,
          discord_username: discordUsername,
          status: "pending",
          updated_at: payload.updated_at,
        })
        .eq("id", existing.id)
        .eq("applicant_id", user.id)
        .select()
        .single()

      if (error) {
        console.error("[coach-applications POST update]", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ application: updated })
    }

    const { data: created, error } = await supabase.from("coach_applications").insert(payload).select().single()

    if (error) {
      console.error("[coach-applications POST insert]", error)
      if (error.code === "23505") {
        return NextResponse.json({ error: "Application already exists." }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ application: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    )
  }
}
