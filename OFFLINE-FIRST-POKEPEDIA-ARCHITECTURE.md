# Offline-First Pokepedia Architecture

## 🎯 Overview

Comprehensive offline-first Pokepedia sync system that enables:
- ✅ **Progressive sync on app start** (critical data first)
- ✅ **True offline-only mode** (all data cached locally)
- ✅ **Edge Functions background sync** (comprehensive sync continues)
- ✅ **Realtime progress updates** (sync status visible to users)

## 🏗️ Architecture

```
App Start
    ↓
PokepediaSyncProvider (auto-start)
    ↓
┌─────────────────────────────────────┐
│ Phase 1: Master Data (Critical)    │─── ~30s
│ - Types, Abilities, Moves           │   Stored in IndexedDB
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Phase 2: Critical Pokemon (1-50)    │─── ~1min
│ - First 50 Pokemon                  │   Stored in IndexedDB
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Phase 3: Background Sync            │─── ~3 hours (background)
│ - Pokemon 51-1025                   │   Edge Function + Cron
│ - Evolution chains                  │   Updates Supabase + IndexedDB
│ - Additional data                   │   Realtime progress updates
└─────────────────────────────────────┘
```

## 📊 Data Flow

### On App Start
1. **Check Local DB**: `initializeOfflineDB()` checks IndexedDB
2. **If Empty**: Start progressive sync
3. **Master Data First**: Types, abilities, moves (~30s)
4. **Critical Pokemon**: First 50 Pokemon (~1min)
5. **App Usable**: User can use app with critical data
6. **Background Sync**: Trigger Edge Function for remaining data

### Data Access (Offline-First)
```
getPokemonOfflineFirst(id)
    ↓
Check IndexedDB (local)
    ↓ Hit? → Return ✅
    ↓ Miss
Check Supabase
    ↓ Hit? → Return ✅ (optionally cache locally)
    ↓ Miss
Check PokeAPI (if online)
    ↓ Hit? → Return ✅ (cache in Supabase + IndexedDB)
```

## 🔧 Components

### 1. IndexedDB Layer (`lib/pokepedia-offline-db.ts`)
- **Dexie.js** for IndexedDB management
- **Tables**: `pokemon`, `master_data`, `sync_status`
- **Functions**: Store/get/search Pokemon locally

### 2. Client Sync Hook (`hooks/use-pokepedia-sync.ts`)
- **Progressive sync** on app start
- **Realtime subscriptions** for progress
- **State management** for sync status

### 3. Sync Provider (`components/pokepedia-sync-provider.tsx`)
- **Wraps app** in root layout
- **Auto-starts sync** on mount
- **Progress UI** (optional banner)

### 4. Offline Client (`lib/pokepedia-client.ts`)
- **Offline-first data access**
- **Fallback chain**: Local → Supabase → PokeAPI
- **Search functionality**

### 5. Enhanced Edge Function (`supabase/functions/sync-pokepedia/index.ts`)
- **Priority levels**: critical, standard, low
- **Chunked processing** (respects timeouts)
- **Realtime broadcasts**

## 🚀 Usage

### Automatic Sync (On App Start)
```tsx
// Already integrated in app/layout.tsx
<PokepediaSyncProvider autoStart={true}>
  {children}
</PokepediaSyncProvider>
```

### Manual Sync Trigger
```tsx
import { usePokepediaSyncContext } from "@/components/pokepedia-sync-provider"

function MyComponent() {
  const { startSync, status, progress } = usePokepediaSyncContext()
  
  return (
    <button onClick={startSync} disabled={status === "syncing"}>
      Sync Pokepedia ({progress}%)
    </button>
  )
}
```

### Offline-First Data Access
```tsx
import { getPokemonOfflineFirst } from "@/lib/pokepedia-client"

const pokemon = await getPokemonOfflineFirst(25) // Pikachu
// Checks: IndexedDB → Supabase → PokeAPI
```

## ✅ Benefits

1. **Fast App Start**: Critical data synced in ~1min
2. **Offline Capable**: All data cached locally
3. **Progressive Loading**: App usable while sync continues
4. **Background Sync**: Comprehensive sync doesn't block UI
5. **Real-time Updates**: Progress visible via Realtime
6. **Resilient**: Works offline, falls back gracefully

## 📱 Offline Mode

Once critical data is synced:
- ✅ App works completely offline
- ✅ Pokemon search works locally
- ✅ Type/ability/move data available
- ✅ Background sync continues when online
- ✅ Realtime updates sync progress

## 🔄 Sync Priority Levels

- **Critical**: Master data + first 50 Pokemon (immediate)
- **Standard**: Remaining Pokemon (background)
- **Low**: Evolution chains, forms (background, lower priority)

---

**Status**: ✅ Offline-first Pokepedia system ready!
