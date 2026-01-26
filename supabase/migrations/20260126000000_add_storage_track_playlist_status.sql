-- Add table to track which storage tracks are enabled for the in-app playlist
-- This allows admins to curate the playlist without exposing all tracks to users

CREATE TABLE IF NOT EXISTS storage_track_playlist_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE, -- Full path in storage bucket (e.g., "filename.mp3" or "tracks/filename.mp3")
  file_name TEXT NOT NULL, -- Just the filename for easier lookup
  is_playlist_enabled BOOLEAN DEFAULT false, -- Whether this track is included in the in-app playlist
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_storage_track_playlist_path ON storage_track_playlist_status(storage_path);
CREATE INDEX IF NOT EXISTS idx_storage_track_playlist_filename ON storage_track_playlist_status(file_name);
CREATE INDEX IF NOT EXISTS idx_storage_track_playlist_enabled ON storage_track_playlist_status(is_playlist_enabled);

-- Updated_at trigger
CREATE TRIGGER update_storage_track_playlist_status_updated_at
  BEFORE UPDATE ON storage_track_playlist_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE storage_track_playlist_status ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled tracks (users need to see what's in playlist)
CREATE POLICY "Public can read playlist enabled tracks"
ON storage_track_playlist_status FOR SELECT
USING (is_playlist_enabled = true);

-- Admin full access
CREATE POLICY "Admins can manage playlist track status"
ON storage_track_playlist_status FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

COMMENT ON TABLE storage_track_playlist_status IS 'Tracks which storage tracks are enabled for the in-app music player playlist';
