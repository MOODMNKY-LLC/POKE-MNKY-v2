import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { completeMatchResult } from "@/lib/match-result-complete"
import { matchSubmitBodySchema } from "@/lib/validation/match-submit"
import {
  getLiveSheetSyncWriteGate,
  SheetSyncWriteBlockedError,
} from "@/lib/sheet-sync-write-gate"

export async function GET() {
  const supabase = await createServerClient()
  const gate = await getLiveSheetSyncWriteGate(supabase)
  return NextResponse.json(gate)
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = matchSubmitBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await completeMatchResult(parsed.data, user.id, supabase)

    return NextResponse.json({
      status: "success",
      ...result,
      message: "Match result recorded successfully",
      warnings: result.discord_error
        ? { discord: result.discord_error }
        : undefined,
    })
  } catch (error) {
    console.error("[matches/submit]", error)
    if (error instanceof SheetSyncWriteBlockedError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message =
      error instanceof Error ? error.message : "Failed to submit match"
    const status = message.includes("not authorized") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
