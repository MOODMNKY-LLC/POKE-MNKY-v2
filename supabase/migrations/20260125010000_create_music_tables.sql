-- Music Player System Tables
-- Created: 2026-01-25
-- Purpose: Support in-app music player with Pixabay track management

-- Music tracks table
CREATE TABLE IF NOT EXISTS music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  pixabay_id INTEGER UNIQUE,
  pixabay_url TEXT,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  duration INTEGER, -- seconds
  file_size INTEGER, -- bytes
  mood_tags TEXT[] DEFAULT '{}', -- ['draft', 'battle', 'focus', 'ambient']
  bpm INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlists table
CREATE TABLE IF NOT EXISTS music_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  context_type TEXT NOT NULL, -- 'draft', 'battle', 'focus', 'ambient', 'custom'
  track_ids UUID[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User music preferences
CREATE TABLE IF NOT EXISTS user_music_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  music_enabled BOOLEAN DEFAULT false,
  volume DECIMAL(3,2) DEFAULT 0.3, -- 0.00 to 1.00
  current_playlist_id UUID REFERENCES music_playlists(id),
  current_track_id UUID REFERENCES music_tracks(id),
  shuffle_enabled BOOLEAN DEFAULT false,
  repeat_mode TEXT DEFAULT 'none', -- 'none', 'track', 'playlist'
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_music_tracks_mood_tags ON music_tracks USING GIN(mood_tags);
CREATE INDEX IF NOT EXISTS idx_music_tracks_active ON music_tracks(is_active);
CREATE INDEX IF NOT EXISTS idx_music_tracks_pixabay_id ON music_tracks(pixabay_id);
CREATE INDEX IF NOT EXISTS idx_music_playlists_context ON music_playlists(context_type, is_active);
CREATE INDEX IF NOT EXISTS idx_music_playlists_active ON music_playlists(is_active);

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_music_tracks_updated_at
  BEFORE UPDATE ON music_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_music_playlists_updated_at
  BEFORE UPDATE ON music_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_music_preferences_updated_at
  BEFORE UPDATE ON user_music_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_music_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public read access for active tracks
CREATE POLICY "Public can read active tracks"
ON music_tracks FOR SELECT
USING (is_active = true);

-- Admin full access to tracks
CREATE POLICY "Admins can manage tracks"
ON music_tracks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Public read access for active playlists
CREATE POLICY "Public can read active playlists"
ON music_playlists FOR SELECT
USING (is_active = true);

-- Admin full access to playlists
CREATE POLICY "Admins can manage playlists"
ON music_playlists FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can manage own preferences
CREATE POLICY "Users can manage own preferences"
ON user_music_preferences FOR ALL
USING (auth.uid() = user_id);

-- Users can read own preferences
CREATE POLICY "Users can read own preferences"
ON user_music_preferences FOR SELECT
USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE music_tracks IS 'Stores music tracks downloaded from Pixabay and stored in Supabase Storage';
COMMENT ON TABLE music_playlists IS 'Stores playlists for different app contexts (draft, battle, focus, etc.)';
COMMENT ON TABLE user_music_preferences IS 'Stores user-specific music player preferences and state';
