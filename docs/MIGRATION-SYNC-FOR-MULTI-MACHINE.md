# Migration Sync Guide - Multi-Machine Setup

**Issue**: Migration files exist in remote database but not on local machine  
**Solution**: Sync migration files via git (NOT repair as reverted)  
**Date**: 2026-01-19

---

## ⚠️ CRITICAL: DO NOT Mark These as Reverted

**These migrations contain important seeded data:**
- `20260118093937` - Baseline schema
- `20260118094133` - Remote schema sync
- `20260119072730` - Remote schema sync
- `20260119074102` - Remote schema sync
- `20260119081827` - Rename draft_pool to sheets_draft_pool
- `20260119082412` - Create draft_pool table
- `20260119082530` - Add is_available to draft_pool
- `20260119083400` - Comprehensive draft_pool enhancement
- `20260119111702` - Populates `sheets_draft_pool`
- `20260119113545` - Populates `teams`, `coaches`, `draft_budgets`
- `20260119114000` - Populates `draft_sessions`
- `20260119114500` - Fixes teams/coaches (ensures all 20 teams)
- `20260119120000` - Populates `draft_pool`
- `20260119120100` - Makes `draft_pool.season_id` NOT NULL
- `20260119130000` - Populates `draft_pool` (fix)

**If you mark these as "reverted":**
- ❌ Seeded data will be lost
- ❌ App Agent won't have teams/Pokemon data
- ❌ Draft system won't work
- ❌ Schema changes will be lost

---

## ✅ Correct Solution: Sync Migration Files

### Step 1: On Machine 1 (Where Migrations Exist)

**Quick Script** (recommended):
```bash
cd /path/to/POKE-MNKY
./scripts/sync-migrations-to-other-machine.sh
```

**Manual Steps**:
```bash
# Ensure all migration files are committed to git
cd /path/to/POKE-MNKY
git status supabase/migrations/

# If any migrations are uncommitted, commit them
git add supabase/migrations/
git commit -m "chore: sync migration files for multi-machine setup"
git push origin master  # or main
```

### Step 2: On Machine 2 (Where Migrations Are Missing)

```bash
# Pull latest changes from git
cd /path/to/POKE-MNKY
git pull origin main  # or your branch name

# Verify migration files exist
ls -1 supabase/migrations/20260118*.sql
ls -1 supabase/migrations/20260119*.sql

# Should see all the migration files now
```

### Step 3: Verify Migration History Matches

```bash
# Check migration list (should show both Local and Remote)
supabase migration list --linked

# Should see all migrations with both columns filled
# If still showing mismatch, continue to Step 4
```

### Step 4: Mark Migrations as Applied (On Machine 2)

**After pulling migration files, mark them as applied:**

```bash
# Mark local migrations as applied (schema already matches production)
# This tells Supabase "yes, these migrations are already in production"

# Run all at once:
supabase migration repair --status applied 20260118093937 --linked && \
supabase migration repair --status applied 20260118094133 --linked && \
supabase migration repair --status applied 20260119072730 --linked && \
supabase migration repair --status applied 20260119074102 --linked && \
supabase migration repair --status applied 20260119081827 --linked && \
supabase migration repair --status applied 20260119082412 --linked && \
supabase migration repair --status applied 20260119082530 --linked && \
supabase migration repair --status applied 20260119083400 --linked && \
supabase migration repair --status applied 20260119111702 --linked && \
supabase migration repair --status applied 20260119113545 --linked && \
supabase migration repair --status applied 20260119114000 --linked && \
supabase migration repair --status applied 20260119114500 --linked && \
supabase migration repair --status applied 20260119120000 --linked && \
supabase migration repair --status applied 20260119120100 --linked && \
supabase migration repair --status applied 20260119130000 --linked

echo "✅ All migrations marked as applied"
```

**Why `--status applied` (NOT `reverted`)?**
- ✅ Migrations are already in production (schema matches)
- ✅ Data is already seeded
- ✅ We just need to sync the history tracking
- ✅ This tells Supabase "yes, these are applied, don't try to re-apply them"

**Note**: Use `--status applied` (NOT `reverted`) because:
- ✅ Migrations are already in production
- ✅ Schema already matches
- ✅ Data already seeded
- ✅ We just need to sync the history tracking

---

## Prevention: Best Practices

### 1. Always Commit Migration Files

```bash
# After creating a migration
supabase migration new migration_name

# Immediately commit it
git add supabase/migrations/
git commit -m "feat: add migration_name migration"
git push
```

### 2. Pull Before Creating Migrations

```bash
# On any machine, before creating new migrations
git pull origin main

# Then create migration
supabase migration new migration_name
```

### 3. Use Git for Migration Sync

**✅ DO:**
- Commit migration files to git
- Pull before creating migrations
- Push after creating migrations

**❌ DON'T:**
- Create migrations on multiple machines without syncing
- Mark migrations as "reverted" if they exist in production
- Skip git sync between machines

---

## Quick Fix Script

If you need to quickly sync migrations on Machine 2:

```bash
#!/bin/bash
# Run this on Machine 2 (where migrations are missing)

cd /path/to/POKE-MNKY

# 1. Pull latest from git
echo "Pulling latest changes..."
git pull origin main

# 2. Verify migrations exist
echo "Checking migration files..."
MISSING=$(comm -23 <(supabase migration list --linked | grep -E "^\s+[0-9]" | awk '{print $1}' | sort) \
                   <(ls -1 supabase/migrations/*.sql | xargs -n1 basename | sed 's/_.*//' | sort))

if [ -z "$MISSING" ]; then
    echo "✅ All migration files exist locally"
else
    echo "⚠️ Missing migrations: $MISSING"
    echo "Please ensure git is up-to-date"
    exit 1
fi

# 3. Mark as applied (if needed)
echo "Syncing migration history..."
supabase migration repair --status applied 20260118093937 --linked
supabase migration repair --status applied 20260118094133 --linked
supabase migration repair --status applied 20260119072730 --linked
supabase migration repair --status applied 20260119074102 --linked
supabase migration repair --status applied 20260119081827 --linked
supabase migration repair --status applied 20260119082412 --linked
supabase migration repair --status applied 20260119082530 --linked
supabase migration repair --status applied 20260119083400 --linked
supabase migration repair --status applied 20260119111702 --linked
supabase migration repair --status applied 20260119113545 --linked
supabase migration repair --status applied 20260119114000 --linked
supabase migration repair --status applied 20260119114500 --linked
supabase migration repair --status applied 20260119120000 --linked
supabase migration repair --status applied 20260119120100 --linked
supabase migration repair --status applied 20260119130000 --linked

# 4. Verify
echo "Verifying migration history..."
supabase migration list --linked | tail -5

echo "✅ Migration sync complete!"
```

---

## Impact on App Agent Workflow

### ✅ After Sync: App Agent Can Work Normally

1. **Pull Production DB**:
   ```bash
   supabase db pull --linked
   ```
   - ✅ Gets all migrations
   - ✅ Gets all seeded data
   - ✅ Schema matches production

2. **Work Locally**:
   - ✅ Can run `supabase db reset` (uses seed.sql)
   - ✅ Can test migrations locally
   - ✅ Can develop draft features

### ❌ Before Sync: App Agent Blocked

- ❌ Can't pull production DB
- ❌ Can't sync schema
- ❌ Can't work with seeded data

---

## Summary

**Problem**: Migration files missing on Machine 2  
**Solution**: Sync via git, then mark as applied (NOT reverted)  
**Prevention**: Always commit/pull migration files via git

**Key Points**:
1. ✅ Sync migration files via git first
2. ✅ Use `--status applied` (NOT `reverted`)
3. ✅ Commit migrations immediately after creating
4. ✅ Pull before creating new migrations

---

**Last Updated**: 2026-01-19  
**Status**: Ready for multi-machine sync
