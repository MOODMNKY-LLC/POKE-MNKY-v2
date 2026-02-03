import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { z } from 'zod';
import { apiError, apiErrorInternal } from '@/lib/api-response';

const createRoomSchema = z.object({
  match_id: z.string().uuid('match_id must be a valid UUID'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('Unauthorized', 401, { code: 'UNAUTHORIZED' });
    }

    const body = await request.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('match_id is required and must be a valid UUID', 400, {
        code: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }
    const { match_id } = parsed.data;

    // Get match details using service role client for reliable access
    const serviceSupabase = createServiceRoleClient();
    const { data: match, error: matchError } = await serviceSupabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name, coach_id),
        team2:teams!matches_team2_id_fkey(id, name, coach_id)
      `)
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      console.error('[Showdown] Match fetch error:', matchError);
      return apiError('Match not found', 404, { code: 'NOT_FOUND' });
    }

    // Check if user is part of this match (coach of team1 or team2)
    const isTeam1Coach = match.team1?.coach_id === user.id;
    const isTeam2Coach = match.team2?.coach_id === user.id;

    if (!isTeam1Coach && !isTeam2Coach) {
      return apiError('You are not part of this match', 403, { code: 'FORBIDDEN' });
    }

    // Check if room already exists
    if (match.showdown_room_id && match.showdown_room_url) {
      return NextResponse.json({
        success: true,
        room_id: match.showdown_room_id,
        room_url: match.showdown_room_url,
        match_id,
        message: 'Room already exists'
      });
    }

    // Generate room identifier
    // Remove hyphens from UUID for cleaner room ID
    const cleanMatchId = match_id.replace(/-/g, '');
    const roomId = `battle-match-${cleanMatchId.substring(0, 16)}`;
    
    // Construct room URL
    // Showdown format: /battle-[format]-[roomId] or /battle-[roomId]
    const showdownClientUrl = process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL || 'https://aab-play.moodmnky.com';
    const battleFormat = 'gen9avgatbest'; // Your league format - adjust as needed
    // Try format-specific URL first, fallback to simple room ID
    const roomUrl = `${showdownClientUrl}/battle-${battleFormat}-${roomId}`;

    // Call Showdown server API to create room (if API exists)
    // Note: This assumes your Showdown server has an API endpoint
    // Adjust based on your actual Showdown server setup
    let showdownRoomId = roomId;
    let showdownRoomUrl = roomUrl;

    if (process.env.SHOWDOWN_SERVER_URL) {
      try {
        const showdownResponse = await fetch(`${process.env.SHOWDOWN_SERVER_URL}/api/create-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.SHOWDOWN_API_KEY && {
              'Authorization': `Bearer ${process.env.SHOWDOWN_API_KEY}`
            })
          },
          body: JSON.stringify({
            roomId,
            format: battleFormat, // Your league format - adjust as needed
            team1: match.team1?.name || 'Team 1',
            team2: match.team2?.name || 'Team 2',
            matchId: match_id
          })
        });

        if (showdownResponse.ok) {
          const responseData = await showdownResponse.json();
          showdownRoomId = responseData.room_id || roomId;
          showdownRoomUrl = responseData.room_url || roomUrl;
        } else {
          // Log error but continue with local room creation
          const errorText = await showdownResponse.text();
          console.warn('[Showdown] Server API call failed:', errorText);
          // Continue with local room ID/URL generation
        }
      } catch (error) {
        // Network error - continue with local room creation
        console.warn('[Showdown] Failed to call Showdown server API:', error);
        // Continue with local room ID/URL generation
      }
    }

    // Update match record
    const { error: updateError } = await serviceSupabase
      .from('matches')
      .update({
        showdown_room_id: showdownRoomId,
        showdown_room_url: showdownRoomUrl,
        status: 'in_progress'
      })
      .eq('id', match_id);

    if (updateError) {
      console.error('[Showdown] Update match error:', updateError);
      return apiError(updateError.message, 500, { code: 'DB_ERROR' });
    }

    return NextResponse.json({
      success: true,
      room_id: showdownRoomId,
      room_url: showdownRoomUrl,
      match_id
    });
  } catch (error) {
    return apiErrorInternal(error, 'Showdown create-room');
  }
}
