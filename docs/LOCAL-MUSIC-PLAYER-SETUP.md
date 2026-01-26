# Local Music Player Setup Guide

## Overview

The music player uses **purely local storage** - tracks are stored in Supabase Storage and played directly from there.

## Storage Location

### Local Development (Supabase Local)

**Bucket Name**: `music-tracks`  
**Access via**: 
- **Supabase Studio**: http://127.0.0.1:65433 → Storage → music-tracks
- **API**: `http://127.0.0.1:65432/storage/v1/object/public/music-tracks/`

**Physical Location**: Files are stored in Docker volume `supabase_storage_POKE-MNKY-v2`

**Docker Volume Path**: `/var/lib/docker/volumes/supabase_storage_POKE-MNKY-v2/_data`

**On Windows (Docker Desktop)**: The volume is typically at:
- WSL2: `\\wsl$\docker-desktop-data\data\docker\volumes\supabase_storage_POKE-MNKY-v2\_data`
- Or use Docker Desktop → Volumes → supabase_storage_POKE-MNKY-v2 → Browse

**Direct File Path**: `{volume_path}/music-tracks/tracks/`

**Recommended**: Use Supabase Studio UI or the admin upload interface (see below) rather than manually copying files.

### Production

**Bucket Name**: `music-tracks`  
**Access via**: Supabase Dashboard → Storage → music-tracks

## Bucket Configuration

- **Public**: Yes (for direct audio playback)
- **File Size Limit**: 10MB
- **Allowed MIME Types**: `audio/mpeg`, `audio/mp3`, `audio/ogg`, `audio/wav`, `audio/webm`

## Adding Tracks

### Option 1: Admin Upload Interface (Recommended)

1. Navigate to `/admin/music`
2. Go to "Tracks" tab
3. Use the "Upload Track" button to upload audio files directly
4. Fill in track metadata (title, artist, tags)
5. Track is automatically added to the database

### Option 2: Supabase Studio

1. Open Supabase Studio: http://127.0.0.1:65433
2. Go to Storage → music-tracks
3. Click "Upload file"
4. Upload your audio file
5. Manually add entry to `music_tracks` table with:
   - `title`: Track name
   - `artist`: Artist name
   - `storage_path`: Path in bucket (e.g., `tracks/my-track.mp3`)
   - `storage_url`: Public URL from Supabase
   - `mood_tags`: Array of tags (e.g., `['pokemon', 'lofi']`)
   - `is_active`: `true`

### Option 3: Direct File Copy (Advanced)

If you need to copy files directly to the Docker volume:

1. **Find Docker volume mount point**:
   ```bash
   docker volume inspect supabase_storage_POKE-MNKY-v2
   ```
   On Windows with Docker Desktop, the path is typically:
   ```
   \\wsl$\docker-desktop-data\data\docker\volumes\supabase_storage_POKE-MNKY-v2\_data\music-tracks\tracks\
   ```

2. **Copy audio files** to: `{volume_path}/music-tracks/tracks/`

3. **Add database entries** manually via Supabase Studio or API:
   - Go to Supabase Studio → Table Editor → `music_tracks`
   - Insert new row with:
     - `title`: Track name
     - `artist`: Artist name
     - `storage_path`: `tracks/your-file.mp3`
     - `storage_url`: `http://127.0.0.1:65432/storage/v1/object/public/music-tracks/tracks/your-file.mp3`
     - `file_size`: File size in bytes
     - `mood_tags`: Array of tags (e.g., `["pokemon", "lofi"]`)
     - `is_active`: `true`

## File Organization

Recommended structure in `music-tracks` bucket:
```
music-tracks/
└── tracks/
    ├── track-1.mp3
    ├── track-2.mp3
    └── ...
```

## Database Schema

Tracks are stored in `music_tracks` table:
- `id`: UUID (auto-generated)
- `title`: Track name
- `artist`: Artist name
- `storage_path`: Path in bucket (e.g., `tracks/track-1.mp3`)
- `storage_url`: Public CDN URL
- `duration`: Duration in seconds (optional)
- `file_size`: File size in bytes
- `mood_tags`: Array of tags (e.g., `['pokemon', 'lofi', 'chill']`)
- `is_active`: Boolean (show/hide track)

## Music Player Usage

The music player will:
1. Fetch all active tracks from `music_tracks` table
2. Play tracks directly from Supabase Storage URLs
3. Support playlists, shuffle, repeat modes
4. Remember user preferences

## Next Steps

1. **Restart Supabase** to apply bucket config changes (10MB limit):
   ```bash
   supabase stop
   supabase start
   ```

2. **Upload your first tracks**:
   - **Recommended**: Use the admin upload interface at `/admin/music` → "Downloaded Tracks" tab → "Upload Track" button
   - Or copy files directly to the Docker volume (see Option 3 above)

3. **Test playback** - tracks should play directly from Supabase Storage URLs

## Quick Reference

**Bucket Location**: `music-tracks`  
**Max File Size**: 10MB  
**Docker Volume**: `supabase_storage_POKE-MNKY-v2`  
**Physical Path**: `/var/lib/docker/volumes/supabase_storage_POKE-MNKY-v2/_data/music-tracks/tracks/`  
**Windows Path**: `\\wsl$\docker-desktop-data\data\docker\volumes\supabase_storage_POKE-MNKY-v2\_data\music-tracks\tracks\`

**Access Methods**:
- Admin Upload UI: `/admin/music` → "Downloaded Tracks" → "Upload Track"
- Supabase Studio: http://127.0.0.1:65433 → Storage → music-tracks
- Direct File Copy: Copy to Docker volume path above
