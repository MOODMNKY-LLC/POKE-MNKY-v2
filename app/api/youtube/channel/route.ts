/**
 * YouTube Channel API Route
 * GET /api/youtube/channel - Get channel information
 */

import { NextResponse } from 'next/server';
import { getChannelInfo } from '@/lib/youtube/client';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch from YouTube API
    const channelInfo = await getChannelInfo();
    
    if (!channelInfo) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Optionally sync to Supabase
    const supabase = await createServerClient();
    
    // Upsert channel info
    const { error: upsertError } = await supabase
      .from('youtube_channels')
      .upsert({
        channel_id: channelInfo.channel_id,
        channel_handle: channelInfo.channel_handle,
        channel_name: channelInfo.channel_name,
        description: channelInfo.description,
        thumbnail_url: channelInfo.thumbnail_url,
        subscriber_count: channelInfo.subscriber_count,
        video_count: channelInfo.video_count,
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'channel_id',
      });

    if (upsertError) {
      console.error('[YouTube API] Error syncing channel:', upsertError);
      // Don't fail the request if sync fails
    }

    return NextResponse.json(channelInfo);
  } catch (error: any) {
    console.error('[YouTube API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channel information' },
      { status: 500 }
    );
  }
}
