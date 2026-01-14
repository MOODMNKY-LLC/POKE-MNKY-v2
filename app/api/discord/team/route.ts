/**
 * Discord Bot Team Lookup Endpoint
 * Returns team information by Discord user ID
 * 
 * GET /api/discord/team?discord_id={discordId}
 * 
 * Used by Discord bot commands that need to identify a user's team
 */

import { createServiceRoleClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const discordId = searchParams.get('discord_id')

    if (!discordId) {
      return NextResponse.json(
        { error: 'discord_id is required' },
        { status: 400 }
      )
    }

    // Use service role client for server-to-server authentication
    const supabase = createServiceRoleClient()

    // Get profile by discord_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('discord_id', discordId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found. Please link your Discord account in the app first.' },
        { status: 404 }
      )
    }

    // Get coach by user_id
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('id, team_id')
      .eq('user_id', profile.id)
      .single()

    if (coachError || !coach || !coach.team_id) {
      return NextResponse.json(
        { error: 'Team not found. You are not assigned as a coach.' },
        { status: 404 }
      )
    }

    // Get team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', coach.team_id)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team details not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      team_id: team.id,
      team_name: team.name,
      coach_id: coach.id,
    })
  } catch (error: any) {
    console.error('Error in /api/discord/team:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
