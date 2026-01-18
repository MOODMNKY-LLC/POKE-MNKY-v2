# Migration Repair and Push Guide

**Date**: January 18, 2026  
**Purpose**: Step-by-step guide to repair migration history and push local migrations

---

## Current Situation

### Problem

Production database has many archived migrations that don't exist locally. This creates a migration history mismatch that prevents `supabase db push` from working.

### Local Migrations Needing Push

1. **`20260118000000_enable_pgvector.sql`**
   - Enables pgvector extension
   - Low risk - adds extension capability
   - Needed for: Vector operations, AI features

2. **`20260118000001_cleanup_unused_pokemon_tables.sql`**
   - Removes unused Pokemon tables
   - Low risk - only drops empty tables
   - Includes safety checks

---

## Repair Process

### Step 1: Mark Archived Migrations as Reverted

Run these commands to mark archived migrations as reverted in production:

```bash
supabase migration repair --status reverted 20260112000000
supabase migration repair --status reverted 20260112000001
supabase migration repair --status reverted 20260112000002
supabase migration repair --status reverted 20260112000003
supabase migration repair --status reverted 20260112000004
supabase migration repair --status reverted 20260112000005
supabase migration repair --status reverted 20260112000006
supabase migration repair --status reverted 20260112000007
supabase migration repair --status reverted 20260112104004
supabase migration repair --status reverted 20260112104025
supabase migration repair --status reverted 20260112104030
supabase migration repair --status reverted 20260112104051
supabase migration repair --status reverted 20260112104100
supabase migration repair --status reverted 20260112105000
supabase migration repair --status reverted 20260112105001
supabase migration repair --status reverted 20260112110233
supabase migration repair --status reverted 20260113000000
supabase migration repair --status reverted 20260113010000
supabase migration repair --status reverted 20260113010001
supabase migration repair --status reverted 20260113020000
supabase migration repair --status reverted 20260113020001
supabase migration repair --status reverted 20260113030000
supabase migration repair --status reverted 20260113030001
supabase migration repair --status reverted 20260113030002
supabase migration repair --status reverted 20260114000000
supabase migration repair --status reverted 20260114050239
supabase migration repair --status reverted 20260116000001
supabase migration repair --status reverted 20260116000004
supabase migration repair --status reverted 20260116000005
supabase migration repair --status reverted 20260116000006
supabase migration repair --status reverted 20260116000007
supabase migration repair --status reverted 20260116000008
supabase migration repair --status reverted 20260116000009
supabase migration repair --status reverted 20260116000010
supabase migration repair --status reverted 20260116000011
supabase migration repair --status reverted 20260116000012
supabase migration repair --status reverted 20260116000013
supabase migration repair --status reverted 20260116000014
supabase migration repair --status reverted 20260116080225
supabase migration repair --status reverted 20260117000003
supabase migration repair --status reverted 20260117000004
supabase migration repair --status reverted 20260117080754
supabase migration repair --status reverted 20260117092345
supabase migration repair --status reverted 20260117092502
```

### Step 2: Verify Migration History

After repair, verify migration history:

```bash
supabase migration list --linked
```

Expected result: Local and remote migrations should align, with only the two local migrations showing as pending.

### Step 3: Push Local Migrations

Push the two local migrations:

```bash
# Preview first
supabase db push --dry-run

# If preview looks good, push
supabase db push
```

### Step 4: Verify Application

After pushing, verify migrations applied successfully:

```bash
# Check migration list
supabase migration list --linked

# Verify pgvector extension
# (Connect to database and check: SELECT * FROM pg_extension WHERE extname = 'vector';)

# Verify cleanup (check that unused tables are gone)
# (Connect to database and verify tables don't exist)
```

---

## Alternative: Manual Application

If repair is complex, apply migrations manually:

1. **Review Migrations**: Read both migration files
2. **Backup Production**: Create database backup
3. **Apply via SQL Editor**: Execute SQL in Supabase Dashboard
4. **Update Migration History**: Manually update `supabase_migrations.schema_migrations` table

---

## Safety Notes

### pgvector Migration

- **Low Risk**: Only enables extension
- **Reversible**: Can disable if needed
- **Dependencies**: None

### Cleanup Migration

- **Low Risk**: Only drops empty tables
- **Safety Checks**: Includes verification of critical tables
- **Reversible**: Tables can be recreated if needed (but they're empty)

---

## Troubleshooting

### If Repair Fails

- Check Supabase CLI version: `supabase --version`
- Verify project link: `supabase link --project-ref <ref>`
- Check database connectivity
- Review error messages for specific issues

### If Push Fails

- Verify migration history repair completed
- Check for syntax errors in migrations
- Verify database permissions
- Review Supabase logs

---

## Related Documentation

- **Migration Status**: See `MIGRATION-STATUS.md` for current status
- **Database Alignment**: See `../../database-alignment/` for alignment strategies

---

**Status**: Ready for Execution  
**Risk Level**: Low  
**Estimated Time**: 10-15 minutes
