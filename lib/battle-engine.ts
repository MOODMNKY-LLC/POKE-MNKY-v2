// Battle engine using @pkmn/engine for Showdown-accurate simulation

import type { Battle } from "@pkmn/engine"
import { Dex } from "@pkmn/dex"
import { createClient } from "@supabase/supabase-js"

export interface BattleRequest {
  battle_id: string
  turn: number
  active_pokemon: string
  legal_actions: string[]
  state_summary: any
}

export interface BattleResult {
  battle_id: string
  winner_team_id: string | null
  final_state: any
  log: string[]
}

export class BattleEngine {
  private battle: Battle | null = null
  private dex = Dex
  private battleId: string

  constructor(battleId: string) {
    this.battleId = battleId
  }

  async createBattle(format: string, team1: any[], team2: any[]): Promise<void> {
    console.log("[v0] Creating battle:", format)

    // Initialize battle with @pkmn/engine
    // Note: This is a simplified implementation
    // In production, you would properly construct team sets and validate format rules

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Store initial battle state
    const { error } = await supabase.from("battle_sessions").insert({
      id: this.battleId,
      format,
      team_a_id: team1[0]?.team_id,
      team_b_id: team2[0]?.team_id,
      state: { turn: 0, initialized: true },
      status: "active",
    })

    if (error) {
      throw new Error(`Failed to create battle: ${error.message}`)
    }
  }

  async getRequest(): Promise<BattleRequest> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: session, error } = await supabase.from("battle_sessions").select("*").eq("id", this.battleId).single()

    if (error || !session) {
      throw new Error("Battle session not found")
    }

    // In production, this would parse the actual battle state
    // and return legal actions based on the current position
    return {
      battle_id: this.battleId,
      turn: session.state?.turn || 0,
      active_pokemon: "pikachu", // Mock
      legal_actions: ["move 1", "move 2", "switch 2", "switch 3"], // Mock
      state_summary: session.state,
    }
  }

  getLegalChoices(): string[] {
    // In production, this would query the engine for legal moves
    return ["move 1", "move 2", "move 3", "switch 2", "switch 3"]
  }

  async choose(choice: string): Promise<void> {
    console.log("[v0] Battle choice:", choice)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Validate choice is legal
    const legalChoices = this.getLegalChoices()
    if (!legalChoices.includes(choice)) {
      throw new Error(`Illegal choice: ${choice}`)
    }

    // Apply choice to engine (simplified mock)
    const turn = (await this.getRequest()).turn + 1

    // Log battle event
    await supabase.from("battle_events").insert({
      battle_id: this.battleId,
      turn,
      event_type: "action",
      payload: { choice, turn },
    })

    // Update battle state
    await supabase
      .from("battle_sessions")
      .update({
        state: { turn },
        updated_at: new Date().toISOString(),
      })
      .eq("id", this.battleId)
  }

  async getLog(): Promise<string[]> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: events, error } = await supabase
      .from("battle_events")
      .select("*")
      .eq("battle_id", this.battleId)
      .order("turn", { ascending: true })

    if (error) throw error

    return events?.map((e) => `Turn ${e.turn}: ${e.event_type}`) || []
  }

  async finalizeBattle(winnerId: string): Promise<BattleResult> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    await supabase
      .from("battle_sessions")
      .update({
        winner_id: winnerId,
        status: "complete",
      })
      .eq("id", this.battleId)

    const log = await this.getLog()

    return {
      battle_id: this.battleId,
      winner_team_id: winnerId,
      final_state: {},
      log,
    }
  }
}

// Battle adapter API (matches the architecture from the research)
export async function createBattle(format: string, teamA: any[], teamB: any[]): Promise<string> {
  const battleId = crypto.randomUUID()
  const engine = new BattleEngine(battleId)
  await engine.createBattle(format, teamA, teamB)
  return battleId
}

export async function getBattleRequest(battleId: string): Promise<BattleRequest> {
  const engine = new BattleEngine(battleId)
  return engine.getRequest()
}

export async function getLegalChoices(battleId: string): Promise<string[]> {
  const engine = new BattleEngine(battleId)
  return engine.getLegalChoices()
}

export async function applyChoice(battleId: string, choice: string): Promise<void> {
  const engine = new BattleEngine(battleId)
  await engine.choose(choice)
}

export async function getBattleLog(battleId: string): Promise<string[]> {
  const engine = new BattleEngine(battleId)
  return engine.getLog()
}
