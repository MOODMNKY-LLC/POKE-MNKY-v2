# Edge Functions + Offline-First Sync Integration

## 🎯 Strategy

**Progressive Sync on App Start**:
1. **Critical** (immediate): Master data + first 50 Pokemon → IndexedDB
2. **Standard** (background): Remaining Pokemon → Supabase + IndexedDB
3. **Low** (background): Evolution chains, forms → Supabase + IndexedDB

## 🔄 Flow

### App Start
```
User Opens App
    ↓
PokepediaSyncProvider mounts
    ↓
Check IndexedDB (localCount)
    ↓ Empty?
    ↓ Yes
Start Progressive Sync
    ├─ Sync Master Data (30s) → IndexedDB
    ├─ Sync Critical Pokemon (1min) → IndexedDB
    └─ Trigger Edge Function (background) → Supabase
```

### Edge Function Processing
```
Cron (every 5min) OR Manual Trigger
    ↓
Edge Function: sync-pokepedia
    ↓
Check sync_jobs (priority: critical first)
    ↓
Process one chunk (50 Pokemon)
    ↓
Update sync_jobs + Broadcast Realtime
    ↓
Next cron cycle continues...
```

### Data Access
```
getPokemonOfflineFirst(id)
    ↓
IndexedDB? → Yes → Return ✅
    ↓ No
Supabase? → Yes → Return ✅ (cache locally)
    ↓ No
PokeAPI? → Yes → Return ✅ (cache Supabase + IndexedDB)
```

## 📦 Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "dexie": "^3.2.4"
  }
}
```

Install:
```bash
pnpm add dexie
```

## 🚀 Deployment Steps

1. **Apply Migrations**:
   ```bash
   supabase db push
   ```

2. **Install Dexie**:
   ```bash
   pnpm add dexie
   ```

3. **Deploy Edge Function**:
   ```bash
   supabase functions deploy sync-pokepedia
   ```

4. **Setup Cron** (in Supabase Dashboard):
   ```sql
   SELECT cron.schedule(
     'sync-pokepedia-chunks',
     '*/5 * * * *',
     $$ SELECT net.http_post(...) $$
   );
   ```

## ✅ Features

- ✅ **Progressive Sync**: Critical data first, app usable quickly
- ✅ **Offline-First**: All data cached in IndexedDB
- ✅ **Background Processing**: Edge Functions handle heavy lifting
- ✅ **Real-time Updates**: Realtime broadcasts progress
- ✅ **Priority System**: Critical jobs processed first
- ✅ **Resumable**: Jobs can resume if interrupted

---

**Status**: ✅ Offline-first sync integrated with Edge Functions!
