/**
 * Discord Video Tag Notification API Route
 * POST /api/discord/video-tag-notification - Send Discord notification when user is tagged in video
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId, taggedUserId, taggedByUserId, note } = await request.json();

    if (!videoId || !taggedUserId || !taggedByUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user profiles
    const [taggedUser, taggedByUser, video] = await Promise.all([
      supabase.from('profiles').select('display_name, discord_id').eq('id', taggedUserId).single(),
      supabase.from('profiles').select('display_name').eq('id', taggedByUserId).single(),
      supabase.from('videos').select('title, youtube_url').eq('youtube_video_id', videoId).single(),
    ]);

    if (!taggedUser.data || !taggedByUser.data || !video.data) {
      return NextResponse.json(
        { error: 'User or video not found' },
        { status: 404 }
      );
    }

    // Get Discord webhook configuration
    const { data: webhook } = await supabase
      .from('discord_webhooks')
      .select('webhook_url, channel_name')
      .eq('event_type', 'video_tag')
      .eq('is_active', true)
      .single();

    if (!webhook?.webhook_url) {
      // No webhook configured, silently succeed
      return NextResponse.json({ success: true, message: 'No webhook configured' });
    }

    // Send Discord notification
    const discordPayload = {
      content: taggedUser.data.discord_id
        ? `<@${taggedUser.data.discord_id}>`
        : taggedUser.data.display_name,
      embeds: [
        {
          title: 'You\'ve been tagged in a video!',
          description: `${taggedByUser.data.display_name} tagged you in a video`,
          color: 0x5865f2, // Discord blurple
          fields: [
            {
              name: 'Video',
              value: `[${video.data.title}](${video.data.youtube_url})`,
              inline: false,
            },
            ...(note
              ? [
                  {
                    name: 'Note',
                    value: note,
                    inline: false,
                  },
                ]
              : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }

    // Update tag notification status
    await supabase
      .from('video_tags')
      .update({
        is_notified: true,
        notified_at: new Date().toISOString(),
      })
      .eq('video_id', video.data.id)
      .eq('tagged_user_id', taggedUserId)
      .eq('tagged_by_user_id', taggedByUserId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Discord Video Tag] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
