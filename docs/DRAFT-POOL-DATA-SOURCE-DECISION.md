# Draft Pool Data Source Decision Guide

## Current Situation

Your `draft_pool` table in production Supabase is populated from **Showdown Tiers** via the function:
- `populate_draft_pool_from_showdown_tiers(season_id, exclude_illegal, exclude_forms)`
- This was likely run manually or via migration
- Maps Showdown competitive tiers (OU, UU, RU, etc.) to point values automatically

You now have **Notion → Supabase sync** via n8n workflow:
- Notion Draft Board is the **league admin source of truth**
- Only rows with **"Added to Draft Board"** checkbox checked sync to Supabase
- Admins manually curate the draft pool in Notion

---

## Two Different Data Sources

### Source 1: Showdown Tiers (Automated)
- **Function**: `populate_draft_pool_from_showdown_tiers()`
- **Source**: `pokemon_unified` view (Showdown competitive tiers)
- **Point Values**: Automatically assigned based on tier (OU=19, UU=17, etc.)
- **Coverage**: ~1,200+ Pokemon (all Showdown tiers)
- **Use Case**: Quick population, automated tier-based point assignment

### Source 2: Notion Draft Board (Manual Curation)
- **Workflow**: n8n Notion → Supabase sync
- **Source**: Notion Draft Board database
- **Point Values**: Manually set by admins in Notion
- **Coverage**: Only Pokemon with "Added to Draft Board" checked
- **Use Case**: League-specific curation, custom point values, admin control

---

## Recommendation: Clear Current Season Data

**Yes, you should clear the current season's data** if you want Notion to be the source of truth going forward.

### Why Clear?

1. **Conflict Prevention**: Showdown data may have different point values than Notion
2. **Single Source of Truth**: Notion is designed to be the admin source of truth
3. **Clean Start**: Let Notion sync populate the table fresh
4. **Consistency**: All data comes from one source (Notion)

### What to Clear?

**Option A: Clear Only Current Season** (Recommended)
```sql
-- Get current season ID first
SELECT id, name FROM seasons WHERE is_current = true;

-- Clear only current season's draft pool
DELETE FROM draft_pool 
WHERE season_id = (
  SELECT id FROM seasons WHERE is_current = true LIMIT 1
);
```

**Option B: Clear All Draft Pool Data** (If starting fresh)
```sql
-- ⚠️ WARNING: This deletes ALL draft pool data across all seasons
DELETE FROM draft_pool;
```

**Option C: Keep Existing, Let Notion Overwrite** (If you want to preserve)
- Don't clear anything
- Notion sync will update existing rows (based on `season_id` + `pokemon_name` match)
- Risk: Point values may differ between sources

---

## Recommended Workflow

### Step 1: Clear Current Season (If Migrating to Notion)

```sql
-- 1. Check what you have
SELECT 
  season_id,
  COUNT(*) as count,
  MIN(point_value) as min_points,
  MAX(point_value) as max_points
FROM draft_pool
GROUP BY season_id;

-- 2. Get current season
SELECT id, name, is_current 
FROM seasons 
WHERE is_current = true;

-- 3. Clear current season (replace SEASON_ID with actual UUID)
DELETE FROM draft_pool 
WHERE season_id = 'SEASON_ID'::UUID;
```

### Step 2: Populate Notion Draft Board

1. **Ensure Notion Draft Board has data**:
   - Run `scripts/populate-notion-draft-board.ts` if needed
   - Or manually add Pokemon to Notion Draft Board

2. **Check "Added to Draft Board"** for Pokemon you want:
   - This is the filter for what syncs to Supabase
   - Only checked rows will sync

### Step 3: Let n8n Sync Populate Supabase

- The n8n workflow will automatically sync Notion → Supabase
- Or trigger it manually by updating a row in Notion
- Verify data appears in `draft_pool` table

### Step 4: Verify Sync

```sql
-- Check synced data
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT pokemon_name) as unique_pokemon,
  MIN(point_value) as min_points,
  MAX(point_value) as max_points,
  COUNT(*) FILTER (WHERE status = 'available') as available,
  COUNT(*) FILTER (WHERE status = 'banned') as banned
FROM draft_pool
WHERE season_id = (
  SELECT id FROM seasons WHERE is_current = true LIMIT 1
);
```

---

## Showdown tier reference (showdown_pool)

To populate or refresh **Showdown tier reference data** (for point suggestions, tier lookup, etc.), use `showdown_pool` and the script or SQL:

1. **Via script** (recommended):
   ```bash
   pnpm tsx scripts/populate-draft-pool-from-tiers.ts
   ```
   This calls `populate_showdown_pool_from_tiers` and verifies `showdown_pool`.

2. **Via SQL**:
   ```sql
   SELECT * FROM populate_showdown_pool_from_tiers(
     (SELECT id FROM seasons WHERE is_current = true LIMIT 1),
     true,  -- exclude_illegal
     false  -- exclude_forms
   );
   ```

**Note**: `showdown_pool` is reference only. The league draft pool is `draft_pool`, populated only from Notion.

---

## Decision Matrix

| Scenario | Clear Table? | Why |
|----------|-------------|-----|
| **Notion is source of truth** | ✅ Yes (current season) | Clean start, avoid conflicts |
| **Showdown is source of truth** | ❌ No | Keep existing data |
| **Hybrid approach** | ⚠️ Maybe | Let Notion overwrite Showdown |
| **Starting new season** | ✅ Yes (new season) | Fresh start for new season |

---

## Best Practice Going Forward

1. **For New Seasons**:
   - Clear old season data (or archive it)
   - Populate Notion Draft Board
   - Let n8n sync populate Supabase

2. **For Updates**:
   - Update Notion Draft Board
   - n8n sync automatically updates Supabase
   - No manual SQL needed

3. **For Bulk Changes**:
   - Use Notion bulk operations
   - Or use `scripts/bulk-update-added-to-draft-board.ts`
   - Sync happens automatically

---

## Summary

**Recommendation**: Clear the current season's `draft_pool` data, then let Notion sync populate it fresh.

**Why**: 
- Notion is designed as the admin source of truth
- Avoids conflicts between Showdown and Notion point values
- Clean, consistent data source
- Future updates happen in Notion automatically

**SQL to Run**:
```sql
-- Clear current season
DELETE FROM draft_pool 
WHERE season_id = (
  SELECT id FROM seasons WHERE is_current = true LIMIT 1
);
```

Then ensure Notion has Pokemon with "Added to Draft Board" checked, and the n8n workflow will sync them automatically.
