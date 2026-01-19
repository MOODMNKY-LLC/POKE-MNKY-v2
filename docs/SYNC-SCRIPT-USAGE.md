# Pokemon Sync Script - Usage Guide

## Overview

The `sync-pokemon-data.ts` script syncs Pokemon data from PokeAPI to Supabase tables (`pokemon_cache` and `pokemon`). It's a simple, efficient replacement for the complex queue-based sync system.

---

## Prerequisites

1. **Environment Variables** (in `.env.local`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Dependencies**:
   - `pokenode-ts` (already installed)
   - `@supabase/supabase-js` (already installed)
   - `tsx` (for running TypeScript scripts)

---

## Basic Usage

### Sync All Pokemon (1-1025)

```bash
npx tsx scripts/sync-pokemon-data.ts
```

This will:
- Sync all Pokemon from ID 1 to 1025
- Process in batches of 50
- Rate limit: 100ms between requests
- Show real-time progress
- Populate `pokemon_cache` table
- Populate `pokemon` table (UUID-based)

### Sync Custom Range

```bash
# Sync Pokemon 1-100
npx tsx scripts/sync-pokemon-data.ts --start 1 --end 100

# Sync Pokemon 500-600
npx tsx scripts/sync-pokemon-data.ts --start 500 --end 600
```

### Custom Batch Size and Rate Limit

```bash
# Smaller batches, slower rate limit (more reliable)
npx tsx scripts/sync-pokemon-data.ts --batch-size 25 --rate-limit 150

# Larger batches, faster rate limit (faster but riskier)
npx tsx scripts/sync-pokemon-data.ts --batch-size 100 --rate-limit 50
```

### Include Types Master Data

```bash
# Also sync types table
npx tsx scripts/sync-pokemon-data.ts --include-types
```

---

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--start` | Starting Pokemon ID | 1 |
| `--end` | Ending Pokemon ID | 1025 |
| `--batch-size` | Number of Pokemon per batch | 50 |
| `--rate-limit` | Milliseconds between requests | 100 |
| `--include-types` | Also sync types master data | false |

---

## Output

### Progress Display

```
[150/1025] Syncing Mewtwo... (14.6%) | ETA: 2m 15s
```

### Summary

```
======================================================================
📊 Sync Summary
======================================================================
✅ Synced: 1025/1025
❌ Failed: 0/1025
⏱️  Time: 5m 23s

📝 Populating pokemon table from pokemon_cache...
✅ Successfully populated pokemon table with 1025 records

✅ Sync complete!
```

### Error Handling

If errors occur, they're logged:
```
❌ Errors:
   - Pokemon 999: Failed to fetch
   - Pokemon 1000: Database error: connection timeout
```

---

## What Gets Synced

### pokemon_cache Table

Populated with:
- `pokemon_id` - National Dex ID
- `name` - Pokemon name
- `types` - Array of type names (e.g., ["fire", "flying"])
- `base_stats` - JSONB object with hp, attack, defense, special_attack, special_defense, speed
- `abilities` - Array of ability names
- `moves` - Array of move names
- `sprites` - JSONB object with sprite URLs
- `sprite_url` - Primary sprite URL
- `draft_cost` - Calculated draft cost (5-20 points)
- `tier` - Calculated tier (PU, NU, RU, UU, OU, Uber)
- `generation` - Generation number (1-9)
- `height`, `weight`, `base_experience` - Physical attributes
- `payload` - Full PokeAPI response (JSONB)
- `fetched_at`, `expires_at` - Timestamps

**Note**: `ability_details` and `move_details` are skipped for initial sync (can be added later).

### pokemon Table

Populated from `pokemon_cache`:
- `id` - UUID (auto-generated)
- `name` - Pokemon name (lowercase, unique)
- `type1` - Primary type
- `type2` - Secondary type (null if single-type)

---

## Performance

### Estimated Times

- **Full sync (1-1025)**: ~5-10 minutes (depending on rate limit)
- **Small range (1-100)**: ~30-60 seconds
- **Rate limit 100ms**: ~102 seconds minimum (1025 * 0.1s)

### Optimization Tips

1. **Faster sync**: Reduce rate limit (but respect PokeAPI fair use)
   ```bash
   npx tsx scripts/sync-pokemon-data.ts --rate-limit 50
   ```

2. **More reliable**: Increase rate limit and reduce batch size
   ```bash
   npx tsx scripts/sync-pokemon-data.ts --batch-size 25 --rate-limit 150
   ```

3. **Resume failed sync**: Use custom range to retry failed Pokemon
   ```bash
   # If Pokemon 500-600 failed, retry them
   npx tsx scripts/sync-pokemon-data.ts --start 500 --end 600
   ```

---

## Error Handling

The script includes:

1. **Retry Logic**: 3 attempts per Pokemon with exponential backoff
2. **Error Tracking**: Failed Pokemon IDs are logged
3. **Continue on Error**: Script continues even if some Pokemon fail
4. **Summary Report**: Shows all errors at the end

---

## Troubleshooting

### "Missing Supabase configuration"

**Solution**: Ensure `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### "Failed to fetch Pokemon"

**Possible causes**:
- Network issues
- PokeAPI rate limiting
- Invalid Pokemon ID

**Solution**: 
- Check network connection
- Increase rate limit: `--rate-limit 200`
- Verify Pokemon ID exists (1-1025)

### "Database error"

**Possible causes**:
- Supabase connection issues
- Schema mismatch
- RLS policies blocking writes

**Solution**:
- Verify service role key is correct
- Check Supabase dashboard for connection issues
- Ensure `pokemon_cache` table exists and has correct schema

---

## Verification

After sync completes, verify data:

```sql
-- Check pokemon_cache count
SELECT COUNT(*) FROM pokemon_cache;
-- Should be 1025 (or your custom range)

-- Check pokemon table count
SELECT COUNT(*) FROM pokemon;
-- Should match pokemon_cache count

-- Check a specific Pokemon
SELECT * FROM pokemon_cache WHERE pokemon_id = 25;
-- Should show Pikachu data

-- Check pokemon table entry
SELECT * FROM pokemon WHERE name = 'pikachu';
-- Should show UUID, name, type1, type2
```

---

## Next Steps

After successful sync:

1. **Test Draft System**: Verify draft picks work with synced data
2. **Test Pokedex Page**: Verify Pokemon display correctly
3. **Optional**: Add ability_details and move_details sync (requires additional API calls)

---

## Comparison to Old System

| Feature | Old System | New System |
|---------|-----------|------------|
| **Complexity** | Queue + Edge Functions | Single script |
| **Debuggability** | Hard (Edge Functions) | Easy (local script) |
| **Progress Tracking** | Unreliable | Real-time console |
| **Error Handling** | Complex | Simple retries |
| **Speed** | Slow (queue overhead) | Fast (direct writes) |
| **Maintainability** | Low | High |

---

## Future Enhancements

1. **Incremental Sync**: Only sync updated Pokemon
2. **Ability Details**: Fetch and cache ability descriptions
3. **Move Details**: Fetch and cache move descriptions
4. **Evolution Chains**: Fetch and cache evolution data
5. **Admin UI**: Web interface to trigger syncs
6. **Scheduled Syncs**: Cron job for automatic updates
