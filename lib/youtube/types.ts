/**
 * YouTube API Types
 * Shared types for YouTube video data (client-safe, no Node.js dependencies)
 */

export interface YouTubeVideo {
  id: string;
  youtube_video_id: string;
  youtube_channel_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  thumbnail_medium_url: string | null;
  thumbnail_high_url: string | null;
  published_at: string;
  duration: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  youtube_url: string;
}

export interface YouTubeChannel {
  channel_id: string;
  channel_handle: string | null;
  channel_name: string;
  description: string | null;
  thumbnail_url: string | null;
  subscriber_count: number;
  video_count: number;
}
