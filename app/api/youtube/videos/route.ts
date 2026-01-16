/**
 * YouTube Videos API Route
 * GET /api/youtube/videos - Get videos from channel
 * Query params: maxResults (default: 50), pageToken (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChannelVideos } from '@/lib/youtube/client';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get('maxResults') || '50', 10);
    const pageToken = searchParams.get('pageToken') || undefined;
    const syncToDb = searchParams.get('sync') === 'true';

    // Fetch from YouTube API
    const { videos, nextPageToken } = await getChannelVideos(maxResults, pageToken);

    // Optionally sync to Supabase
    if (syncToDb && videos.length > 0) {
      const supabase = await createServerClient();
      
      // Upsert videos
      const videosToUpsert = videos.map(video => ({
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
      }));

      const { error: upsertError } = await supabase
        .from('videos')
        .upsert(videosToUpsert, {
          onConflict: 'youtube_video_id',
        });

      if (upsertError) {
        console.error('[YouTube API] Error syncing videos:', upsertError);
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json({
      videos,
      nextPageToken,
      count: videos.length,
    });
  } catch (error: any) {
    console.error('[YouTube API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
