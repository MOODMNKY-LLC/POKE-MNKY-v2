# Music Player Setup Guide

**Date**: 2026-01-25  
**Status**: Phase 1 Complete

---

## Quick Start

### 1. Environment Variables

Add to `.env.local`:
```bash
PIXABAY_API_KEY=your_pixabay_api_key_here
```

**Get API Key**: Sign up at https://pixabay.com/api/docs/ (free, unlimited requests)

### 2. Database Migration

Run the migration to create music tables:
```bash
# If using Supabase CLI locally
supabase migration up

# Or apply manually in Supabase Dashboard SQL Editor
# File: supabase/migrations/20260125010000_create_music_tables.sql
```

### 3. Create Storage Bucket

In Supabase Dashboard → Storage:
1. Create new bucket: `music-tracks`
2. Set as **Public** (for CDN access)
3. Configure policies:
   - **Public Read**: All users can read
   - **Admin Write**: Only admins can upload

### 4. Access Admin Interface

Navigate to: `/admin/music`

---

## Features Implemented (Phase 1)

### ✅ Database Schema
- `music_tracks` - Track metadata and storage paths
- `music_playlists` - Context-specific playlists
- `user_music_preferences` - User settings
- RLS policies for security

### ✅ Pixabay Integration
- Search API client (`lib/pixabay/client.ts`)
- Track download workflow
- Format selection (MP3 preferred)

### ✅ Admin Interface (`/admin/music`)
- **Browse Pixabay Tab**: Search and download tracks
- **Downloaded Tracks Tab**: Manage tracks in storage
- **Playlists Tab**: Create context-specific playlists
- **Settings Tab**: (Placeholder for future)

### ✅ API Routes
- `GET /api/admin/music/search-pixabay` - Search Pixabay
- `POST /api/admin/music/download-track` - Download track
- `GET /api/music/tracks` - List tracks (public)
- `GET /api/music/playlists` - List playlists (public)
- `PATCH /api/admin/music/tracks` - Update track
- `DELETE /api/admin/music/tracks` - Delete track
- `POST /api/admin/music/playlists` - Create playlist
- `PATCH /api/admin/music/playlists` - Update playlist
- `DELETE /api/admin/music/playlists` - Delete playlist

---

## Usage Workflow

### Downloading Tracks

1. Go to `/admin/music`
2. Click "Browse Pixabay" tab
3. Search for "pokemon lofi" or other terms
4. Click "Preview" to test track
5. Click "Download" to add to library
6. Track is automatically:
   - Downloaded from Pixabay
   - Uploaded to Supabase Storage
   - Metadata saved to database

### Creating Playlists

1. Go to `/admin/music` → "Playlists" tab
2. Click "Create Playlist"
3. Fill in:
   - Name (e.g., "Draft Session Music")
   - Description (optional)
   - Context Type (draft, battle, focus, ambient, custom)
   - Select tracks
   - Set as default (optional)
4. Click "Create Playlist"

### Managing Tracks

1. Go to `/admin/music` → "Downloaded Tracks" tab
2. Use filters:
   - Search by title/artist
   - Filter by mood tag
3. Actions:
   - **Play**: Preview track
   - **Activate/Deactivate**: Toggle availability
   - **Delete**: Soft delete (deactivates)

---

## Next Steps (Phase 2)

- [ ] Build music player component
- [ ] Implement context-aware playlist switching
- [ ] Add PWA offline caching
- [ ] Create user-facing music player UI

---

## Troubleshooting

### "Pixabay API key is required"
- Ensure `PIXABAY_API_KEY` is set in `.env.local`
- Restart dev server after adding env var

### "Bucket not found"
- Create `music-tracks` bucket in Supabase Storage
- Set bucket to public

### "Failed to download track"
- Check Pixabay API key is valid
- Verify track URL is accessible
- Check network connectivity

---

**Status**: ✅ Phase 1 Complete - Ready for track downloads and playlist creation
