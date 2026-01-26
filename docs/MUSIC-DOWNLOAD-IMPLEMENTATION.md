# Music Download Implementation Plan

## Overview

Since Pixabay's API doesn't support music search (only images and videos), we're implementing a direct download approach that scrapes the Pixabay music search page and downloads tracks to Supabase Storage.

## Architecture

### Storage Bucket
- **Name**: `music-tracks`
- **Public**: Yes (for direct audio playback)
- **File Size Limit**: 50MB
- **Allowed MIME Types**: `audio/mpeg`, `audio/mp3`, `audio/ogg`, `audio/wav`, `audio/webm`

### Database Schema
Tracks are stored in `music_tracks` table with:
- `pixabay_id` (unique identifier)
- `pixabay_url` (source page URL)
- `title`, `artist`
- `storage_path` (path in Supabase Storage)
- `storage_url` (public CDN URL)
- `duration`, `file_size`
- `mood_tags` (array of tags)

### Download Flow

1. **Admin triggers download** via UI button
2. **API endpoint** (`/api/admin/music/download-pixabay-page`) scrapes Pixabay search page
3. **Extract track information** from HTML (JSON-LD, data attributes, href links)
4. **For each track**:
   - Fetch individual track page
   - Extract download URL
   - Download audio file
   - Upload to Supabase Storage (`music-tracks` bucket)
   - Save metadata to `music_tracks` table
5. **Return results** with success/failure for each track

## Implementation Files

### Configuration
- `supabase/config.toml` - Added `music-tracks` bucket configuration
- `supabase/migrations/20260125020000_create_music_tracks_bucket.sql` - Bucket creation documentation and policies

### API Endpoint
- `app/api/admin/music/download-pixabay-page/route.ts` - Main download logic

### UI Components
- `components/admin/music/pixabay-track-browser.tsx` - Added download button

## Usage

1. **Local Setup**:
   ```bash
   # Ensure Supabase is running
   supabase start
   
   # The bucket will be created automatically from config.toml
   ```

2. **Production Setup**:
   - Create `music-tracks` bucket in Supabase Dashboard
   - Set as public
   - Configure file size limit (50MB)
   - Set allowed MIME types

3. **Download Tracks**:
   - Navigate to `/admin/music`
   - Click "Download First Page" button in Browse Pixabay tab
   - Tracks will be downloaded and stored automatically

## Current Limitations

- **Scraping Approach**: Relies on HTML parsing which may break if Pixabay changes their page structure
- **Rate Limiting**: Pixabay may rate limit requests if downloading too many tracks
- **Download URLs**: Some tracks may not have direct download URLs accessible

## Future Improvements

1. **Better HTML Parsing**: Use a headless browser (Puppeteer/Playwright) for more reliable extraction
2. **Batch Processing**: Add pagination support to download multiple pages
3. **Error Handling**: Better retry logic and error reporting
4. **Progress Tracking**: Show download progress for individual tracks
5. **Duplicate Detection**: Skip tracks that already exist in database

## Testing

1. Test with the provided URL: `https://pixabay.com/music/search/pokemon%20lofi/`
2. Verify tracks are downloaded to Supabase Storage
3. Verify metadata is saved to `music_tracks` table
4. Test playback from storage URLs

## Notes

- This approach bypasses Pixabay's API limitations
- Tracks are stored locally in Supabase Storage for fast playback
- Public bucket allows direct audio playback without authentication
- Future downloads can use the same endpoint with different search URLs
