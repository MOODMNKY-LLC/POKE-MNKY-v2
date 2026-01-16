# PokeAPI Architecture Implementation

## Overview

Implemented smart routing: **Server-side uses custom API, Client-side uses official API**

## Architecture

### Server-Side (API Routes, Server Components)
- **Primary**: Custom PokeAPI (`pokeapi.moodmnky.com`)
- **Fallback**: Official PokeAPI (`pokeapi.co`)
- **Why**: Respects fair use, keeps internal infrastructure comprehensive

### Client-Side (React Hooks, Components)
- **Primary**: Official PokeAPI (`pokeapi.co`) via `pokenode-ts`
- **Why**: Simple, direct access, no server round-trip

## Implementation

### Key Changes

1. **`lib/pokemon-api-enhanced.ts`**:
   - Added `fetchPokemonData()` - Smart routing based on environment
   - Server-side: Custom API → Official API fallback
   - Client-side: Official API via pokenode-ts
   - Updated ability/move fetching to use custom API on server-side

2. **Automatic Detection**:
   - Uses `typeof window === 'undefined'` to detect server vs client
   - No manual configuration needed

3. **Fallback Logic**:
   - Checks if custom API has complete data (stats, types populated)
   - Automatically falls back if incomplete or fails
   - Seamless user experience

## Environment Variables

```bash
# Optional: Override custom API URL
POKEAPI_BASE_URL=https://pokeapi.moodmnky.com/api/v2
```

## Benefits

✅ Respects PokeAPI fair use  
✅ Keeps internal infrastructure comprehensive  
✅ Client-side simplicity (direct API access)  
✅ Automatic fallback ensures reliability  
✅ No code changes needed when custom API is ready
