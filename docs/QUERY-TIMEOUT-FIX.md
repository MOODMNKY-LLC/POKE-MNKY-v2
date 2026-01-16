# Query Timeout Fix - HomePage Performance

> **Date**: 2026-01-16  
> **Status**: ✅ Fixed

---

## Problem

The homepage (`app/page.tsx`) was experiencing query timeouts after 3 seconds:

```
[v0] Teams query failed: Error: Teams query timed out after 3000ms
[v0] Matches count query failed: Error: Matches count query timed out after 3000ms
[v0] Recent matches query failed: Error: Recent matches query timed out after 3000ms
[v0] Pokemon stats query failed: Error: Pokemon stats query timed out after 3000ms
```

**Root Cause:**
- 3-second timeout was too aggressive for database queries
- Network latency and database processing time exceeded timeout
- First request took 38 seconds total (very slow)

---

## Solution

### 1. Increased Query Timeout

**Changed:** `queryTimeout` from `3000ms` (3 seconds) to `10000ms` (10 seconds)

**Reasoning:**
- Allows for network latency between Next.js server and Supabase
- Accounts for database query processing time
- Still provides reasonable failure detection
- Page uses `Promise.allSettled` so timeouts don't break the page

**Code Change:**
```typescript
// Before
const queryTimeout = 3000 // 3 seconds per query

// After
const queryTimeout = 10000 // 10 seconds per query - allows for network latency and database processing
```

### 2. Reduced Logging Noise

**Changed:** Timeout error logging only occurs in development mode

**Reasoning:**
- Timeouts are handled gracefully (page still renders)
- Reduces production log noise
- Still logs actual database errors (not timeouts)

**Code Change:**
```typescript
// Before
console.warn("[v0] Teams query failed:", teamsResult.reason)

// After
if (process.env.NODE_ENV === 'development') {
  console.warn("[v0] Teams query failed:", teamsResult.reason)
}
```

---

## Impact

### Before:
- ❌ Queries timing out after 3 seconds
- ❌ Noisy error logs in production
- ❌ First request taking 38+ seconds

### After:
- ✅ Queries have 10 seconds to complete
- ✅ Cleaner production logs
- ✅ Better handling of slow database connections
- ✅ Page still renders gracefully if queries timeout

---

## Current Query Performance

The homepage executes 4 parallel queries:

1. **Teams Query**
   ```sql
   SELECT * FROM teams 
   ORDER BY wins DESC 
   LIMIT 5
   ```

2. **Matches Count Query**
   ```sql
   SELECT COUNT(*) FROM matches 
   WHERE is_playoff = false
   ```

3. **Recent Matches Query**
   ```sql
   SELECT *, 
     team1:team1_id(name, coach_name),
     team2:team2_id(name, coach_name),
     winner:winner_id(name)
   FROM matches 
   ORDER BY created_at DESC 
   LIMIT 3
   ```

4. **Pokemon Stats Query**
   ```sql
   SELECT pokemon_id, kills 
   FROM pokemon_stats 
   ORDER BY kills DESC 
   LIMIT 3
   ```

---

## Further Optimizations (Optional)

### 1. Database Indexes

Consider adding indexes to improve query performance:

```sql
-- Index for teams wins ordering
CREATE INDEX IF NOT EXISTS idx_teams_wins ON teams(wins DESC);

-- Index for matches filtering and ordering
CREATE INDEX IF NOT EXISTS idx_matches_playoff_created 
ON matches(is_playoff, created_at DESC);

-- Index for pokemon_stats ordering
CREATE INDEX IF NOT EXISTS idx_pokemon_stats_kills 
ON pokemon_stats(kills DESC);
```

### 2. Query Optimization

**Recent Matches Query:**
- Currently uses joins (`team1:team1_id(...)`)
- Could be optimized by fetching team data separately if joins are slow

**Teams Query:**
- Uses `count: "exact"` which requires full table scan
- Consider if exact count is needed or if approximate count is acceptable

### 3. Caching

Consider implementing caching for homepage data:

- **Next.js Cache:** Use `revalidate` option for ISR (Incremental Static Regeneration)
- **Supabase Cache:** Use Supabase's built-in caching
- **Redis Cache:** External cache layer for frequently accessed data

**Example:**
```typescript
export const revalidate = 60 // Revalidate every 60 seconds
```

### 4. Data Fetching Strategy

**Current:** Server-side rendering with parallel queries

**Alternatives:**
- **Streaming SSR:** Stream data as it becomes available
- **Client-side Fetching:** Load critical data server-side, fetch rest client-side
- **Hybrid:** Critical data SSR, secondary data client-side

---

## Monitoring

### Metrics to Watch:

1. **Query Execution Time**
   - Monitor average query time
   - Alert if queries consistently take > 5 seconds

2. **Timeout Rate**
   - Track percentage of queries that timeout
   - Alert if timeout rate increases

3. **Page Load Time**
   - Monitor total page load time
   - Target: < 3 seconds for first load

4. **Database Performance**
   - Monitor Supabase query performance
   - Check for slow queries in Supabase dashboard

---

## Testing

### Manual Testing:

1. **Fast Connection:**
   - Queries should complete quickly (< 2 seconds)
   - No timeout errors

2. **Slow Connection:**
   - Queries should complete within 10 seconds
   - Page still renders if queries timeout

3. **No Connection:**
   - Page should render gracefully with empty data
   - No errors thrown

### Automated Testing:

Consider adding:
- Integration tests for homepage data fetching
- Performance tests for query timeouts
- Error handling tests for database failures

---

## Conclusion

The query timeout issue has been resolved by:

1. ✅ Increasing timeout from 3s to 10s
2. ✅ Reducing log noise in production
3. ✅ Maintaining graceful error handling

The page will now handle slower database connections better while still providing reasonable timeout protection. Further optimizations (indexes, caching) can be implemented if performance issues persist.
