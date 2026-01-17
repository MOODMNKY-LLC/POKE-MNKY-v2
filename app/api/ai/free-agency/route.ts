// Free Agency Agent API Route
import { NextResponse } from 'next/server'
import {
  evaluateFreeAgencyTarget,
  evaluateTradeProposal,
  suggestFreeAgencyTargets,
} from '@/lib/agents/free-agency-agent'
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
    const { teamId, action } = body

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    // Action: 'evaluate', 'trade', or 'suggest'
    if (action === 'evaluate') {
      const { pokemonName, seasonId } = body
      if (!pokemonName) {
        return NextResponse.json({ error: 'pokemonName is required for evaluate action' }, { status: 400 })
      }

      const evaluation = await evaluateFreeAgencyTarget({
        teamId,
        pokemonName,
        seasonId,
      })

      return NextResponse.json({
        teamId,
        pokemonName,
        evaluation,
      })
    }

    if (action === 'trade') {
      const { proposedTrade } = body
      if (!proposedTrade || !proposedTrade.giving || !proposedTrade.receiving) {
        return NextResponse.json(
          { error: 'proposedTrade with giving and receiving arrays is required' },
          { status: 400 }
        )
      }

      const evaluation = await evaluateTradeProposal(teamId, proposedTrade)
      return NextResponse.json({
        teamId,
        proposedTrade,
        evaluation,
      })
    }

    if (action === 'suggest') {
      const { needs } = body
      const suggestions = await suggestFreeAgencyTargets(teamId, needs)
      return NextResponse.json({
        teamId,
        suggestions,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: evaluate, trade, or suggest' }, { status: 400 })
  } catch (error) {
    console.error('[v0] Free Agency Agent error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Free agency agent failed' },
      { status: 500 }
    )
  }
}
