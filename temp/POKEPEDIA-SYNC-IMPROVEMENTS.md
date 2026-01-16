# Pokepedia Sync System - Improvements

## Overview

The sync system has been completely redesigned to use **PokeAPI pagination** and **proper dependency ordering** for more efficient and reliable data synchronization.

## Key Improvements

### 1. **Pagination-Based Fetching**
- **Before**: Sequential ID-based fetching (1, 2, 3...)
- **After**: Uses PokeAPI pagination (`?limit=1000`) to fetch resource lists first
- **Benefits**:
  - Know total count upfront
  - More efficient batch processing
  - Resilient to missing IDs
  - Better progress tracking

### 2. **Proper Dependency Ordering**
The sync now follows a strict phase order to ensure foreign keys always exist:

1. **Master Phase** (`master`): Types, Abilities, Moves, Stats, Egg Groups, Growth Rates
2. **Reference Phase** (`reference`): Generations, Pokemon Colors, Pokemon Habitats, Pokemon Shapes
3. **Species Phase** (`species`): Pokemon Species (depends on reference data)
4. **Pokemon Phase** (`pokemon`): Pokemon data (depends on species)
5. **Relationships Phase** (`relationships`): Pokemon Types, Abilities, Stats (depends on Pokemon + master)

### 3. **Batch Processing with Controlled Concurrency**
- Processes resources in batches of 10 parallel requests
- Uses `Promise.allSettled()` for resilience (one failure doesn't stop the batch)
- Configurable batch delays (100ms) to respect rate limits
- Better error tracking per resource

### 4. **Foreign Key Validation**
- Checks if referenced data exists before inserting
- Sets FK fields to `null` if referenced data doesn't exist (instead of failing)
- Prevents constraint violations

### 5. **Better Error Handling**
- Individual resource failures don't stop the entire sync
- Detailed error logging for debugging
- Tracks synced vs failed counts separately
- Graceful degradation

## Usage

### Manual Sync Trigger

\`\`\`typescript
// Trigger master data sync
POST /api/sync/pokepedia
{
  "action": "start",
  "phase": "master",
  "priority": "critical"
}

// Trigger reference data sync (after master completes)
POST /api/sync/pokepedia
{
  "action": "start",
  "phase": "reference",
  "priority": "standard"
}

// Trigger species sync (after reference completes)
POST /api/sync/pokepedia
{
  "action": "start",
  "phase": "species",
  "priority": "standard"
}

// Trigger Pokemon sync (after species completes)
POST /api/sync/pokepedia
{
  "action": "start",
  "phase": "pokemon",
  "priority": "standard"
}

// Trigger relationships sync (after Pokemon completes)
POST /api/sync/pokepedia
{
  "action": "start",
  "phase": "relationships",
  "priority": "standard"
}
\`\`\`

### Recommended Sync Order

For a fresh database, run phases in this order:

1. **Master Phase** - Syncs all master data (types, abilities, moves, stats, etc.)
2. **Reference Phase** - Syncs reference data (generations, colors, habitats, shapes)
3. **Species Phase** - Syncs all Pokemon species
4. **Pokemon Phase** - Syncs all Pokemon data
5. **Relationships Phase** - Syncs Pokemon relationships (types, abilities, stats)

### Automatic Phase Chaining

The client-side hook (`usePokepediaSync`) automatically triggers phases in order:
- If no master data exists → triggers `master` phase
- After master completes → triggers `reference` phase
- After reference completes → triggers `species` phase
- After species completes → triggers `pokemon` phase
- After pokemon completes → triggers `relationships` phase

## Technical Details

### Edge Function Architecture

The Edge Function now supports multiple phases:

- **`master`**: Syncs master data tables (types, abilities, moves, stats, egg-groups, growth-rates)
- **`reference`**: Syncs reference tables (generations, pokemon-colors, pokemon-habitats, pokemon-shapes)
- **`species`**: Syncs pokemon_species table
- **`pokemon`**: Syncs pokemon_comprehensive table
- **`relationships`**: Syncs relationship tables (pokemon_types, pokemon_abilities, pokemon_stats)

### Chunk Processing

- Each phase processes resources in chunks
- Chunk size: 50 resources (10 for critical priority)
- Total chunks calculated dynamically based on resource count from PokeAPI
- Progress tracked per chunk

### Rate Limiting

- 10 concurrent requests per batch
- 100ms delay between batches
- Respects PokeAPI fair use policy

## Migration from Old System

The old system used:
- Sequential ID ranges (`start_id`, `end_id`)
- Single `pokemon` phase
- Manual species pre-sync

The new system:
- Pagination-based resource lists
- Multiple phases with dependency ordering
- Automatic FK validation

**No database migration needed** - the new system works with existing tables.

## Troubleshooting

### Sync Not Starting
- Check Edge Function is running: `supabase functions serve sync-pokepedia --no-verify-jwt`
- Verify auth keys are set correctly
- Check sync_jobs table for stuck jobs

### Foreign Key Errors
- Ensure phases run in order (master → reference → species → pokemon)
- Check that master/reference data exists before running species/pokemon phases
- The new system validates FKs automatically, but ensure phases complete successfully

### Slow Sync
- Normal: Master phase syncs ~1000 resources, takes time
- Use `priority: "critical"` for faster chunks (10 instead of 50)
- Monitor progress via Realtime subscriptions

## Next Steps

1. **Test the new sync system**:
   \`\`\`bash
   # Start Edge Function
   supabase functions serve sync-pokepedia --no-verify-jwt
   
   # Trigger master phase sync
   curl -X POST http://localhost:3000/api/sync/pokepedia \
     -H "Content-Type: application/json" \
     -d '{"action":"start","phase":"master","priority":"critical"}'
   \`\`\`

2. **Monitor progress**:
   - Check `sync_jobs` table for progress
   - Listen to Realtime `sync:status` channel for updates
   - Check Edge Function logs for detailed errors

3. **Run phases sequentially**:
   - Wait for each phase to complete before starting the next
   - Or implement automatic phase chaining in the client hook
