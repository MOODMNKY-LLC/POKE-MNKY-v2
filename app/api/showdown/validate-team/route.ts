import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { parseShowdownTeam, validateTeamAgainstRoster, type LeagueRules } from '@/lib/team-parser';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { team_text, match_id } = await request.json();

    if (!team_text) {
      return NextResponse.json({ error: 'team_text is required' }, { status: 400 });
    }

    // Parse team
    const parsed = await parseShowdownTeam(team_text);

    if (parsed.errors.length > 0) {
      return NextResponse.json({
        valid: false,
        errors: parsed.errors,
        message: 'Failed to parse team'
      }, { status: 400 });
    }

    // Get user's team
    const serviceSupabase = createServiceRoleClient();
    const { data: userTeam, error: teamError } = await serviceSupabase
      .from('teams')
      .select('id, season_id')
      .eq('coach_id', user.id)
      .single();

    if (teamError || !userTeam) {
      return NextResponse.json(
        { error: 'Team not found. Make sure you are assigned as a coach.' },
        { status: 404 }
      );
    }

    // Get current season if season_id is not set
    let seasonId = userTeam.season_id;
    if (!seasonId) {
      const { data: currentSeason } = await serviceSupabase
        .from('seasons')
        .select('id')
        .eq('is_current', true)
        .single();
      
      if (currentSeason) {
        seasonId = currentSeason.id;
      }
    }

    // Get drafted roster
    const { data: roster, error: rosterError } = await serviceSupabase
      .from('team_rosters')
      .select('pokemon_id, pokemon_name')
      .eq('team_id', userTeam.id);

    // Filter by season if season_id is available
    if (seasonId) {
      // Note: team_rosters may not have season_id column, adjust query if needed
      // For now, we'll get all rosters for the team
    }

    if (rosterError) {
      console.error('[Showdown] Roster fetch error:', rosterError);
      return NextResponse.json(
        { error: 'Failed to fetch roster' },
        { status: 500 }
      );
    }

    if (!roster || roster.length === 0) {
      return NextResponse.json({
        valid: false,
        errors: ['No drafted roster found'],
        message: 'You need to draft Pokemon first before validating a team'
      }, { status: 400 });
    }

    // Get league rules from league_config table
    let leagueRules: LeagueRules = {
      teamSize: { min: 6, max: 10 },
      maxLevel: 50
    };

    try {
      const { data: rules } = await serviceSupabase
        .from('league_config')
        .select('content, embedded_tables')
        .eq('config_type', 'rules')
        .limit(1)
        .single();

      if (rules) {
        // Parse league rules from config
        // This is a basic implementation - enhance based on your rules structure
        // For now, we'll use defaults
      }
    } catch (error) {
      // Rules not found or error - use defaults
      console.warn('[Showdown] Could not fetch league rules, using defaults:', error);
    }

    // Validate team against roster
    const validation = await validateTeamAgainstRoster(
      parsed,
      roster.map(r => ({
        pokemon_id: r.pokemon_id,
        pokemon_name: r.pokemon_name
      })),
      leagueRules
    );

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
      team: {
        pokemon: parsed.pokemon,
        count: parsed.pokemon.length
      },
      canonical_text: parsed.canonicalText,
      metadata: parsed.metadata
    });
  } catch (error) {
    console.error('[Showdown] Validate team error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
