# PokéPedia Sync Restart Plan

**Status:** Sync stalled at 40.1%  
**Goal:** Get sync fully functional and complete

---

## Current Situation

- **Progress:** 40.1% complete
- **Issue:** Sync appears stalled
- **Possible Causes:**
  1. Queue is empty (all items processed but not all resources synced)
  2. Worker not running/processing
  3. Some resource types not seeded
  4. Rate limiting or errors preventing completion

---

## Diagnostic Steps

### 1. Check Queue Status
- Run `get_pokepedia_queue_stats()` to see if queue has messages
- If queue is empty, need to re-seed

### 2. Check Sync Progress
- Run `get_pokepedia_sync_progress()` to see which resource types are incomplete
- Identify which types need more resources

### 3. Check for Errors
- Review Edge Function logs for `pokepedia-worker`
- Check for rate limiting or API errors

---

## Restart Strategy

### Option A: Queue is Empty (Most Likely)
**Solution:** Re-seed the queue with missing resource types

1. Check which resource types are incomplete
2. Seed only those types (or all types if needed)
3. Run worker repeatedly until queue is empty

### Option B: Queue Has Messages But Worker Not Processing
**Solution:** Run worker manually multiple times

1. Click "Process Worker" button repeatedly
2. Increase batch size and concurrency
3. Monitor queue length decreasing

### Option C: Partial Sync (Some Types Complete, Others Not)
**Solution:** Seed missing types only

1. Identify incomplete resource types
2. Seed only those types
3. Process worker until complete

---

## Action Plan

1. **Immediate:** Check queue status and sync progress
2. **If queue empty:** Re-seed all resource types
3. **If queue has items:** Run worker with increased batch size
4. **Monitor:** Watch progress increase
5. **Repeat:** Continue until 100% complete

---

## Resource Types Being Synced

From `pokepedia-seed` function:
- **Master:** type, stat, egg-group, growth-rate, ability, move
- **Reference:** generation, pokemon-color, pokemon-habitat, pokemon-shape, item, etc.
- **Species:** pokemon-species
- **Pokemon:** pokemon
- **Relationships:** evolution-chain, pokemon-form

**Estimated Totals:**
- pokemon: 1025
- pokemon-species: 1025
- move: 1000
- ability: 400
- type: 20
- item: 2000
- Others: varies

**Total Estimated:** ~5,500+ resources

---

## Next Steps

1. Check current queue status
2. Check current sync progress by type
3. Re-seed if needed
4. Process worker with optimized settings
5. Monitor until complete
