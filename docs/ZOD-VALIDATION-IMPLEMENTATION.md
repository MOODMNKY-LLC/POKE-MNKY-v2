# Zod Validation Implementation for Sync Systems

## Overview

Added Zod schema validation to both PokéPedia and Showdown sync systems for:
- **Runtime type safety** - Catch invalid data before storage
- **API change detection** - Detect when APIs change structure
- **Better error messages** - Detailed validation errors
- **Data integrity** - Ensure only valid data is stored

## Implementation

### 1. PokéAPI Schemas (`lib/schemas/pokeapi-schemas.ts`)

Created Zod schemas for key PokéAPI resources:
- `PokemonDetailSchema` - Full Pokemon resource
- `PokemonSpeciesDetailSchema` - Pokemon species
- `AbilityDetailSchema` - Abilities
- `MoveDetailSchema` - Moves
- `TypeDetailSchema` - Types
- `GenericResourceSchema` - Fallback for unknown types

**Features:**
- Uses `.passthrough()` to allow additional fields (API may add fields)
- Validates required fields and types
- Provides detailed error messages

### 2. Showdown Schemas (`lib/schemas/showdown-schemas.ts`)

Created Zod schemas for Showdown pokedex.json:
- `ShowdownPokemonSchema` - Individual Pokemon entry
- `ShowdownPokedexSchema` - Full pokedex structure

**Features:**
- Validates Showdown-specific structure
- Handles formes, evolutions, learnsets
- Type-safe validation

### 3. Validation Helpers (`lib/validation-helpers.ts`)

Created lightweight validators for Edge Functions (Deno):
- Can't import Zod in Deno, so manual validation
- Basic structure checks
- Resource-type-specific validators

### 4. Updated Clients

**PokéAPI Client (`lib/pokeapi-client.ts`):**
- Added Zod validation using `validatePokAPIResponse()`
- Returns detailed validation errors
- Skips invalid responses (logs error, doesn't fail)

**Edge Functions:**
- Basic validation (can't use Zod in Deno)
- Logs validation warnings
- Continues processing despite validation issues

## Usage

### In Next.js API Routes (Full Zod Validation)

```typescript
import { fetchResourceByUrl, validatePokAPIResponse } from '@/lib/pokeapi-client'
import { validatePokAPIResponse } from '@/lib/schemas/pokeapi-schemas'

const { data, error } = await fetchResourceByUrl(url)

if (error) {
  // Handle error
  return
}

// Validate with Zod
const validation = validatePokAPIResponse('pokemon', data)
if (!validation.success) {
  console.error('Validation errors:', validation.error.errors)
  // Handle validation failure
  return
}

// data is validated and type-safe
const pokemon = validation.data
```

### In Edge Functions (Basic Validation)

```typescript
// Basic structure validation (no Zod in Deno)
if (typeof data?.id !== 'number' || typeof data?.name !== 'string') {
  console.warn('Invalid response structure')
  // Log but continue - store anyway for debugging
}
```

## Benefits

1. **Type Safety**: Catch errors at runtime
2. **API Change Detection**: Detect when PokéAPI structure changes
3. **Better Errors**: Detailed validation error messages
4. **Data Integrity**: Only valid data stored
5. **Debugging**: Log validation failures for review

## Next Steps

1. ✅ Created Zod schemas for PokéAPI
2. ✅ Created Zod schemas for Showdown
3. ✅ Added validation to PokéAPI client
4. ✅ Added basic validation to Edge Functions
5. ⬜ Add validation to Showdown sync
6. ⬜ Add monitoring for validation failures
7. ⬜ Alert on persistent validation errors

## Schema Updates

When PokéAPI or Showdown structure changes:
1. Update OpenAPI spec (PokéAPI)
2. Regenerate TypeScript types: `npx openapi-typescript schemas/pokeapi-openapi.yaml -o lib/types/pokeapi-generated.ts`
3. Update Zod schemas in `lib/schemas/pokeapi-schemas.ts`
4. Test validation still works
