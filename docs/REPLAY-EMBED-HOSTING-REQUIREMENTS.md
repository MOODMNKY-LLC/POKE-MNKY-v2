# Replay Embed Hosting Requirements

**Date**: January 15, 2026  
**Purpose**: Clarify what must be hosted on server vs what can be built into Next.js app

---

## Quick Answer

**You can build the replay viewer directly into your Next.js app!** You don't need the separate `aab-replay.moodmnky.com` server if you use `replay-embed.js`.

---

## What MUST Stay on Your Server

### 1. **Showdown Server** (`aab-showdown.moodmnky.com`)
**Why**: Stores and serves replay log files

**Required For**:
- Storing battle replay logs (`.log` files)
- Serving replay data via API endpoints:
  - `https://aab-showdown.moodmnky.com/replay/{format}-{id}.log`
  - `https://aab-showdown.moodmnky.com/replay/{format}-{id}.json`

**Cannot be replaced**: This is where battles happen and replays are stored.

---

### 2. **Showdown Client** (`aab-play.moodmnky.com`)
**Why**: Provides `replay-embed.js` and sprite assets

**Required For**:
- Serving `replay-embed.js` file: `https://aab-play.moodmnky.com/js/replay-embed.js`
- Serving Pokemon sprites: `https://aab-play.moodmnky.com/sprites/`
- Providing battle client functionality

**Alternative**: You could use the official Showdown client (`play.pokemonshowdown.com`) for `replay-embed.js`, but using your own ensures:
- Custom sprites work correctly
- No dependency on external service
- Consistent branding

---

## What CAN Be Built Into Next.js App

### ✅ **Replay Viewer Component**

**Built into app using `replay-embed.js`**:
```tsx
// components/showdown/replay-viewer.tsx
'use client';

import { useEffect, useRef } from 'react';

export function ReplayViewer({ replayId }: { replayId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load replay-embed.js from your Showdown client
    const script = document.createElement('script');
    script.src = 'https://aab-play.moodmnky.com/js/replay-embed.js';
    
    script.onload = async () => {
      // Fetch replay log from Showdown server
      const logResponse = await fetch(
        `https://aab-showdown.moodmnky.com/replay/${replayId}.log`
      );
      const logText = await logResponse.text();
      
      // Initialize replay viewer (API depends on replay-embed.js)
      // This would initialize the viewer in containerRef.current
    };
    
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, [replayId]);

  return <div ref={containerRef} className="replay-container" />;
}
```

**Benefits**:
- Fully integrated into your app UI
- Matches your app's design system
- No separate server needed
- Better performance (no full page load)

---

### ✅ **Replay Library Page**

**Built into app**:
```tsx
// app/showdown/replay-library/page.tsx
import { ReplayViewer } from '@/components/showdown/replay-viewer';

export default function ReplayLibraryPage() {
  return (
    <div className="container">
      <h1>Replay Library</h1>
      <ReplayViewer replayId="gen9randombattle-35" />
    </div>
  );
}
```

**Benefits**:
- Consistent navigation
- Integrated with your app's routing
- Can add custom features (search, filters, etc.)

---

## What You DON'T Need Anymore

### ❌ **Separate Replay Server** (`aab-replay.moodmnky.com`)

**Current Setup**: Separate Showdown client instance serving replay pages

**Why Not Needed**:
- The replay viewer can be built into your Next.js app
- `replay-embed.js` handles the rendering
- You just need to fetch the log data and initialize the embed

**Can Be Replaced By**:
- Next.js component using `replay-embed.js`
- Direct integration in your app

**Note**: You can keep it for now as a fallback, but it's not required for app integration.

---

## Architecture Comparison

### Current Architecture (Separate Replay Server)

```
┌─────────────────┐
│  Next.js App    │
│  (Vercel)       │
└────────┬────────┘
         │
         │ Links to
         ▼
┌─────────────────┐
│ aab-replay      │  ← Separate replay server
│ .moodmnky.com   │
└────────┬────────┘
         │
         │ Fetches from
         ▼
┌─────────────────┐
│ aab-showdown    │  ← Showdown server (stores logs)
│ .moodmnky.com   │
└─────────────────┘
```

### Recommended Architecture (Built Into App)

```
┌─────────────────────────────────┐
│      Next.js App (Vercel)       │
│  ┌───────────────────────────┐ │
│  │ ReplayViewer Component     │ │  ← Built into app
│  │ (uses replay-embed.js)     │ │
│  └───────────┬─────────────────┘ │
└──────────────┼───────────────────┘
               │
               │ Fetches log from
               ▼
┌─────────────────┐
│ aab-showdown    │  ← Showdown server (stores logs)
│ .moodmnky.com   │
└────────┬────────┘
         │
         │ Loads embed script from
         ▼
┌─────────────────┐
│ aab-play        │  ← Showdown client (provides replay-embed.js)
│ .moodmnky.com   │
└─────────────────┘
```

---

## Implementation Steps

### Step 1: Create Replay Viewer Component

Create a React component that:
1. Loads `replay-embed.js` from your Showdown client
2. Fetches replay log from your Showdown server
3. Initializes the replay viewer
4. Renders in your app

### Step 2: Integrate into Replay Library

Add the component to your existing replay library page:
- Replace external links with embedded viewer
- Add navigation controls
- Style to match your app

### Step 3: (Optional) Remove Separate Replay Server

Once the component works:
- You can remove `aab-replay.moodmnky.com` if desired
- Or keep it as a fallback/external link option

---

## Data Flow

### How It Works

1. **User visits replay page** in your Next.js app
2. **Component loads** `replay-embed.js` from `aab-play.moodmnky.com`
3. **Component fetches** replay log from `aab-showdown.moodmnky.com/replay/{id}.log`
4. **replay-embed.js initializes** with the log data
5. **Replay renders** directly in your app component
6. **Sprites load** from `aab-play.moodmnky.com/sprites/` (or MinIO)

---

## Requirements Summary

| Component | Location | Required? | Purpose |
|-----------|----------|-----------|---------|
| Showdown Server | `aab-showdown.moodmnky.com` | ✅ **YES** | Stores replay logs |
| Showdown Client | `aab-play.moodmnky.com` | ✅ **YES** | Provides `replay-embed.js` and sprites |
| Replay Server | `aab-replay.moodmnky.com` | ❌ **NO** | Can be replaced by Next.js component |
| Replay Viewer | Next.js App | ✅ **YES** | Built into app using `replay-embed.js` |

---

## Benefits of Building Into App

1. **Better Integration**: Matches your app's design and navigation
2. **Performance**: No full page reload, faster initial load
3. **Customization**: Full control over UI/UX
4. **Simplified Architecture**: One less server to maintain
5. **Better UX**: Seamless experience within your app

---

## Next Steps

1. **Research replay-embed.js API**: Understand how to initialize it
2. **Create prototype component**: Test with a single replay
3. **Integrate into replay library**: Replace external links
4. **Test and refine**: Ensure it works with all replay formats
5. **Consider removing replay server**: Once component is stable

---

**Last Updated**: January 15, 2026  
**Status**: Ready for Implementation
