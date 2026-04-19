import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const bodySchema = z.object({
  mode: z.enum(["spectator", "participant"]),
})

type Ctx = { params: Promise<{ id: string }> }

/** POST — set how user joins this draft session (spectator vs participant). */
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { id: sessionId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single()
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("draft_session_attendance")
      .upsert(
        {
          draft_session_id: sessionId,
          profile_id: user.id,
          mode: parsed.data.mode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "draft_session_id,profile_id" }
      )
      .select()
      .single()

    if (error) {
      console.error("[draft attendance]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ attendance: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}
