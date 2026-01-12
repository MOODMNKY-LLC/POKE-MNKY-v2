# Edge Functions Pokepedia Sync Architecture

## 🎯 Overview

Comprehensive Pokepedia sync system using Supabase Edge Functions with chunked processing, Realtime updates, and cron job automation.

## 🏗️ Architecture

```
┌─────────────────┐
│  Cron Job       │─── Every 5 minutes
│  (pg_cron)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function   │─── Processes one chunk per invocation
│ sync-pokepedia  │    (50 Pokemon default)
└────────┬────────┘
         │
         ├──► Updates sync_jobs table
         ├──► Broadcasts via Realtime
         └──► Calls PokeAPI
```

## 📊 Components

### 1. Enhanced Sync Jobs Table
- **File**: `supabase/migrations/20260112000005_enhanced_sync_jobs_for_pokepedia.sql`
- **Features**:
  - Chunk tracking (`current_chunk`, `total_chunks`)
  - Progress percentage
  - Heartbeat monitoring
  - Estimated completion time

### 2. Edge Function
- **File**: `supabase/functions/sync-pokepedia/index.ts`
- **Features**:
  - Chunked processing (respects timeout limits)
  - Manual trigger support
  - Cron trigger support
  - Progress broadcasting via Realtime
  - Stuck job detection

### 3. Cron Job Setup
- **File**: `supabase/migrations/20260112000006_setup_pokepedia_cron.sql`
- **Schedule**: Every 5 minutes
- **Action**: Calls Edge Function to process next chunk

### 4. Admin Dashboard Component
- **File**: `components/admin/sync-status.tsx`
- **Features**:
  - Real-time progress via Realtime subscriptions
  - Manual sync triggers
  - Job history
  - Progress visualization

### 5. API Route
- **File**: `app/api/sync/pokepedia/route.ts`
- **Purpose**: Proxy to Edge Function for manual triggers

## 🚀 Deployment

### Step 1: Apply Migrations
```bash
supabase db push
```

### Step 2: Deploy Edge Function
```bash
supabase functions deploy sync-pokepedia
```

### Step 3: Setup Cron Job
In Supabase Dashboard → Database → SQL Editor:

```sql
-- Replace <project-ref> with your project reference
SELECT cron.schedule(
  'sync-pokepedia-chunks',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-pokepedia',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## 📡 Realtime Channels

### Channel: `sync:status`

**Events**:
- `sync_progress` - Progress updates
  ```json
  {
    "job_id": "uuid",
    "phase": "pokemon",
    "current": 500,
    "total": 1025,
    "progress_percent": 48.8
  }
  ```
- `sync_complete` - Job completion
  ```json
  {
    "job_id": "uuid",
    "phase": "pokemon"
  }
  ```

## 🎮 Usage

### Manual Sync Trigger
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-pokepedia \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "phase": "pokemon",
    "start_id": 1,
    "end_id": 100
  }'
```

### Via Admin Dashboard
```tsx
import { SyncStatus } from "@/components/admin/sync-status"

<SyncStatus />
```

## ✅ Benefits

1. **No Timeout Issues**: Chunked processing respects Edge Function limits
2. **Automatic Sync**: Cron job handles background syncing
3. **Real-time Updates**: Realtime broadcasts progress to clients
4. **Scalable**: Can handle large syncs without blocking
5. **Monitorable**: Progress tracking and heartbeat monitoring
6. **Resumable**: Jobs can be resumed if interrupted

## 🔧 Configuration

### Chunk Size
Default: 50 Pokemon per chunk
Adjust in Edge Function: `DEFAULT_CHUNK_SIZE`

### Cron Schedule
Default: Every 5 minutes (`*/5 * * * *`)
Adjust in cron setup migration

### Timeout Detection
Default: 10 minutes without heartbeat = stuck job
Adjust in Edge Function: `heartbeatAge > 10 * 60 * 1000`

---

**Status**: ✅ Edge Functions sync system ready for deployment!
