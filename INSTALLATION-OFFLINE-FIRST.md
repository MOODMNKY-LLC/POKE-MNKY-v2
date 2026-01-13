# Installation: Offline-First Pokepedia Sync

## 📦 Required Dependencies

### Install Dexie.js
\`\`\`bash
pnpm add dexie
\`\`\`

## 🚀 Setup Steps

### 1. Install Dependencies
\`\`\`bash
pnpm install
\`\`\`

### 2. Apply Migrations
\`\`\`bash
supabase db push
\`\`\`

This applies:
- `20260112000005_enhanced_sync_jobs_for_pokepedia.sql` - Enhanced sync jobs
- `20260112000007_add_priority_to_sync_jobs.sql` - Priority field

### 3. Deploy Edge Function
\`\`\`bash
supabase functions deploy sync-pokepedia
\`\`\`

### 4. Setup Cron (Optional - for automatic background sync)
In Supabase Dashboard → Database → SQL Editor:

\`\`\`sql
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
\`\`\`

## ✅ Verification

### Check IndexedDB
Open browser DevTools → Application → IndexedDB → PokepediaDB

Should see tables:
- `pokemon`
- `master_data`
- `sync_status`

### Check Sync Status
1. Open app
2. Check browser console for sync progress
3. Check `sync_jobs` table in Supabase

### Test Offline Mode
1. Sync critical data (master + first 50 Pokemon)
2. Disable network in DevTools
3. App should still work with local data

---

**Status**: ✅ Ready to install and test!
