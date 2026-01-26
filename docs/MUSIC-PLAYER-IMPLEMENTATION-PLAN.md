# In-App Music Player Implementation Plan

**Date**: 2026-01-25  
**Status**: Planning Phase  
**Source**: Pixabay Pokémon Lo-Fi Music Integration

---

## Executive Summary

Build a seamless, context-aware in-app music experience using Pixabay royalty-free Pokémon lo-fi tracks. The system will feature:
- **Admin-managed track library** (download from Pixabay → Supabase Storage)
- **Context-aware playlists** (Draft Mode, Battle Prep, Focus Mode, etc.)
- **PWA-optimized** with offline caching
- **Seamless UX** with persistent state and smooth transitions

---

## Architecture Decision: Download vs Stream

### ✅ **Recommended: Hybrid Approach (Download + CDN)**

**Strategy**: Download tracks to Supabase Storage → Serve via CDN → Cache offline

**Rationale**:
1. **PWA Offline Support**: Pre-cached tracks work offline (critical for long draft sessions)
2. **Performance**: CDN caching reduces latency, Smart CDN improves hit rates
3. **Cost Efficiency**: Lower egress costs with cached content
4. **User Experience**: Instant playback, no buffering delays
5. **Admin Control**: Curated track selection, not dependent on Pixabay availability

**Flow**:
```
Pixabay API → Admin Download → Supabase Storage → CDN → User Browser → Service Worker Cache
```

---

## Technical Architecture

### Storage Layer

**Supabase Storage Bucket**: `music-tracks`
- **Structure**:
  ```
  music-tracks/
  ├── pokemon-lofi/
  │   ├── track-001.mp3
  │   ├── track-002.mp3
  │   └── ...
  ├── battle-themes/
  ├── draft-music/
  └── ambient/
  ```

**Database Schema** (Supabase Postgres):
```sql
-- Music tracks table
CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  pixabay_id INTEGER UNIQUE,
  pixabay_url TEXT,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  duration INTEGER, -- seconds
  file_size INTEGER, -- bytes
  mood_tags TEXT[], -- ['draft', 'battle', 'focus', 'ambient']
  bpm INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlists table
CREATE TABLE music_playlists (
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
CREATE TABLE user_music_preferences (
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

-- Indexes
CREATE INDEX idx_music_tracks_mood_tags ON music_tracks USING GIN(mood_tags);
CREATE INDEX idx_music_tracks_active ON music_tracks(is_active);
CREATE INDEX idx_music_playlists_context ON music_playlists(context_type, is_active);
```

---

## Component Architecture

### 1. Admin Music Management (`/admin/music`)

**Purpose**: Download and manage tracks from Pixabay

**Features**:
- **Pixabay Search Interface**: Search for Pokémon lo-fi tracks
- **Bulk Download**: Select multiple tracks → Download → Upload to Supabase Storage
- **Track Management**: View, edit, activate/deactivate tracks
- **Playlist Builder**: Create context-specific playlists
- **Preview Player**: Test tracks before making them available

**Components**:
- `components/admin/music/pixabay-track-browser.tsx` - Search and browse Pixabay
- `components/admin/music/track-manager.tsx` - Manage downloaded tracks
- `components/admin/music/playlist-builder.tsx` - Create/edit playlists
- `app/api/admin/music/download-track/route.ts` - Download from Pixabay → Storage

### 2. Music Player Component (`components/music/music-player.tsx`)

**Purpose**: Persistent, context-aware music player

**Features**:
- **Floating Player**: Bottom-right corner (minimizable)
- **Context Detection**: Auto-switch playlists based on route
- **Playback Controls**: Play/pause, skip, volume, shuffle, repeat
- **Playlist Selector**: Switch between available playlists
- **Visual Feedback**: Now playing indicator, progress bar
- **PWA Support**: Works offline, background playback

**State Management**:
- React Context: `MusicPlayerProvider`
- Persist to localStorage: Volume, enabled state, current track
- Sync to database: User preferences (authenticated users)

### 3. Context-Aware Playlist System

**Route-Based Playlists**:
- `/draft` → "Draft Mode Music" playlist
- `/showdown` → "Battle Prep" playlist
- `/dashboard` → "Focus Mode" playlist
- `/` (homepage) → "Ambient" playlist
- Default → "General" playlist

**Implementation**:
```typescript
// lib/music/playlist-context.ts
export function getPlaylistForRoute(route: string): string {
  if (route.startsWith('/draft')) return 'draft'
  if (route.startsWith('/showdown')) return 'battle'
  if (route.startsWith('/dashboard')) return 'focus'
  if (route === '/') return 'ambient'
  return 'general'
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Database & Storage**:
- [ ] Create Supabase migrations for music tables
- [ ] Create `music-tracks` bucket in Supabase Storage
- [ ] Set up RLS policies (public read, admin write)

**Admin Interface**:
- [ ] Build Pixabay API integration (`lib/pixabay/client.ts`)
- [ ] Create admin music management page (`/admin/music`)
- [ ] Implement track download → storage workflow
- [ ] Basic track listing and management UI

**API Routes**:
- [ ] `POST /api/admin/music/download-track` - Download from Pixabay
- [ ] `GET /api/music/tracks` - List available tracks
- [ ] `GET /api/music/playlists` - List playlists

### Phase 2: Music Player (Week 2)

**Core Player**:
- [ ] Build `MusicPlayer` component with HTML5 audio
- [ ] Implement playback controls (play/pause/skip/volume)
- [ ] Add playlist switching
- [ ] Implement shuffle and repeat modes

**State Management**:
- [ ] Create `MusicPlayerProvider` context
- [ ] Implement localStorage persistence
- [ ] Add user preferences sync (authenticated users)

**UI/UX**:
- [ ] Floating player component (minimizable)
- [ ] Now playing indicator
- [ ] Smooth track transitions (fade in/out)
- [ ] Mobile-responsive design

### Phase 3: Context Awareness (Week 3)

**Route Detection**:
- [ ] Implement route-based playlist switching
- [ ] Add smooth transitions between playlists
- [ ] Handle navigation without interrupting playback

**Playlist Management**:
- [ ] Build playlist builder UI
- [ ] Create default playlists for each context
- [ ] Allow custom playlist creation (future)

**PWA Integration**:
- [ ] Add service worker caching for audio files
- [ ] Implement range request support (Workbox)
- [ ] Add offline playback support
- [ ] Background playback support

### Phase 4: Polish & Optimization (Week 4)

**Performance**:
- [ ] Implement track preloading (next track in queue)
- [ ] Add CDN cache headers optimization
- [ ] Optimize audio file formats (MP3 vs OGG)

**User Experience**:
- [ ] Add "Enable Music" onboarding flow
- [ ] Implement volume fade-in on first play
- [ ] Add keyboard shortcuts (space = play/pause)
- [ ] Add visual feedback for track changes

**Admin Enhancements**:
- [ ] Bulk track operations
- [ ] Track analytics (most played, etc.)
- [ ] Playlist analytics

---

## UI/UX Design Considerations

### Music Player Placement

**Desktop**: Floating player in bottom-right corner
- Minimizable to small icon
- Expandable to full player view
- Always accessible, non-intrusive

**Mobile**: Bottom sheet player
- Swipe up to expand
- Swipe down to minimize
- PWA-safe area handling

### Visual Design

**Theme Integration**:
- Use app's Pokémon color palette (red/blue primary, gold/black premium)
- Match existing UI components (shadcn/ui)
- Subtle animations (Pokéball spinner for loading)

**Player States**:
- **Disabled**: Subtle "Enable Music" button in header
- **Enabled (Minimized)**: Small icon with now-playing indicator
- **Enabled (Expanded)**: Full player with controls and playlist

### User Flow

1. **First Visit**: 
   - Subtle prompt: "🎧 Enable ambient music?"
   - One-click enable → Music starts at low volume (30%)

2. **Returning User**:
   - Music auto-resumes if previously enabled
   - Remembers last track and position
   - Seamless experience

3. **Context Switching**:
   - User navigates to `/draft` → Playlist auto-switches
   - Smooth fade transition between tracks
   - No jarring interruptions

---

## Technical Implementation Details

### Pixabay API Integration

```typescript
// lib/pixabay/client.ts
export class PixabayClient {
  private apiKey: string
  private baseUrl = 'https://pixabay.com/api/'

  async searchMusic(query: string, options?: {
    category?: string
    min_duration?: number
    max_duration?: number
    per_page?: number
  }) {
    // Search for music tracks
  }

  async downloadTrack(trackUrl: string): Promise<Buffer> {
    // Download track file
  }
}
```

### Admin Download Workflow

```typescript
// app/api/admin/music/download-track/route.ts
export async function POST(request: NextRequest) {
  // 1. Validate admin role
  // 2. Fetch track from Pixabay URL
  // 3. Upload to Supabase Storage
  // 4. Extract metadata (duration, etc.)
  // 5. Save to music_tracks table
  // 6. Return track info
}
```

### Music Player Implementation

```typescript
// components/music/music-player.tsx
export function MusicPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    volume,
    playlist,
    play,
    pause,
    skip,
    setVolume 
  } = useMusicPlayer()

  // HTML5 Audio element
  const audioRef = useRef<HTMLAudioElement>(null)

  // Handle track changes
  useEffect(() => {
    if (currentTrack) {
      audioRef.current.src = currentTrack.storage_url
      audioRef.current.load()
    }
  }, [currentTrack])

  // Auto-play on track change
  useEffect(() => {
    if (currentTrack && isPlaying) {
      audioRef.current?.play()
    }
  }, [currentTrack, isPlaying])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Player UI */}
    </div>
  )
}
```

### Service Worker Caching

```typescript
// public/sw.js (or next-pwa config)
// Cache audio files with range request support
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/storage/v1/object/public/music-tracks/'),
  new workbox.strategies.CacheFirst({
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [200],
      }),
      new workbox.rangeRequests.RangeRequestsPlugin(),
    ],
  })
)
```

---

## Admin Component Design

### `/admin/music` Page Structure

**Tabs**:
1. **Browse Pixabay**: Search and preview tracks
2. **Downloaded Tracks**: Manage tracks in storage
3. **Playlists**: Create and manage playlists
4. **Settings**: Music player configuration

**Browse Pixabay Tab**:
- Search bar: "Search Pokémon lo-fi music"
- Results grid with preview buttons
- "Download to Library" button for each track
- Bulk selection and download

**Downloaded Tracks Tab**:
- Table view: Title, Artist, Duration, Mood Tags, Status
- Actions: Edit, Activate/Deactivate, Delete
- Filter by mood tags
- Search functionality

**Playlists Tab**:
- List of playlists with context type
- "Create Playlist" button
- Drag-and-drop track ordering
- Set as default for context

---

## Storage Strategy Details

### Why Download to Storage (Not Direct Streaming)

1. **Offline Support**: Critical for PWA, especially during long draft sessions
2. **Performance**: CDN caching provides faster load times than Pixabay
3. **Reliability**: Not dependent on Pixabay availability
4. **Control**: Curated selection, admin-managed
5. **Cost**: Lower egress with cached content

### File Format Considerations

**MP3**:
- ✅ Universal browser support
- ✅ Smaller file sizes
- ✅ Good quality at 128-192 kbps

**OGG**:
- ✅ Better compression
- ⚠️ Not supported in Safari/iOS

**Recommendation**: Store as MP3 (192 kbps) for universal compatibility

### CDN Configuration

```typescript
// Supabase Storage upload with cache headers
await supabase.storage
  .from('music-tracks')
  .upload(path, file, {
    contentType: 'audio/mpeg',
    cacheControl: '31536000', // 1 year cache
    upsert: true
  })
```

---

## User Experience Flow

### First-Time User

1. User lands on homepage
2. Sees subtle music prompt: "🎧 Enable ambient music?"
3. Clicks "Enable"
4. Music starts playing at 30% volume
5. Player appears in bottom-right (minimized)
6. User can expand to see controls

### Returning User

1. User returns to app
2. Music auto-resumes (if previously enabled)
3. Last track continues from where it left off
4. Seamless experience, no prompts

### Context Switching

1. User browsing homepage → Ambient playlist
2. User navigates to `/draft` → Auto-switches to Draft playlist
3. Smooth fade transition (2 seconds)
4. No jarring interruptions

### Mobile Experience

1. Player appears as bottom sheet
2. Swipe up to expand, down to minimize
3. Safe area handling (notch support)
4. Background playback support (PWA)

---

## Security & Permissions

### RLS Policies

```sql
-- Public read access for tracks
CREATE POLICY "Public can read active tracks"
ON music_tracks FOR SELECT
USING (is_active = true);

-- Admin write access
CREATE POLICY "Admins can manage tracks"
ON music_tracks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- User preferences (own data only)
CREATE POLICY "Users can manage own preferences"
ON user_music_preferences FOR ALL
USING (auth.uid() = user_id);
```

### Storage Bucket Policies

- **Public Read**: All users can read tracks
- **Admin Write**: Only admins can upload tracks
- **No Delete**: Tracks are soft-deleted (is_active = false)

---

## Performance Optimizations

### Preloading Strategy

```typescript
// Preload next track in queue
useEffect(() => {
  if (currentTrack && playlist) {
    const nextIndex = (currentIndex + 1) % playlist.tracks.length
    const nextTrack = playlist.tracks[nextIndex]
    
    // Preload next track
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = nextTrack.storage_url
    document.head.appendChild(link)
  }
}, [currentTrack, playlist])
```

### Lazy Loading

- Only load playlist tracks when playlist is selected
- Lazy load track metadata (duration, etc.)
- Progressive enhancement (works without JS, better with)

### Caching Strategy

- **Service Worker**: Cache audio files for offline playback
- **Browser Cache**: Long cache headers (1 year)
- **CDN Cache**: Smart CDN for global distribution

---

## Future Enhancements

### Phase 5+ (Future)

- **User-Created Playlists**: Allow users to create custom playlists
- **Track Favorites**: Users can favorite tracks
- **Playback History**: Track what users listen to
- **Analytics Dashboard**: Most played tracks, popular playlists
- **Crossfade**: Smooth transitions between tracks
- **EQ Controls**: Basic equalizer (bass, treble)
- **Visualizer**: Audio waveform visualization
- **Social Features**: Share playlists, collaborative playlists

---

## Success Metrics

### User Engagement
- % of users who enable music
- Average session length with music enabled
- Most popular playlists
- Track skip rates

### Technical Performance
- Track load time (target: <500ms)
- Offline playback success rate
- Cache hit rate
- Storage usage

### Business Impact
- User retention (music-enabled vs non-enabled)
- Session duration increase
- User satisfaction (qualitative feedback)

---

## Implementation Checklist

### Database Setup
- [ ] Create migrations for music tables
- [ ] Set up RLS policies
- [ ] Create indexes for performance

### Storage Setup
- [ ] Create `music-tracks` bucket
- [ ] Configure bucket policies
- [ ] Set up CDN (Smart CDN if available)

### Admin Interface
- [ ] Build Pixabay API client
- [ ] Create admin music management page
- [ ] Implement track download workflow
- [ ] Build playlist builder

### Music Player
- [ ] Build core player component
- [ ] Implement playback controls
- [ ] Add context-aware playlist switching
- [ ] Add PWA offline support

### Testing
- [ ] Test track download workflow
- [ ] Test offline playback
- [ ] Test context switching
- [ ] Test mobile experience
- [ ] Performance testing

---

## Questions to Answer

1. **Music Always On or Opt-In?**
   - **Recommendation**: Opt-in with subtle prompt (better UX, respects user choice)

2. **Playlists Global or Per Feature?**
   - **Recommendation**: Both - default playlists per context, but allow custom playlists

3. **Crossfades or Simple Playback?**
   - **Recommendation**: Start with simple playback, add crossfades in Phase 4

4. **Track Selection Strategy?**
   - **Recommendation**: Admin-curated selection from Pixabay (quality over quantity)

---

**Status**: Ready for implementation  
**Next Steps**: Begin Phase 1 - Database & Storage setup
