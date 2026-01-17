// Draft Assistant API Route
import { NextResponse } from 'next/server'
import { getDraftRecommendation, suggestDraftPick } from '@/lib/agents/draft-assistant'
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
    const { teamId, seasonId, context, currentPick, action } = body

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    // Action: 'recommendation' (full analysis) or 'suggest' (quick pick)
    if (action === 'suggest') {
      const { budgetRemaining, pointRange } = body
      if (budgetRemaining === undefined) {
        return NextResponse.json({ error: 'budgetRemaining is required for suggest action' }, { status: 400 })
      }

      const suggestion = await suggestDraftPick(teamId, budgetRemaining, pointRange)
      return NextResponse.json({
        suggestion,
        teamId,
        budgetRemaining,
      })
    }

    // Default: full recommendation
    const recommendation = await getDraftRecommendation({
      teamId,
      seasonId,
      context,
      currentPick,
    })

    return NextResponse.json({
      teamId,
      seasonId,
      recommendation,
    })
  } catch (error) {
    console.error('[v0] Draft Assistant error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Draft assistant failed' },
      { status: 500 }
    )
  }
}
