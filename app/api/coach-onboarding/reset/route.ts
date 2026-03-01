import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/coach-onboarding/reset
 * Resets coach onboarding for the authenticated user so they can run it again.
 * Clears coach_onboarding progress and sets profiles.onboarding_completed = false.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error: onboardingError } = await supabase
      .from("coach_onboarding")
      .upsert(
        {
          user_id: user.id,
          current_step: "welcome",
          completed_steps: [],
          completed_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (onboardingError) {
      console.error("[Coach onboarding reset] coach_onboarding:", onboardingError)
      return NextResponse.json(
        { error: onboardingError.message || "Failed to reset onboarding" },
        { status: 500 }
      )
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (profileError) {
      console.error("[Coach onboarding reset] profiles:", profileError)
      return NextResponse.json(
        { error: profileError.message || "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Coach onboarding reset]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
