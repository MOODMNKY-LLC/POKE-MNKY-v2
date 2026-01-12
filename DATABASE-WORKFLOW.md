# Database Workflow Guide

## Overview

This guide explains how to manage database migrations and sync scripts between local and production environments.

## ✅ Current Status

- **Migrations**: All synced (6 migrations)
- **Pokemon Cache**: 1,025 Pokemon cached
- **Project Linked**: `chmrszrwlfeqovwxyrmt` (poke-mnky-db)

---

## 🔄 Workflow: After Local Database Reset

### Step 1: Pull Migrations from Production

After resetting your local database, pull the schema from production:

```bash
# Pull migrations and schema from production
supabase db pull
```

This will:
- Download any missing migrations from production
- Create a migration file for any schema differences
- Sync your local migration history with production

### Step 2: Apply Migrations Locally

Migrations are automatically applied when you run `supabase db pull`, but if needed:

```bash
# Start local Supabase (if not running)
supabase start

# Migrations are applied automatically on start
```

### Step 3: Run Sync Scripts

Populate the Pokemon cache:

```bash
# Pre-cache competitive Pokemon (fast, ~5 seconds)
pnpm exec tsx --env-file=.env.local scripts/pre-cache-competitive-pokemon.ts

# Full sync all Pokemon (slow, ~6 minutes)
pnpm exec tsx --env-file=.env.local scripts/full-sync-pokemon.ts
```

**Note**: The full sync runs in the background and can take ~6 minutes for 1,025 Pokemon.

### Step 4: Verify Setup

Check that everything is working:

```bash
# Check migration status
supabase migration list

# Check Pokemon cache
# Run in Supabase SQL Editor:
SELECT COUNT(*) FROM pokemon_cache;
```

---

## 🚀 Workflow: Push Changes to Production

### When to Push

Push to production when you:
- Create new migrations locally
- Modify existing migrations
- Need to sync schema changes

### How to Push

```bash
# Push local migrations to production
supabase db push
```

This will:
- Apply any new migrations to production
- Update the remote migration history
- Keep local and production in sync

**Important**: Always test migrations locally before pushing to production!

---

## 📋 Migration Management

### View Migration Status

```bash
# List all migrations (local vs remote)
supabase migration list
```

### Repair Migration History

If migrations get out of sync:

```bash
# Mark a migration as reverted
supabase migration repair --status reverted <migration_version>

# Mark a migration as applied
supabase migration repair --status applied <migration_version>
```

### Create New Migration

```bash
# Create a new migration file
supabase migration new <migration_name>

# Edit the file in supabase/migrations/
# Then push to production
supabase db push
```

---

## 🔧 Scripts Reference

### Pre-Cache Competitive Pokemon

**Purpose**: Cache top 48 competitive Pokemon  
**Duration**: ~5 seconds  
**When to run**: After database reset, when new competitive Pokemon emerge

```bash
pnpm exec tsx --env-file=.env.local scripts/pre-cache-competitive-pokemon.ts
```

### Full Pokemon Sync

**Purpose**: Sync all 1,025 Pokemon from PokéAPI  
**Duration**: ~6 minutes  
**When to run**: After database reset, when new generation releases

```bash
pnpm exec tsx --env-file=.env.local scripts/full-sync-pokemon.ts
```

### Incremental Sync

**Purpose**: Sync only new/expired Pokemon  
**Duration**: Varies (usually < 1 minute)  
**When to run**: Daily cron job, or manually when needed

```bash
pnpm exec tsx --env-file=.env.local scripts/incremental-sync-pokemon.ts
```

---

## 🐛 Troubleshooting

### Migration Mismatch

**Error**: "Remote migration versions not found in local migrations directory"

**Solution**:
```bash
# Repair migration history
supabase migration repair --status reverted <remote_version>
supabase migration repair --status applied <local_version>

# Then pull
supabase db pull
```

### Schema Drift

**Error**: "The remote database's migration history does not match local files"

**Solution**:
```bash
# Pull to sync
supabase db pull

# This creates a migration file for differences
# Review and commit if needed
```

### Cache Empty After Reset

**Solution**:
```bash
# Run sync scripts
pnpm exec tsx --env-file=.env.local scripts/pre-cache-competitive-pokemon.ts
pnpm exec tsx --env-file=.env.local scripts/full-sync-pokemon.ts
```

---

## 📝 Best Practices

1. **Always pull before pushing**: `supabase db pull` before `supabase db push`
2. **Test locally first**: Run migrations locally before pushing to production
3. **Commit migrations**: Keep migration files in git
4. **Monitor sync jobs**: Check `sync_jobs` table for sync status
5. **Use incremental sync**: Set up daily cron for incremental sync instead of full sync

---

## 🔗 Quick Reference

| Command | Purpose |
|---------|---------|
| `supabase db pull` | Pull schema from production |
| `supabase db push` | Push migrations to production |
| `supabase migration list` | View migration status |
| `supabase migration repair` | Fix migration history |
| `supabase status` | Check local Supabase status |
| `supabase link --project-ref <ref>` | Link to production project |

---

## ✅ Current Migration Files

1. `20260112104004_create_schema.sql` - Base schema
2. `20260112104025_enhanced_schema.sql` - Extended schema
3. `20260112104030_add_extended_pokemon_fields.sql` - Pokemon cache enhancements
4. `20260112104051_user_management_rbac.sql` - RBAC system
5. `20260112104100_create_sync_jobs_table.sql` - Sync job tracking
6. `20260112110233_remote_schema.sql` - Remote schema snapshot

---

## 🎯 Summary

**After Local Reset:**
1. `supabase db pull` - Sync migrations
2. Run sync scripts - Populate cache
3. Verify - Check counts and status

**Push to Production:**
1. `supabase db push` - Apply migrations
2. Monitor - Check for errors

**Future Resets:**
- Just run `supabase db pull` - No need to re-run scripts if production has data!
