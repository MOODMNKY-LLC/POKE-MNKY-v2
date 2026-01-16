/**
 * YouTube Video API Route
 * GET /api/youtube/video/[videoId] - Get single video by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVideoById } from '@/lib/youtube/client';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    const searchParams = request.nextUrl.searchParams;
    const syncToDb = searchParams.get('sync') === 'true';

    // Fetch from YouTube API
    const video = await getVideoById(videoId);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Optionally sync to Supabase
    if (syncToDb) {
      const supabase = await createServerClient();
      
      const { error: upsertError } = await supabase
        .from('videos')
        .upsert({
          youtube_video_id: video.youtube_video_id,
          youtube_channel_id: video.youtube_channel_id,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail_url,
          thumbnail_medium_url: video.thumbnail_medium_url,
          thumbnail_high_url: video.thumbnail_high_url,
          published_at: video.published_at,
          duration: video.duration,
          view_count: video.view_count,
          like_count: video.like_count,
          comment_count: video.comment_count,
          youtube_url: video.youtube_url,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'youtube_video_id',
        });

      if (upsertError) {
        console.error('[YouTube API] Error syncing video:', upsertError);
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json(video);
  } catch (error: any) {
    console.error('[YouTube API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch video' },
      { status: 500 }
    );
  }
}
