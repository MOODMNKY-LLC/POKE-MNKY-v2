# Local-First Pokepedia Development Guide

## 🎯 Approach

All migrations are designed to work with `supabase db push` for local-first development.

## 📋 Migration Files

1. **`20260112000003_create_comprehensive_pokedex.sql`**
   - Core schema (15 tables)
   - Master data + Pokemon + Relationships

2. **`20260112000004_comprehensive_pokepedia_schema.sql`**
   - Extended schema (natures, egg groups, etc.)
   - Additional master data tables

## 🔄 Workflow

### Development
```bash
# 1. Make schema changes in migrations
# 2. Apply locally
supabase db push

# 3. Test sync
npx tsx scripts/comprehensive-pokepedia-sync.ts master

# 4. Verify in Supabase Studio
# http://127.0.0.1:54323
```

### Production
```bash
# Migrations auto-apply via Supabase
# Or manually:
supabase db push --linked
```

## ✅ Verification

After migrations:
```sql
-- Check core tables
SELECT COUNT(*) FROM types;
SELECT COUNT(*) FROM abilities;
SELECT COUNT(*) FROM moves;
SELECT COUNT(*) FROM pokemon_comprehensive;

-- Check extended tables
SELECT COUNT(*) FROM natures;
SELECT COUNT(*) FROM egg_groups;
SELECT COUNT(*) FROM pokemon_colors;
```

---

**Status**: ✅ Local-first migrations ready!
