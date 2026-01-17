// Battle Strategy Agent API Route
import { NextResponse } from 'next/server'
import { analyzeMatchup, suggestBattleMoves, recommendTeraTypes } from '@/lib/agents/battle-strategy-agent'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Action: 'matchup', 'moves', or 'tera'
    if (action === 'matchup') {
      const { team1Id, team2Id, seasonId } = body
      if (!team1Id || !team2Id) {
        return NextResponse.json({ error: 'team1Id and team2Id are required for matchup action' }, { status: 400 })
      }

      const analysis = await analyzeMatchup({
        team1Id,
        team2Id,
        seasonId,
      })

      return NextResponse.json({
        team1Id,
        team2Id,
        analysis,
      })
    }

    if (action === 'moves') {
      const { teamId, opponentTeamId, activePokemon, opponentActivePokemon, battleState } = body
      if (!teamId || !opponentTeamId || !activePokemon || !opponentActivePokemon) {
        return NextResponse.json(
          {
            error:
              'teamId, opponentTeamId, activePokemon, and opponentActivePokemon are required for moves action',
          },
          { status: 400 }
        )
      }

      const suggestions = await suggestBattleMoves(
        teamId,
        opponentTeamId,
        activePokemon,
        opponentActivePokemon,
        battleState
      )

      return NextResponse.json({
        teamId,
        opponentTeamId,
        activePokemon,
        opponentActivePokemon,
        suggestions,
      })
    }

    if (action === 'tera') {
      const { teamId, pokemon, opponentTeamId } = body
      if (!teamId || !pokemon || !opponentTeamId) {
        return NextResponse.json(
          { error: 'teamId, pokemon, and opponentTeamId are required for tera action' },
          { status: 400 }
        )
      }

      const recommendations = await recommendTeraTypes(teamId, pokemon, opponentTeamId)
      return NextResponse.json({
        teamId,
        pokemon,
        opponentTeamId,
        recommendations,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: matchup, moves, or tera' }, { status: 400 })
  } catch (error) {
    console.error('[v0] Battle Strategy Agent error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Battle strategy agent failed' },
      { status: 500 }
    )
  }
}
