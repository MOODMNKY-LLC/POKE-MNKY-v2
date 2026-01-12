# Next Steps - Sync System Debugging

## ✅ Completed Fixes

1. **Fixed `chunk_size` column issue** - Added missing columns to `sync_jobs` table
2. **Fixed table name** - Changed `pokemon_stats_comprehensive` → `pokemon_stats` in Edge Function
3. **Improved error logging** - Added detailed console.error statements to capture insert failures
4. **Created migration** - `20260112105000_fix_sync_jobs_columns.sql` ensures columns exist after table creation

## 🔍 Current Issue

Sync job is running but `synced: 0, errors: 10` for first chunk (Pokemon 1-10). The Edge Function is working but Pokemon inserts are failing silently.

## 🎯 Immediate Actions

1. **Check Edge Function Logs**
   - Look at terminal output for `supabase functions serve sync-pokepedia`
   - Should now show detailed error messages for each failed insert

2. **Likely Root Cause: Missing Master Data**
   - `pokemon_types`, `pokemon_abilities`, `pokemon_stats` have foreign keys to `types`, `abilities`, `stats`
   - If master tables are empty, inserts will fail
   - **Solution**: Sync master data first before Pokemon

3. **Verify Master Data Tables**
   ```sql
   SELECT COUNT(*) FROM types;
   SELECT COUNT(*) FROM abilities;
   SELECT COUNT(*) FROM stats;
   ```

4. **Test Direct Insert**
   ```sql
   -- Test if we can insert a Pokemon without relationships
   INSERT INTO pokemon_comprehensive (pokemon_id, name, base_experience, height, weight)
   VALUES (1, 'bulbasaur', 64, 7, 69);
   ```

## 📋 Recommended Fix Strategy

### Option 1: Sync Master Data First (Recommended)
1. Create a "master" sync phase that syncs types, abilities, stats first
2. Then sync Pokemon with relationships

### Option 2: Make Relationships Optional
1. Skip relationship inserts if master data doesn't exist
2. Log warnings but continue syncing Pokemon
3. Sync relationships later when master data is available

### Option 3: Sync Master Data Inline
1. When inserting Pokemon, check if referenced types/abilities/stats exist
2. If not, fetch and insert them first
3. Then insert Pokemon relationships

## 🔧 Files Modified

- `supabase/functions/sync-pokepedia/index.ts` - Added error logging
- `supabase/migrations/20260112105000_fix_sync_jobs_columns.sql` - New migration

## 📝 Next Debug Session

1. Check Edge Function terminal logs for specific error messages
2. Verify master data tables have data
3. Implement master data sync phase
4. Test end-to-end sync flow
