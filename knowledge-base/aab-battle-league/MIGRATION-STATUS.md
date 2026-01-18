# Migration Status - Action Required

**Date**: January 18, 2026  
**Status**: ⚠️ **Migrations Need Attention**

---

## Current Situation

### Local Migrations Not in Production

Two migrations exist locally but have not been applied to production:

1. **`20260118000000_enable_pgvector.sql`**
   - Enables pgvector extension for vector operations
   - Needed for: Vector search capabilities, embeddings

2. **`20260118000001_cleanup_unused_pokemon_tables.sql`**
   - Removes unused Pokemon tables from abandoned PokeAPI cloning strategy
   - Drops empty tables: pokemon_comprehensive, pokemon_species, pokemon_types, etc.
   - **Safety**: Includes verification checks to ensure critical tables remain

### Migration History Issue

Production has many archived migrations that don't exist locally. This creates a migration history mismatch that prevents `supabase db push` from working.

---

## Recommended Action

### Option 1: Repair History Then Push (Recommended)

```bash
# First, repair migration history for archived migrations
# (These are already archived locally, so mark as reverted in production)
supabase migration repair --status reverted <migration_id>

# Then push the two local migrations
supabase db push
```

### Option 2: Apply Migrations Manually

If repair is complex, apply migrations manually via Supabase Dashboard SQL Editor:
1. Review `20260118000000_enable_pgvector.sql`
2. Review `20260118000001_cleanup_unused_pokemon_tables.sql`
3. Execute in production SQL Editor
4. Update migration history table manually

---

## Migration Details

### pgvector Extension Migration

**Purpose**: Enables vector operations for AI/ML features
**Impact**: Low risk - adds extension capability
**Dependencies**: None

### Cleanup Migration

**Purpose**: Removes unused tables from failed PokeAPI cloning approach
**Impact**: Low risk - only drops empty tables, includes safety checks
**Dependencies**: None
**Safety**: Verifies critical tables (pokemon, pokemon_cache, pokepedia_pokemon) remain

---

## Next Steps

1. Review migrations for appropriateness
2. Choose repair/push strategy
3. Execute migration application
4. Verify successful application
5. Continue with knowledge base creation

---

**Note**: These migrations are safe to apply but migration history repair may be needed first.
