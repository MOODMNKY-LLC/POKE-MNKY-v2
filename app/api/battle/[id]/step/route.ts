import { NextResponse } from "next/server"
import { getBattleRequest, applyChoice } from "@/lib/battle-engine"
import { selectBattleMove } from "@/lib/openai-client"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const battleId = params.id
    const body = await request.json()
    const { choice: manualChoice, use_ai } = body

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current battle request
    const currentRequest = await getBattleRequest(battleId)

    let choice = manualChoice

    // If AI should choose, use OpenAI
    if (use_ai && !manualChoice) {
      const aiChoice = await selectBattleMove({
        battle_id: battleId,
        turn: currentRequest.turn,
        active_pokemon: currentRequest.active_pokemon,
        legal_actions: currentRequest.legal_actions,
        state_summary: currentRequest.state_summary,
      })

      choice = aiChoice.choice

      // Log AI reasoning
      await supabase.from("battle_events").insert({
        battle_id: battleId,
        turn: currentRequest.turn,
        event_type: "commentary",
        payload: { reasoning: aiChoice.reasoning_short },
      })
    }

    // Apply choice to battle
    await applyChoice(battleId, choice)

    // Get updated state
    const updatedRequest = await getBattleRequest(battleId)

    return NextResponse.json({
      battle_id: battleId,
      turn: updatedRequest.turn,
      applied_choice: choice,
      state: updatedRequest.state_summary,
    })
  } catch (error) {
    console.error("[v0] Battle step error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Battle step failed" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const battleId = params.id
    const battleRequest = await getBattleRequest(battleId)

    return NextResponse.json(battleRequest)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get battle state" },
      { status: 500 },
    )
  }
}
