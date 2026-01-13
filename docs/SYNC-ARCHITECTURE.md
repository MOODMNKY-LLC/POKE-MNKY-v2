# Sync Architecture - REST for Syncing, GraphQL for Querying

## Overview

The Pokepedia sync system uses a clear separation of concerns:
- **REST API**: Used for all syncing operations (fetching from PokeAPI, storing in Supabase)
- **GraphQL API**: Used only for querying cached data in-app components (after sync is complete)

## Architecture Flow

\`\`\`
┌─────────────┐
│   PokeAPI   │
│   (Source)  │
└──────┬──────┘
       │ REST API
       │ (Sync)
       ▼
┌──────────────┐         ┌─────────────┐
│   Supabase   │ ◀─REST─│   Client    │
│  (Storage)   │         │  (Sync)    │
└──────┬───────┘         └─────────────┘
       │
       │ GraphQL API
       │ (Query)
       ▼
┌─────────────┐
│   Client    │
│  (In-App)   │
└─────────────┘
\`\`\`

## Sync Operations (REST API)

### Master Data Sync
- **Method**: REST API (`supabase.from("types")`, etc.)
- **Purpose**: Fetch types, abilities, moves from Supabase
- **When**: On app start, checks if data exists
- **Fallback**: If no data exists, triggers background sync via Edge Function

### Critical Pokemon Sync
- **Method**: REST API (`supabase.from("pokemon_comprehensive")`)
- **Purpose**: Fetch Pokemon 1-50 for immediate app usability
- **When**: After master data sync completes
- **Relationships**: Fetched separately via REST API

### Background Sync
- **Method**: Edge Function uses REST API to fetch from PokeAPI
- **Purpose**: Comprehensive sync of all Pokemon data
- **When**: Triggered automatically if data doesn't exist

## Query Operations (GraphQL API)

### In-App Components
- **Method**: GraphQL API (`getPokemonRangeGraphQL`, etc.)
- **Purpose**: Efficient querying of cached data
- **When**: After sync is complete, for app components
- **Benefits**: Single query for Pokemon + relationships, better performance

## Key Principles

1. **Sync = REST**: All syncing operations use REST API
2. **Query = GraphQL**: All querying operations use GraphQL API
3. **Clear Separation**: Sync hook doesn't use GraphQL, app components do
4. **Progressive Loading**: Master data → Critical Pokemon → Background sync

## Files

- **Sync Hook**: `hooks/use-pokepedia-sync.ts` - Uses REST only
- **GraphQL Client**: `lib/supabase/graphql-client.ts` - For app components
- **Server GraphQL**: `lib/supabase/graphql-server-client.ts` - For server-side queries
- **Edge Function**: `supabase/functions/sync-pokepedia/index.ts` - Uses REST for PokeAPI

## Benefits

- ✅ **Clear separation**: Sync vs Query operations
- ✅ **Reliability**: REST is more stable for bulk operations
- ✅ **Performance**: GraphQL for efficient querying
- ✅ **Maintainability**: Easier to understand and debug
