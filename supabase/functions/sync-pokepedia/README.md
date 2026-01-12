# Sync Pokepedia Edge Function

## Overview

Edge Function for chunked Pokepedia sync processing. Processes sync jobs in small chunks to respect timeout limits.

## Deployment

```bash
supabase functions deploy sync-pokepedia
```

## Usage

### Manual Trigger

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-pokepedia \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "phase": "pokemon",
    "start_id": 1,
    "end_id": 100
  }'
```

### Cron Setup

In Supabase Dashboard → Database → Cron Jobs:

```sql
SELECT cron.schedule(
  'sync-pokepedia',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-pokepedia',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
```

## Phases

- `master` - Sync master data (types, abilities, moves, etc.)
- `pokemon` - Sync Pokemon data
- `additional` - Sync additional master data
- `evolution` - Sync evolution chains

## Monitoring

Sync progress is broadcast via Supabase Realtime channel `sync:status`:
- `sync_progress` - Progress updates
- `sync_complete` - Job completion
- `sync_error` - Error notifications
