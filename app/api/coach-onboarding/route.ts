/**
 * Coach onboarding progress: GET current state, PATCH to update step.
 * Uses Supabase; Notion can be used elsewhere to supply guide content.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type OnboardingStep =
  | "welcome"
  | "register_as_coach"
  | "link_team"
  | "team_builder_intro"
  | "complete"

const STEPS: OnboardingStep[] = [
  "welcome",
  "register_as_coach",
  "link_team",
  "team_builder_intro",
  "complete",
]

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("coach_onboarding")
    .select("current_step, completed_steps, completed_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    current_step: data?.current_step ?? "welcome",
    completed_steps: (data?.completed_steps as string[]) ?? [],
    completed_at: data?.completed_at ?? null,
    updated_at: data?.updated_at ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const step = body?.step as string | undefined
  const markComplete = body?.mark_complete === true

  if (!step || !STEPS.includes(step as OnboardingStep)) {
    return NextResponse.json(
      { error: "Invalid step. Use one of: " + STEPS.join(", ") },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from("coach_onboarding")
    .select("completed_steps")
    .eq("user_id", user.id)
    .maybeSingle()

  const completedList = (existing?.completed_steps as string[]) ?? []
  const nextCompleted = completedList.includes(step)
    ? completedList
    : [...completedList, step]
  const completedAt = markComplete || step === "complete" ? new Date().toISOString() : null

  const { data: updated, error } = await supabase
    .from("coach_onboarding")
    .upsert(
      {
        user_id: user.id,
        current_step: step,
        completed_steps: nextCompleted,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("current_step, completed_steps, completed_at, updated_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    current_step: updated.current_step,
    completed_steps: updated.completed_steps,
    completed_at: updated.completed_at,
    updated_at: updated.updated_at,
  })
}
