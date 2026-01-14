import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import {
  getTeamById,
  updateShowdownTeam,
  deleteShowdownTeam,
  exportTeam,
  type UpdateTeamInput
} from '@/lib/showdown-teams';

/**
 * GET /api/showdown/teams/[id]
 * Get a team by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const team = await getTeamById(id);

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user owns the team or if it's a stock team
    const serviceSupabase = createServiceRoleClient();
    const { data: coach } = await serviceSupabase
      .from('coaches')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Allow access if:
    // 1. User owns the team (coach_id matches)
    // 2. Team is a stock team (is_stock = true, available to all authenticated users)
    const isOwner = team.coach_id === coach?.id;
    const isStock = team.is_stock === true;

    if (!isOwner && !isStock) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if export is requested
    const searchParams = request.nextUrl.searchParams;
    const exportFormat = searchParams.get('export');

    if (exportFormat === 'showdown') {
      const exported = exportTeam(team, {
        includeHeader: true
      });
      return NextResponse.json({ exported_text: exported });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('[Showdown] Get team error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/showdown/teams/[id]
 * Update a team
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get coach ID
    const serviceSupabase = createServiceRoleClient();
    const { data: coach } = await serviceSupabase
      .from('coaches')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const body = await request.json();
    const input: UpdateTeamInput = {
      team_name: body.team_name,
      team_text: body.team_text,
      tags: body.tags,
      notes: body.notes,
      folder_path: body.folder_path
    };

    const result = await updateShowdownTeam(params.id, input, coach.id);

    if (result.errors.length > 0) {
      return NextResponse.json({
        error: 'Failed to update team',
        errors: result.errors
      }, { status: 400 });
    }

    return NextResponse.json({ team: result.team });
  } catch (error) {
    console.error('[Showdown] Update team error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/showdown/teams/[id]
 * Delete a team (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get coach ID
    const serviceSupabase = createServiceRoleClient();
    const { data: coach } = await serviceSupabase
      .from('coaches')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const { id } = await params;
    await deleteShowdownTeam(id, coach.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Showdown] Delete team error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
