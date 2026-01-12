# Supabase GraphQL Setup Guide

## Overview

We're implementing a hybrid approach:
- **REST API**: For syncing data FROM PokeAPI TO Supabase (bulk operations)
- **GraphQL API**: For querying cached data FROM Supabase (client queries)

This provides:
- ✅ Fast bulk syncing (REST)
- ✅ Efficient client queries (GraphQL)
- ✅ Avoids schema cache issues (GraphQL bypasses PostgREST)
- ✅ Better performance for complex queries

## GraphQL Endpoint

**Local**: `http://127.0.0.1:54321/graphql/v1`
**Remote**: `https://{project-ref}.supabase.co/graphql/v1`

## Implementation

### 1. GraphQL Client (`lib/supabase/graphql-client.ts`)

Provides GraphQL queries for:
- `getPokemonByIdGraphQL()` - Single Pokemon with relationships
- `getPokemonRangeGraphQL()` - Multiple Pokemon (1-50, etc.)
- `searchPokemonGraphQL()` - Search by name
- `getMasterDataGraphQL()` - Types, abilities, moves

### 2. Updated Sync Hook (`hooks/use-pokepedia-sync.ts`)

**Changes**:
- Uses GraphQL for reading cached data (master data, Pokemon)
- Falls back to REST if GraphQL fails
- Keeps REST for syncing from PokeAPI

**Benefits**:
- Avoids PostgREST schema cache issues
- More efficient queries (single request for Pokemon + relationships)
- Better error handling

## Usage

### Query Pokemon via GraphQL

```typescript
import { getPokemonRangeGraphQL } from "@/lib/supabase/graphql-client"

// Fetch Pokemon 1-50 with all relationships
const pokemon = await getPokemonRangeGraphQL(1, 50)
// Returns Pokemon with types, abilities, stats already included
```

### Fallback Pattern

The sync hook automatically falls back to REST if GraphQL fails:

```typescript
try {
  // Try GraphQL first
  const data = await getPokemonRangeGraphQL(1, 50)
} catch (error) {
  // Fallback to REST
  const { data } = await supabase.from("pokemon_comprehensive").select("*")
}
```

## GraphQL vs REST Comparison

| Operation | GraphQL | REST |
|-----------|---------|------|
| **Syncing** | ❌ Not used | ✅ Used (PokeAPI → Supabase) |
| **Querying** | ✅ Used (Supabase → Client) | ⚠️ Fallback |
| **Schema Cache** | ✅ Bypasses PostgREST | ❌ Affected by cache |
| **Relationships** | ✅ Single query | ❌ Multiple queries |
| **Performance** | ✅ Better for complex queries | ✅ Better for simple queries |

## Testing

1. **Test GraphQL endpoint**:
   ```bash
   curl -X POST http://127.0.0.1:54321/graphql/v1 \
     -H "Content-Type: application/json" \
     -H "apikey: YOUR_ANON_KEY" \
     -d '{"query": "{ pokemon_comprehensive(limit: 1) { pokemon_id name } }"}'
   ```

2. **Verify sync hook uses GraphQL**:
   - Check browser console for "[Sync] Fetched X Pokemon via GraphQL"
   - Should see GraphQL queries in Network tab

## Troubleshooting

### GraphQL Not Available

If GraphQL endpoint returns 404:
1. Check Supabase config: `schemas = ["public", "graphql_public"]`
2. Restart Supabase: `supabase stop && supabase start`
3. Verify endpoint: `http://127.0.0.1:54321/graphql/v1`

### GraphQL Errors

If GraphQL queries fail:
- Hook automatically falls back to REST
- Check console for fallback messages
- Verify table names match GraphQL schema

## Next Steps

1. ✅ GraphQL client created
2. ✅ Sync hook updated to use GraphQL
3. 🔄 Test GraphQL queries
4. 🔄 Update other components to use GraphQL
5. 🔄 Add GraphQL query caching
