# Pokepedia Sync Component Breakdown

## Component Location
**File**: `components/pokepedia-sync-provider.tsx`  
**Position**: Bottom-right corner (`fixed bottom-4 right-4`)  
**Wrapped in**: Root layout (`app/layout.tsx`)

---

## What It Does

### Purpose
Syncs Pokemon data from PokeAPI to Supabase database for offline-first access.

### Current Functionality
1. **Auto-starts on app load** (`autoStart={true}`)
2. **Checks local IndexedDB** for cached Pokemon
3. **Syncs master data** (types, abilities, moves) from Supabase
4. **Syncs critical Pokemon** (1-50) from Supabase
5. **Triggers background sync** via Edge Function for remaining Pokemon
6. **Shows progress banner** in bottom-right corner

---

## Component Structure

### Provider Component
- **`PokepediaSyncProvider`** - Wraps entire app
- Provides sync state via React Context
- Renders sync banner UI

### Hook
- **`usePokepediaSync`** (`hooks/use-pokepedia-sync.ts`)
- Manages sync state and operations
- Auto-runs on mount if `autoStart=true`

---

## Connections & Dependencies

### 1. Database Tables (Supabase)
- `sync_jobs` - Tracks sync progress
- `pokemon_comprehensive` - Pokemon data
- `types`, `abilities`, `moves` - Master data
- `pokemon_types`, `pokemon_abilities`, `pokemon_stats_comprehensive` - Relationships

### 2. Local Storage (IndexedDB)
- **Dexie.js** database (`lib/pokepedia-offline-db.ts`)
- Tables: `pokemon`, `master_data`, `sync_status`
- Stores data locally for offline access

### 3. API Routes
- **`/api/sync/pokepedia`** (`app/api/sync/pokepedia/route.ts`)
- Proxies to Supabase Edge Function
- Triggers background sync jobs

### 4. Edge Function
- **`sync-pokepedia`** (`supabase/functions/sync-pokepedia/index.ts`)
- Runs comprehensive sync phases:
  - `master` - Types, abilities, moves, stats
  - `reference` - Generations, colors, habitats
  - `species` - Pokemon species
  - `pokemon` - Individual Pokemon
  - `relationships` - Type/ability/stat relationships

### 5. External API
- **PokeAPI** - Source of Pokemon data
- Fetches via Edge Function (not directly from client)

---

## Sync Flow

```
App Loads
    ↓
PokepediaSyncProvider mounts
    ↓
usePokepediaSync hook runs
    ↓
checkLocalStatus() - Check IndexedDB
    ↓
If empty or stale:
    ├─ syncMasterData() → Fetch from Supabase
    ├─ syncCriticalPokemon() → Fetch Pokemon 1-50
    └─ triggerBackgroundSync() → Call Edge Function
        ↓
    Edge Function syncs remaining Pokemon from PokeAPI
    ↓
    Updates sync_jobs table
    ↓
    Client polls sync_jobs for progress
```

---

## UI Elements

### Banner (Bottom-Right)
- **Status Badge**: Syncing, Completed, Error, Stopped, Idle
- **Progress Bar**: Shows sync percentage
- **Info Button**: Opens comprehensive status modal
- **Start/Restart Button**: Manual sync control
- **Message**: Current sync phase/status
- **Time Remaining**: Estimated completion time

### Comprehensive Status Modal
- **Component**: `PokepediaComprehensiveStatus`
- **Shows**:
  - Database counts (types, abilities, moves, Pokemon, etc.)
  - PokeAPI comparison (local vs remote)
  - Connectivity status
  - Generation flags

---

## Key Functions

### `usePokepediaSync` Hook
- `checkLocalStatus()` - Checks IndexedDB and sync_jobs
- `syncMasterData()` - Syncs types/abilities/moves from Supabase
- `syncCriticalPokemon()` - Syncs first 50 Pokemon
- `triggerBackgroundSync(phase)` - Calls Edge Function
- `startSync()` - Main sync orchestrator

### `PokepediaSyncProvider` Component
- `handleStartSync()` - Starts sync manually
- `handleRestartSync()` - Restarts sync
- `shouldShowBanner` - Controls banner visibility

---

## When Banner Shows

Banner appears when:
- ✅ Sync is running (`status === "syncing"`)
- ✅ Sync stopped (`status === "stopped"`)
- ✅ Sync error (`status === "error"`)
- ✅ Idle with no local data (`status === "idle" && localCount === 0`)
- ✅ Completed but incomplete (`status === "completed" && progress < 100`)

Banner hides when:
- ✅ Completed with full data (`status === "completed" && progress === 100`)
- ✅ Idle with cached data (`status === "idle" && localCount > 0`)

---

## Data Flow

### Read Operations
1. **Check IndexedDB** (local, instant)
2. **Query Supabase** (REST API)
3. **Store in IndexedDB** (cache locally)

### Write Operations
1. **Edge Function** writes to Supabase
2. **Client reads** from Supabase
3. **Client stores** in IndexedDB

---

## Repurposing Options

### Current Use Case
- Syncs Pokemon data from PokeAPI
- Enables offline-first access
- Shows sync progress

### Potential Repurposing
1. **Google Sheets Sync Status** - Show sheet sync progress
2. **General Sync Indicator** - Any background sync operation
3. **Notification System** - General app notifications
4. **Status Dashboard** - System health indicators

---

## Files Involved

### Core Components
- `components/pokepedia-sync-provider.tsx` - Provider & UI
- `hooks/use-pokepedia-sync.ts` - Sync logic
- `lib/pokepedia-offline-db.ts` - IndexedDB layer

### API & Functions
- `app/api/sync/pokepedia/route.ts` - API route
- `supabase/functions/sync-pokepedia/index.ts` - Edge Function

### Database
- `supabase/migrations/*sync*.sql` - Sync job tables
- `sync_jobs` table - Progress tracking

---

## Context Usage

Other components can access sync state:
```tsx
import { usePokepediaSyncContext } from "@/components/pokepedia-sync-provider"

const { status, progress, startSync } = usePokepediaSyncContext()
```

---

**Summary**: This is a comprehensive Pokemon data sync system that runs on app start, syncs data to Supabase and IndexedDB, and shows progress in a bottom-right banner. It's currently focused on Pokepedia sync but could be repurposed for other sync operations.
