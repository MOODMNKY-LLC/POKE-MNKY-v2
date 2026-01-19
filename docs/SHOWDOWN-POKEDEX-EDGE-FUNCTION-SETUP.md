# Showdown Pokedex Edge Function Setup

Complete guide for deploying and using the Showdown pokedex ingestion Edge Function.

## Overview

The Showdown pokedex ingestion is now available as a **Supabase Edge Function** that can be:
- **Automatically triggered** via cron job (weekly on Sundays at 2 AM UTC)
- **Manually triggered** from the admin panel (`/admin`)
- **Programmatically triggered** via API route (`/api/admin/showdown-pokedex/ingest`)

## Architecture

```
┌─────────────────────┐
│  Cron Job           │─── Weekly (Sunday 2 AM UTC)
│  (pg_cron)          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Edge Function      │─── Fetches pokedex.json
│  ingest-showdown-   │    Ingests into Supabase
│  pokedex            │
└──────────┬──────────┘
           │
           ├──► showdown_pokedex_raw
           ├──► pokemon_showdown
           ├──► pokemon_showdown_types
           └──► pokemon_showdown_abilities

┌─────────────────────┐
│  Admin Panel        │─── Manual trigger button
│  /admin             │    Real-time status
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  API Route          │─── POST /api/admin/showdown-pokedex/ingest
│  (Next.js)          │
└─────────────────────┘
```

## Files Created

### 1. Edge Function
- **File**: `supabase/functions/ingest-showdown-pokedex/index.ts`
- **Purpose**: Fetches and ingests Showdown pokedex.json
- **Deploy**: `npm run deploy:showdown-function` or `supabase functions deploy ingest-showdown-pokedex`

### 2. Cron Job Migration
- **File**: `supabase/migrations/20260120000001_setup_showdown_pokedex_cron.sql`
- **Purpose**: Sets up weekly automatic sync
- **Schedule**: Every Sunday at 2 AM UTC

### 3. API Route
- **File**: `app/api/admin/showdown-pokedex/ingest/route.ts`
- **Purpose**: Proxy to Edge Function for manual triggers
- **Access**: Admin-only (authentication required)

### 4. Admin Component
- **File**: `components/admin/showdown-pokedex-sync.tsx`
- **Purpose**: UI component for admin panel
- **Location**: `/admin` page

## Deployment Steps

### 1. Apply Database Migrations

```bash
supabase migration up
```

This creates:
- Tables (already done)
- Cron job setup
- Helper functions

### 2. Deploy Edge Function

**Local Testing**:
```bash
supabase functions serve ingest-showdown-pokedex --no-verify-jwt
```

**Production Deployment**:
```bash
npm run deploy:showdown-function
# or
supabase functions deploy ingest-showdown-pokedex
```

### 3. Configure Cron Job (Production)

In Supabase Dashboard → Database → Settings, ensure these are set:
- `app.settings.supabase_url` = `https://your-project.supabase.co`
- `app.settings.service_role_key` = `your-service-role-key`

Or update the cron job directly in SQL Editor with your project URL and key.

### 4. Verify Setup

Check cron job status:
```sql
SELECT * FROM public.get_showdown_pokedex_cron_status();
```

Test Edge Function manually:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ingest-showdown-pokedex \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Usage

### Manual Trigger (Admin Panel)

1. Navigate to `/admin`
2. Find "Showdown Competitive Database" card
3. Click "Update Competitive Database"
4. Monitor progress in real-time

### Manual Trigger (API)

```bash
POST /api/admin/showdown-pokedex/ingest
Authorization: Bearer <your-token>
```

### Automatic (Cron)

The cron job runs automatically every Sunday at 2 AM UTC. No action needed.

## Response Format

```json
{
  "success": true,
  "summary": {
    "processed": 1515,
    "errors": 0,
    "duration": "78.04s",
    "counts": {
      "raw": 1515,
      "pokemon": 1515,
      "types": 2305,
      "abilities": 3250
    }
  },
  "errors": []
}
```

## Troubleshooting

### Cron Job Not Running

1. Check if pg_cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Verify cron job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'ingest-showdown-pokedex-weekly';
   ```

3. Check cron job logs:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ingest-showdown-pokedex-weekly')
   ORDER BY start_time DESC LIMIT 10;
   ```

### Edge Function Errors

1. Check Edge Function logs in Supabase Dashboard
2. Verify environment variables are set
3. Test Edge Function directly:
   ```bash
   curl -X POST http://127.0.0.1:54321/functions/v1/ingest-showdown-pokedex \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

### API Route Errors

1. Check authentication (must be logged in)
2. Verify service role key is set in `.env.local`
3. Check browser console for errors
4. Verify Edge Function is deployed

## Benefits

✅ **Serverless**: No server maintenance required  
✅ **Automatic**: Weekly updates keep data fresh  
✅ **Manual Control**: Admin panel for on-demand updates  
✅ **Scalable**: Edge Functions handle load automatically  
✅ **Reliable**: Built-in error handling and retries  
✅ **Observable**: Logs and status tracking in admin panel  

## Next Steps

- Monitor first automatic sync (next Sunday at 2 AM UTC)
- Use admin panel to trigger manual syncs as needed
- Query `draft_pool_with_showdown` view to access enriched data
- Consider adding notifications for sync completion

## References

- **Edge Function**: `supabase/functions/ingest-showdown-pokedex/`
- **Migration**: `supabase/migrations/20260120000001_setup_showdown_pokedex_cron.sql`
- **API Route**: `app/api/admin/showdown-pokedex/ingest/route.ts`
- **Admin Component**: `components/admin/showdown-pokedex-sync.tsx`
- **Documentation**: `docs/SHOWDOWN-POKEDEX-INTEGRATION.md`
