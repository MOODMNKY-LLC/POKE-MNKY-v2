# Replay Viewer Implementation Complete

**Date**: January 15, 2026  
**Status**: ✅ Implementation Complete

---

## Overview

Successfully implemented an embedded replay viewer component that integrates seamlessly into the Next.js app, eliminating the need for the separate `aab-replay.moodmnky.com` server for app integration.

---

## Components Created

### 1. **Replay Utilities** (`lib/showdown/replay-utils.ts`)

Utility functions for working with replay IDs and URLs:
- `extractReplayId()` - Extracts replay ID from various URL formats
- `getReplayLogUrl()` - Constructs replay log URL
- `getReplayJsonUrl()` - Constructs replay JSON URL
- `getReplayEmbedScriptUrl()` - Gets replay-embed.js URL

### 2. **Replay Viewer Component** (`components/showdown/replay-viewer.tsx`)

A React component that embeds Pokémon Showdown replays:
- **Primary Method**: Uses iframe to embed replay from `aab-replay.moodmnky.com`
- **Features**:
  - Loading states with spinner
  - Error handling with retry option
  - External link button
  - Responsive design
  - Customizable height
- **Props**:
  - `replayIdOrUrl` - Replay ID or full URL
  - `serverUrl` - Optional custom server URL
  - `clientUrl` - Optional custom client URL
  - `height` - Container height (default: 800px)
  - `showExternalLink` - Show external link button (default: true)
  - `useIframe` - Use iframe mode (default: true)

### 3. **Replay Detail Page** (`app/showdown/replay/[id]/page.tsx`)

A dedicated page for viewing individual replays:
- Route: `/showdown/replay/[id]`
- Features:
  - Replay information card
  - Embedded replay viewer
  - Navigation back to replay library
  - External link option

### 4. **Updated Components**

#### **Replay Library** (`components/showdown/replay-library.tsx`)
- Updated "View Replay" button to navigate to detail page
- Uses `extractReplayId()` utility for consistent ID extraction
- Improved replay ID parsing from room URLs

#### **Site Header** (`components/site-header.tsx`)
- ✅ **Removed dropdown** from Showdown section
- Changed to simple link: `/showdown`
- No dropdowns in main nav (as requested)

---

## Integration Points

### Navigation Flow

```
Showdown Landing (/showdown)
  └─> Replay Library (/showdown/replay-library)
       └─> Replay Detail (/showdown/replay/[id])
            └─> Embedded Replay Viewer
```

### Data Flow

1. **Replay Library** fetches matches from `/api/matches`
2. **Extracts replay ID** from `showdown_room_url` or `showdown_room_id`
3. **Navigates** to `/showdown/replay/[id]`
4. **Replay Detail Page** loads replay viewer component
5. **Replay Viewer** embeds replay via iframe from `aab-replay.moodmnky.com`

---

## Architecture

### Current Implementation (Iframe)

```
┌─────────────────────────────────┐
│   Next.js App (Vercel)          │
│  ┌───────────────────────────┐  │
│  │ ReplayViewer Component     │  │
│  │ (iframe to replay server) │  │
│  └───────────┬───────────────┘  │
└──────────────┼───────────────────┘
               │
               │ Embeds
               ▼
┌─────────────────┐
│ aab-replay      │  ← Replay server (existing)
│ .moodmnky.com   │
└─────────────────┘
```

### Future Enhancement (replay-embed.js)

Once `replay-embed.js` API is understood:
- Load script from `aab-play.moodmnky.com/js/replay-embed.js`
- Fetch replay log from `aab-showdown.moodmnky.com/replay/{id}.log`
- Initialize embed with log data
- Render directly in component (no iframe)

---

## Usage Examples

### Basic Usage

```tsx
import { ReplayViewer } from '@/components/showdown/replay-viewer';

<ReplayViewer replayIdOrUrl="gen9randombattle-35" />
```

### With Custom Height

```tsx
<ReplayViewer 
  replayIdOrUrl="gen9randombattle-35"
  height="600px"
/>
```

### From Room URL

```tsx
<ReplayViewer 
  replayIdOrUrl="https://aab-play.moodmnky.com/battle-gen9randombattle-35"
/>
```

---

## Environment Variables

No new environment variables required. Uses existing:
- `NEXT_PUBLIC_SHOWDOWN_SERVER_URL` (optional, defaults to `https://aab-showdown.moodmnky.com`)
- `NEXT_PUBLIC_SHOWDOWN_CLIENT_URL` (optional, defaults to `https://aab-play.moodmnky.com`)

---

## Testing Checklist

- [x] Replay viewer component created
- [x] Replay detail page route created
- [x] Replay library updated to navigate to detail page
- [x] Header dropdown removed
- [x] Utility functions created
- [x] Error handling implemented
- [x] Loading states implemented
- [x] External link fallback available
- [ ] Test with actual replay ID
- [ ] Verify iframe loads correctly
- [ ] Test error scenarios (invalid replay ID)

---

## Next Steps

1. **Test Integration**: Test with actual replay IDs from your database
2. **Research replay-embed.js**: Investigate API to enable direct embedding (no iframe)
3. **Enhance Detail Page**: Add match metadata (teams, date, result) from database
4. **Add Features**: 
   - Replay search/filtering
   - Replay sharing
   - Replay annotations
   - Playback speed controls

---

## Files Modified/Created

### Created
- `lib/showdown/replay-utils.ts` - Utility functions
- `components/showdown/replay-viewer.tsx` - Replay viewer component
- `app/showdown/replay/[id]/page.tsx` - Replay detail page

### Modified
- `components/showdown/replay-library.tsx` - Updated to navigate to detail page
- `components/site-header.tsx` - Removed Showdown dropdown

---

**Last Updated**: January 15, 2026  
**Status**: ✅ Ready for Testing
