# YouTube API Setup & Video Gallery Implementation Guide

## Current Status

✅ **YouTube API Enabled**: You've enabled the YouTube Data API v3 in Google Cloud Console  
✅ **Google Credentials**: Service account credentials found  
⚠️ **API Key**: Need to create an API key for YouTube Data API public data access

## Understanding YouTube Data API Authentication

According to the [YouTube Data API documentation](https://developers.google.com/youtube/v3/getting-started), you need **Google Cloud credentials**. For public data access (like listing videos from a public channel), you have two options:

1. **API Key** (Recommended for public data) - Simplest approach
2. **OAuth 2.0** - For user-specific data
3. **Service Account** - May work but API key is preferred for public data

## Step 1: Create an API Key in Google Cloud Console

Even though you have service account credentials, for YouTube Data API public data access, you need to create an **API Key** in the same Google Cloud project:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the same one where YouTube Data API v3 is enabled)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Copy the API key

**Important**: 
- This is a **Google API key** (not a separate "YouTube API key")
- It's enabled for YouTube Data API v3 because the API is enabled in your project
- Consider restricting the API key to YouTube Data API v3 only for security

## Step 2: Add API Key to Environment Variables

Add the following to your `.env.local` file:

```bash
# YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key_here
```

**Note**: The test script checks for these variable names (in order):
- `YOUTUBE_API_KEY` (preferred)
- `GOOGLE_API_KEY`
- `NEXT_PUBLIC_YOUTUBE_API_KEY`
- `YOUTUBE_DATA_API_KEY`

## Step 3: Test API Access

Run the test script to verify everything works:

```bash
npx tsx scripts/test-youtube-api.ts
```

This will:
- ✅ Verify API key is valid
- ✅ Resolve channel handle `@aabdraftleague` to channel ID
- ✅ Fetch channel information (title, subscriber count, video count)
- ✅ Fetch recent videos from the channel

## Step 4: Implementation Plan

Once the API test passes, we can build:

### Video Gallery Component Features

1. **Channel Information Display**
   - Channel title and thumbnail
   - Subscriber count
   - Total video count
   - Channel description

2. **Video Grid/List View**
   - Responsive grid layout
   - Video thumbnails
   - Video titles
   - Published dates
   - View counts (if available)
   - Duration

3. **Video Player Integration**
   - Embedded YouTube player
   - Modal/overlay player
   - Playlist navigation

4. **Filtering & Sorting**
   - Sort by date (newest/oldest)
   - Search videos by title
   - Pagination for large video lists

5. **API Integration**
   - Server-side API route (`/api/youtube/channel`)
   - Server-side API route (`/api/youtube/videos`)
   - Caching for performance
   - Error handling

### Technical Stack

- **API Client**: `googleapis` (already installed)
- **Frontend**: Next.js Server Components + Client Components
- **UI**: Existing shadcn/ui components
- **Caching**: Next.js caching or React Query

### File Structure

```
app/
  api/
    youtube/
      channel/
        route.ts          # Get channel info
      videos/
        route.ts          # Get videos list
components/
  youtube/
    VideoGallery.tsx      # Main gallery component
    VideoCard.tsx         # Individual video card
    VideoPlayer.tsx       # Video player modal
lib/
  youtube/
    client.ts            # YouTube API client wrapper
    types.ts             # TypeScript types
scripts/
  test-youtube-api.ts    # ✅ Already created
```

## Next Steps

1. **Add API Key**: Add `YOUTUBE_API_KEY` to `.env.local`
2. **Test Access**: Run `npx tsx scripts/test-youtube-api.ts`
3. **Confirm Success**: Verify test script shows channel info and videos
4. **Build Components**: Once confirmed, we'll build the video gallery

## Channel Information

- **Handle**: `@aabdraftleague`
- **URL**: https://youtube.com/@aabdraftleague
- **API Endpoint**: Will resolve to channel ID automatically

## API Quota Considerations

YouTube Data API v3 has default quotas:
- **Quota Units**: 10,000 units per day (default)
- **Common Operations**:
  - `channels.list`: 1 unit
  - `playlistItems.list`: 1 unit
  - `videos.list`: 1 unit

**Recommendations**:
- Cache channel info (changes infrequently)
- Cache video lists with reasonable TTL
- Implement pagination to limit API calls
- Consider server-side caching

## Security Notes

- ✅ API key should be server-side only (not `NEXT_PUBLIC_*`)
- ✅ Consider restricting API key to specific IPs/domains
- ✅ Monitor API usage in Google Cloud Console
- ✅ Set up quota alerts

---

**Ready to proceed?** Add your `YOUTUBE_API_KEY` to `.env.local` and run the test script!
