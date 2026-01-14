import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import {
  createShowdownTeam,
  getCoachTeams,
  searchTeams,
  type CreateTeamInput
} from '@/lib/showdown-teams';

/**
 * GET /api/showdown/teams
 * Get teams for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get coach ID (create if doesn't exist)
    const serviceSupabase = createServiceRoleClient();
    let { data: coach } = await serviceSupabase
      .from('coaches')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // If coach doesn't exist, create one
    if (!coach) {
      const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .single();

      const { data: newCoach, error: createError } = await serviceSupabase
        .from('coaches')
        .insert({
          user_id: user.id,
          display_name: profile?.display_name || user.email || 'Unknown',
          email: profile?.email || user.email || null
        })
        .select('id')
        .single();

      if (createError || !newCoach) {
        console.error('[Showdown] Failed to create coach:', createError);
        return NextResponse.json(
          { error: 'Failed to create coach record. Please contact support.' },
          { status: 500 }
        );
      }

      coach = newCoach;
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const format = searchParams.get('format');
    const generation = searchParams.get('generation') ? parseInt(searchParams.get('generation')!) : undefined;
    const seasonId = searchParams.get('season_id');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let teams;

    if (search) {
      // Search teams (includes stock teams by default)
      teams = await searchTeams(search, {
        coachId: coach.id,
        format: format || undefined,
        generation: generation,
        limit: limit,
        includeStock: true // Include stock teams in search
      });
    } else {
      // Get coach teams (includes stock teams by default)
      teams = await getCoachTeams(coach.id, {
        seasonId: seasonId || undefined,
        format: format || undefined,
        generation: generation,
        includeStock: true // Include stock teams
      });
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('[Showdown] Get teams error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/showdown/teams
 * Create a new team
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get coach ID (create if doesn't exist)
    const serviceSupabase = createServiceRoleClient();
    let { data: coach } = await serviceSupabase
      .from('coaches')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // If coach doesn't exist, create one
    if (!coach) {
      const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .single();

      const { data: newCoach, error: createError } = await serviceSupabase
        .from('coaches')
        .insert({
          user_id: user.id,
          display_name: profile?.display_name || user.email || 'Unknown',
          email: profile?.email || user.email || null
        })
        .select('id')
        .single();

      if (createError || !newCoach) {
        console.error('[Showdown] Failed to create coach:', createError);
        return NextResponse.json(
          { error: 'Failed to create coach record. Please contact support.' },
          { status: 500 }
        );
      }

      coach = newCoach;
    }

    const body = await request.json();
    const input: CreateTeamInput = {
      team_text: body.team_text,
      team_name: body.team_name,
      team_id: body.team_id,
      season_id: body.season_id,
      tags: body.tags,
      notes: body.notes,
      source: body.source || 'upload'
    };

    if (!input.team_text) {
      return NextResponse.json({ error: 'team_text is required' }, { status: 400 });
    }

    const result = await createShowdownTeam(input, coach.id);

    if (result.errors.length > 0) {
      return NextResponse.json({
        error: 'Failed to create team',
        errors: result.errors
      }, { status: 400 });
    }

    return NextResponse.json({ team: result.team });
  } catch (error) {
    console.error('[Showdown] Create team error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
