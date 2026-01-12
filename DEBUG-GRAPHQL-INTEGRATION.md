# GraphQL Integration Debug Guide

## ✅ Implementation Complete

### Files Created/Modified

1. **`lib/supabase/graphql-client.ts`** ✅
   - GraphQL query utilities
   - Availability checking
   - Error handling

2. **`hooks/use-pokepedia-sync.ts`** ✅
   - GraphQL-first approach
   - REST fallback
   - Relationship handling

## How It Works

### Sync Flow

1. **Master Data Sync**:
   - Tries GraphQL first (`getMasterDataGraphQL()`)
   - Falls back to REST if GraphQL fails
   - Stores in IndexedDB

2. **Critical Pokemon Sync**:
   - Tries GraphQL first (`getPokemonRangeGraphQL(1, 50)`)
   - Gets Pokemon + relationships in one query
   - Falls back to REST if GraphQL fails
   - Handles schema cache errors gracefully

### GraphQL Benefits

- ✅ **Bypasses PostgREST**: No schema cache issues
- ✅ **Single Query**: Pokemon + relationships in one request
- ✅ **Better Performance**: Less network overhead
- ✅ **Graceful Fallback**: Works with or without GraphQL

## Testing

### Check GraphQL Availability

The client automatically checks availability on first use. You'll see:
- `[Sync] Fetched X Pokemon via GraphQL` - GraphQL working
- `GraphQL query failed, falling back to REST` - Using REST fallback

### Verify GraphQL Endpoint

```bash
# Test GraphQL endpoint
curl -X POST http://127.0.0.1:54321/graphql/v1 \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"query": "{ pokemon_comprehensive(limit: 1) { pokemon_id name } }"}'
```

## Troubleshooting

### GraphQL Not Available (404)

**No action needed** - System automatically falls back to REST.

### GraphQL Schema Errors

If GraphQL queries fail with schema errors:
1. Check table names match GraphQL schema
2. Verify relationships are properly set up
3. System will fall back to REST automatically

### Schema Cache Errors Still Occurring

If you still see PGRST205 errors:
1. GraphQL should bypass these
2. Check if GraphQL is actually being used (check console logs)
3. Verify GraphQL endpoint is accessible

## Current Status

✅ GraphQL client created
✅ Sync hook updated
✅ Fallback mechanism implemented
✅ Error handling improved
🔄 Testing needed

## Next Steps

1. Refresh browser and check console
2. Look for GraphQL success messages
3. Verify sync works without errors
4. Monitor performance improvements
