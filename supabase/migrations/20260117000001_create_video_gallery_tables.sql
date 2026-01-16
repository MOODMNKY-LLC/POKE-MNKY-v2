-- Video Gallery System Schema
-- Creates tables for YouTube video gallery, feedback, and user tagging

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

-- Video feedback table (ratings, comments, reactions)
CREATE TABLE IF NOT EXISTS public.video_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
  comment TEXT,
  reaction TEXT CHECK (reaction IN ('like', 'dislike', 'love', 'funny', 'helpful', 'insightful')),
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id) -- One feedback per user per video
);

-- Indexes for video_feedback
CREATE INDEX IF NOT EXISTS idx_video_feedback_video_id ON public.video_feedback(video_id);
CREATE INDEX IF NOT EXISTS idx_video_feedback_user_id ON public.video_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_video_feedback_rating ON public.video_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_video_feedback_created_at ON public.video_feedback(created_at DESC);

-- Video tags table (user mentions/tags in videos)
CREATE TABLE IF NOT EXISTS public.video_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tagged_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_type TEXT CHECK (tag_type IN ('mention', 'highlight', 'featured')) DEFAULT 'mention',
  note TEXT, -- Optional note about why they were tagged
  is_notified BOOLEAN DEFAULT FALSE, -- Whether Discord notification was sent
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, tagged_user_id, tagged_by_user_id) -- Prevent duplicate tags
);

-- Indexes for video_tags
CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON public.video_tags(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_tagged_user_id ON public.video_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_tagged_by_user_id ON public.video_tags(tagged_by_user_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_is_notified ON public.video_tags(is_notified) WHERE is_notified = FALSE;

-- Video views tracking (for analytics)
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous views
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  watch_duration_seconds INTEGER, -- How long they watched
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for video_views
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON public.video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON public.video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewed_at ON public.video_views(viewed_at DESC);

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

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_feedback_updated_at BEFORE UPDATE ON public.video_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_youtube_channels_updated_at BEFORE UPDATE ON public.youtube_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

-- Videos: Public read, authenticated write
CREATE POLICY "Videos are viewable by everyone" ON public.videos
  FOR SELECT USING (true);

CREATE POLICY "Videos can be created by authenticated users" ON public.videos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Videos can be updated by authenticated users" ON public.videos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Video feedback: Users can read all, but only modify their own
CREATE POLICY "Video feedback is viewable by everyone" ON public.video_feedback
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own feedback" ON public.video_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON public.video_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback" ON public.video_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Video tags: Users can read all, but only create/delete their own tags
CREATE POLICY "Video tags are viewable by everyone" ON public.video_tags
  FOR SELECT USING (true);

CREATE POLICY "Users can create tags" ON public.video_tags
  FOR INSERT WITH CHECK (auth.uid() = tagged_by_user_id);

CREATE POLICY "Users can delete tags they created" ON public.video_tags
  FOR DELETE USING (auth.uid() = tagged_by_user_id);

-- Video views: Users can read all, create their own
CREATE POLICY "Video views are viewable by everyone" ON public.video_views
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create video views" ON public.video_views
  FOR INSERT WITH CHECK (true);

-- YouTube channels: Public read, authenticated write
CREATE POLICY "YouTube channels are viewable by everyone" ON public.youtube_channels
  FOR SELECT USING (true);

CREATE POLICY "YouTube channels can be created by authenticated users" ON public.youtube_channels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "YouTube channels can be updated by authenticated users" ON public.youtube_channels
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Comments: Add a separate table for threaded comments on videos
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE, -- For threading
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for video_comments
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON public.video_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent_comment_id ON public.video_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON public.video_comments(created_at DESC);

-- RLS for video_comments
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Video comments are viewable by everyone" ON public.video_comments
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Users can create comments" ON public.video_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.video_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.video_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for video_comments updated_at
CREATE TRIGGER update_video_comments_updated_at BEFORE UPDATE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
