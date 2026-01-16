/**
 * YouTube Data API v3 Client
 * 
 * Uses Google service account credentials to access YouTube Data API
 * for fetching channel information and videos.
 * 
 * NOTE: This file is SERVER-ONLY. Do not import in client components.
 * Use API routes instead.
 */

import { google } from 'googleapis';
import { getGoogleServiceAccountCredentials } from '@/lib/utils/google-sheets';
import type { YouTubeVideo, YouTubeChannel } from './types';

// Re-export types for API routes that import from this file
export type { YouTubeVideo, YouTubeChannel };

const CHANNEL_HANDLE = '@aabdraftleague';
const CHANNEL_ID = 'UCtvS48PqSCtF3QhuPS7Wb0A'; // Resolved from test script

/**
 * Get authenticated YouTube API client
 */
async function getYouTubeClient() {
  const credentials = getGoogleServiceAccountCredentials();
  
  if (!credentials) {
    throw new Error('Google service account credentials not configured');
  }

  // Create JWT client for service account
  const auth = new google.auth.JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
  });

  return google.youtube({
    version: 'v3',
    auth,
  });
}

/**
 * Fetch channel information from YouTube API
 */
export async function getChannelInfo(): Promise<YouTubeChannel | null> {
  try {
    const youtube = await getYouTubeClient();
    
    const response = await youtube.channels.list({
      part: ['id', 'snippet', 'statistics'],
      id: [CHANNEL_ID],
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    const channel = response.data.items[0];
    const snippet = channel.snippet;
    const statistics = channel.statistics;

    return {
      channel_id: channel.id!,
      channel_handle: CHANNEL_HANDLE,
      channel_name: snippet?.title || 'Unknown Channel',
      description: snippet?.description || null,
      thumbnail_url: snippet?.thumbnails?.default?.url || null,
      subscriber_count: parseInt(statistics?.subscriberCount || '0', 10),
      video_count: parseInt(statistics?.videoCount || '0', 10),
    };
  } catch (error: any) {
    console.error('[YouTube Client] Error fetching channel info:', error);
    throw error;
  }
}

/**
 * Fetch videos from channel's uploads playlist
 */
export async function getChannelVideos(
  maxResults: number = 50,
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  try {
    const youtube = await getYouTubeClient();
    
    // First, get the uploads playlist ID
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: [CHANNEL_ID],
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error('Channel not found');
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error('Uploads playlist not found');
    }

    // Get videos from uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(maxResults, 50), // YouTube API max is 50
      pageToken,
    });

    if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
      return { videos: [] };
    }

    // Extract video IDs
    const videoIds = playlistResponse.data.items
      .map(item => item.contentDetails?.videoId)
      .filter((id): id is string => !!id);

    if (videoIds.length === 0) {
      return { videos: [] };
    }

    // Get detailed video information
    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: videoIds,
    });

    if (!videosResponse.data.items) {
      return { videos: [] };
    }

    // Transform to our format
    const videos: YouTubeVideo[] = videosResponse.data.items.map(video => {
      const snippet = video.snippet;
      const statistics = video.statistics;
      const thumbnails = snippet?.thumbnails;

      return {
        id: video.id!,
        youtube_video_id: video.id!,
        youtube_channel_id: CHANNEL_ID,
        title: snippet?.title || 'Untitled',
        description: snippet?.description || null,
        thumbnail_url: thumbnails?.default?.url || null,
        thumbnail_medium_url: thumbnails?.medium?.url || null,
        thumbnail_high_url: thumbnails?.high?.url || null,
        published_at: snippet?.publishedAt || new Date().toISOString(),
        duration: video.contentDetails?.duration || null,
        view_count: parseInt(statistics?.viewCount || '0', 10),
        like_count: parseInt(statistics?.likeCount || '0', 10),
        comment_count: parseInt(statistics?.commentCount || '0', 10),
        youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
      };
    });

    return {
      videos,
      nextPageToken: playlistResponse.data.nextPageToken || undefined,
    };
  } catch (error: any) {
    console.error('[YouTube Client] Error fetching videos:', error);
    throw error;
  }
}

/**
 * Get a single video by YouTube video ID
 */
export async function getVideoById(videoId: string): Promise<YouTubeVideo | null> {
  try {
    const youtube = await getYouTubeClient();
    
    const response = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    const video = response.data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics;
    const thumbnails = snippet?.thumbnails;

    return {
      id: video.id!,
      youtube_video_id: video.id!,
      youtube_channel_id: CHANNEL_ID,
      title: snippet?.title || 'Untitled',
      description: snippet?.description || null,
      thumbnail_url: thumbnails?.default?.url || null,
      thumbnail_medium_url: thumbnails?.medium?.url || null,
      thumbnail_high_url: thumbnails?.high?.url || null,
      published_at: snippet?.publishedAt || new Date().toISOString(),
      duration: video.contentDetails?.duration || null,
      view_count: parseInt(statistics?.viewCount || '0', 10),
      like_count: parseInt(statistics?.likeCount || '0', 10),
      comment_count: parseInt(statistics?.commentCount || '0', 10),
      youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
    };
  } catch (error: any) {
    console.error('[YouTube Client] Error fetching video:', error);
    throw error;
  }
}

// Duration utilities moved to lib/youtube/utils.ts for client-side use
