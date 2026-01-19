# Draft Pool Population - Direct SQL Queries

Run these queries directly in **Supabase SQL Editor** to populate draft pool from Showdown tiers.

## ✅ Step 1: Verify pokemon_unified View Works

```sql
-- Check if pokemon_unified returns data
SELECT COUNT(*) FROM pokemon_unified;
```

**Expected**: Should return ~1,515+ records (Showdown Pokemon)

```sql
-- Check tier distribution
SELECT 
  showdown_tier,
  COUNT(*) as count
FROM pokemon_unified
WHERE showdown_tier IS NOT NULL
GROUP BY showdown_tier
ORDER BY count DESC
LIMIT 20;
```

**Expected**: Should show tier distribution (OU, UU, RU, NU, PU, ZU, LC, etc.)

---

## ✅ Step 2: Test Tier-to-Point Mapping Function

```sql
-- Test the mapping function
SELECT 
  tier,
  map_tier_to_point_value(tier) as point_value
FROM (
  VALUES 
    ('Uber'), ('OU'), ('UU'), ('RU'), ('NU'), ('PU'), ('ZU'), ('LC'),
    ('Illegal'), ('Untiered'), ('NFE')
) AS tiers(tier)
ORDER BY point_value DESC NULLS LAST;
```

**Expected**: Should map tiers to point values:
- Uber/AG → 20
- OU → 19
- UUBL/OUBL → 18
- UU → 17
- etc.

---

## ✅ Step 3: Populate Draft Pool

**⚠️ IMPORTANT**: Replace `'YOUR_SEASON_ID'` with your actual season UUID!

```sql
-- Get current season ID first
SELECT id, name, is_current 
FROM seasons 
WHERE is_current = true;
```

Then use that ID:

```sql
-- Populate draft pool from Showdown tiers
SELECT * FROM populate_draft_pool_from_showdown_tiers(
  'YOUR_SEASON_ID'::UUID,  -- Replace with actual season ID
  true,                     -- exclude_illegal = true
  false                      -- exclude_forms = false
);
```

**Expected Result**:
```json
{
  "inserted": 1200+,
  "updated": 0,
  "skipped": 100+,
  "total_processed": 1300+,
  "season_id": "YOUR_SEASON_ID"
}
```

---

## ✅ Step 4: Verify Draft Pool Population

```sql
-- Check total entries
SELECT COUNT(*) as total_entries
FROM draft_pool
WHERE season_id = 'YOUR_SEASON_ID';
```

```sql
-- Check point value distribution
SELECT 
  point_value,
  COUNT(*) as pokemon_count
FROM draft_pool
WHERE season_id = 'YOUR_SEASON_ID'
  AND status = 'available'
GROUP BY point_value
ORDER BY point_value DESC;
```

**Expected**: Should show distribution across point values 1-20

```sql
-- Sample entries by point value
SELECT 
  pokemon_name,
  point_value,
  pokemon_id,
  generation,
  status
FROM draft_pool
WHERE season_id = 'YOUR_SEASON_ID'
  AND status = 'available'
ORDER BY point_value DESC, pokemon_name
LIMIT 30;
```

---

## ✅ Step 5: Check Tier-to-Point Mapping Quality

```sql
-- Verify tier mappings are correct
SELECT 
  pu.showdown_tier,
  map_tier_to_point_value(pu.showdown_tier) as mapped_points,
  dp.point_value as actual_points,
  COUNT(*) as count
FROM pokemon_unified pu
JOIN draft_pool dp ON pu.pokemon_id = dp.pokemon_id
WHERE dp.season_id = 'YOUR_SEASON_ID'
  AND pu.showdown_tier IS NOT NULL
GROUP BY pu.showdown_tier, mapped_points, dp.point_value
ORDER BY mapped_points DESC NULLS LAST, pu.showdown_tier;
```

**Expected**: `mapped_points` should match `actual_points` for each tier

---

## 🔧 Troubleshooting

### If pokemon_unified returns 0 records:

**Check if view exists**:
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_name = 'pokemon_unified';
```

**Check source tables**:
```sql
SELECT COUNT(*) FROM pokemon_showdown;
SELECT COUNT(*) FROM pokepedia_pokemon;
```

**If pokemon_showdown has data but view returns 0**, the view might need refresh or there's a join issue.

### If function not found:

**Check if function exists**:
```sql
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname = 'populate_draft_pool_from_showdown_tiers';
```

**If exists but PostgREST can't see it**, wait 2-5 minutes for cache refresh or restart Supabase.

### If point values seem wrong:

**Review tier mapping**:
```sql
SELECT 
  showdown_tier,
  COUNT(*) as count,
  map_tier_to_point_value(showdown_tier) as point_value
FROM pokemon_unified
WHERE showdown_tier IS NOT NULL
GROUP BY showdown_tier
ORDER BY point_value DESC NULLS LAST;
```

**Adjust mapping function** if needed (edit migration and re-run).

---

## 📊 Expected Results

After running all queries:

- ✅ **pokemon_unified**: ~1,515 records
- ✅ **Draft pool populated**: 1,000+ entries
- ✅ **Point distribution**: Spread across 1-20 points
- ✅ **Tier mapping**: Correct point values for each tier
- ✅ **Status**: All entries marked as 'available'

---

## 🎯 Next Steps

1. **Review point distribution** - Adjust tier mappings if needed
2. **Test draft pool queries** - Use `draft_pool_comprehensive` view
3. **Start drafting** - Use populated pool for draft sessions

See `docs/APP-INTEGRATION-GUIDE.md` for using draft pool in your app!
