-- Ensure video gallery tables exist
-- This migration ensures tables are created even if previous migration failed silently

-- Videos table (cached YouTube video data)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_video_id TEXT NOT NULL UNIQUE,
  youtube_channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  thumbnail_medium_url TEXT,
  thumbnail_high_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  duration TEXT, -- ISO 8601 duration format (e.g., PT5M30S)
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  youtube_url TEXT NOT NULL,
  -- Metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for videos table
CREATE INDEX IF NOT EXISTS idx_videos_youtube_video_id ON public.videos(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_channel_id ON public.videos(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON public.videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_last_synced_at ON public.videos(last_synced_at);

-- Channel configuration (for YouTube channel settings)
CREATE TABLE IF NOT EXISTS public.youtube_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT NOT NULL UNIQUE,
  channel_handle TEXT,
  channel_name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  subscriber_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for youtube_channels
CREATE INDEX IF NOT EXISTS idx_youtube_channels_channel_id ON public.youtube_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_is_active ON public.youtube_channels(is_active) WHERE is_active = TRUE;
