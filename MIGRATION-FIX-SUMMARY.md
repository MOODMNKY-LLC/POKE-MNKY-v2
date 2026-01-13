# Migration Fix Summary

## Issue Identified

The database migrations were failing due to dependency issues:
1. `draft_sessions` table references `seasons` table (created in later migration)
2. `draft_sessions` table references `teams` table (created in later migration)

## Fix Applied

### Migration: `20260112000001_create_draft_sessions.sql`
- **Changed**: Removed immediate FK constraints for `season_id` and `current_team_id`
- **Reason**: These tables don't exist yet when this migration runs
- **Solution**: FK constraints will be added in a later migration after both tables exist

### Changes Made:
\`\`\`sql
-- Before:
season_id UUID REFERENCES public.seasons(id),
current_team_id UUID REFERENCES public.teams(id),

-- After:
season_id UUID, -- FK constraint added in later migration after seasons table exists
current_team_id UUID, -- FK constraint added in later migration after teams table exists
\`\`\`

## Next Steps

1. ✅ Migration dependency fixed
2. ⏳ Run `supabase db reset` to apply all migrations
3. ⏳ Verify tables are accessible via REST API
4. ⏳ Test sync flow end-to-end

## Migration Order (Current)

1. `20260112000000_create_draft_pool.sql` ✅
2. `20260112000001_create_draft_sessions.sql` ✅ (Fixed)
3. `20260112000003_create_comprehensive_pokedex.sql` ✅ (Creates types, abilities, moves, pokemon_comprehensive)
4. `20260112000004_comprehensive_pokepedia_schema.sql` ✅ (Enhances pokemon_comprehensive)
5. `20260112104004_create_schema.sql` ✅ (Creates teams table)
6. `20260112104025_enhanced_schema.sql` ✅ (Creates seasons table)
7. `20260112104100_create_sync_jobs_table.sql` ✅ (Creates sync_jobs)

## Expected Result

After migrations complete successfully:
- All tables should exist in database
- PostgREST schema cache should refresh automatically
- REST API calls should return 200 OK (empty arrays if no data)
- Sync flow should work correctly
