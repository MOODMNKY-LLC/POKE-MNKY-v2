# Database Sync Workflow - Production & Local Alignment

**Date**: January 17, 2026  
**Status**: ✅ **WORKFLOW ESTABLISHED**  
**Purpose**: Ensure production and local Supabase databases stay aligned when working with server agent

---

## 🎯 Overview

This workflow ensures that when the server agent makes database changes, everything stays synchronized between:
- **Production Database** (`chmrszrwlfeqovwxyrmt`)
- **Local Database** (Supabase local instance)

---

## 📋 Prerequisites

### 1. Verify Project Link

```bash
supabase projects list
```

**Expected**: `poke-mnky-db` should show `●` (linked)

**If not linked**:
```bash
supabase link --project-ref chmrszrwlfeqovwxyrmt
```

### 2. Verify Local Supabase is Running

```bash
supabase status
```

**Expected**: "local development setup is running"

**If not running**:
```bash
supabase start
```

---

## 🔄 Sync Workflow

### Phase 1: Before Server Agent Works

**Goal**: Pull current production schema to ensure local is up-to-date

**Script**: `scripts/sync-db-pre-server.ts`

**Manual Steps**:
```bash
# 1. Pull production schema
supabase db pull

# 2. Apply migrations locally
supabase migration up

# 3. Verify sync
supabase db diff
```

**What This Does**:
- ✅ Pulls current production schema
- ✅ Generates migration if there are differences
- ✅ Applies migrations to local database
- ✅ Verifies local and production are aligned

**When to Run**:
- Before server agent starts making changes
- When you want to ensure local is current

---

### Phase 2: Server Agent Makes Changes

**During this phase**:
- Server agent makes changes to production database
- You may make local changes
- Both databases diverge

**No action needed** - just let the server agent work!

---

### Phase 3: After Server Agent Completes

**Goal**: Pull server agent's changes, merge with local, push everything back

**Script**: `scripts/sync-db-post-server.ts`

**Manual Steps**:
```bash
# 1. Pull server agent's changes from production
supabase db pull

# 2. Apply all migrations locally
supabase migration up

# 3. Verify no conflicts
supabase db diff

# 4. Push everything to production
supabase db push
```

**What This Does**:
- ✅ Pulls server agent's changes from production
- ✅ Generates migrations for their changes
- ✅ Applies all migrations locally
- ✅ Pushes all migrations to production
- ✅ Ensures both databases are aligned

**When to Run**:
- After server agent completes their work
- When you're ready to sync everything

---

## 🛠️ Scripts Available

### 1. Pre-Server Sync (`sync-db-pre-server.ts`)

**Usage**:
```bash
pnpm tsx scripts/sync-db-pre-server.ts
```

**What It Does**:
1. Checks Supabase is running
2. Pulls production schema
3. Applies migrations locally
4. Verifies sync

**Use Before**: Server agent starts working

---

### 2. Post-Server Sync (`sync-db-post-server.ts`)

**Usage**:
```bash
pnpm tsx scripts/sync-db-post-server.ts
```

**What It Does**:
1. Checks Supabase is running
2. Pulls server agent's changes
3. Applies all migrations locally
4. Pushes to production
5. Verifies final sync

**Use After**: Server agent completes work

---

### 3. Safe Sync Check (`sync-db-safe.ts`)

**Usage**:
```bash
pnpm tsx scripts/sync-db-safe.ts
# OR with dry-run
pnpm tsx scripts/sync-db-safe.ts --dry-run
```

**What It Does**:
- Shows current sync status
- Shows differences without making changes
- Safe to run anytime

**Use Anytime**: To check sync status

---

## 📝 Manual Commands Reference

### Pull Production Schema

```bash
supabase db pull
```

**What It Does**:
- Compares local schema with production
- Generates migration file if differences found
- Updates local schema files

**When to Use**:
- Before making changes
- After server agent makes changes
- When you want to sync from production

---

### Apply Migrations Locally

```bash
supabase migration up
```

**What It Does**:
- Applies all pending migrations to local database
- Runs migrations in order
- Updates local database schema

**When to Use**:
- After pulling from production
- After creating new migrations
- When local database is out of sync

---

### Push to Production

```bash
supabase db push
```

**What It Does**:
- Pushes all local migrations to production
- Applies migrations to production database
- Updates production schema

**⚠️ Warning**: This modifies production!

**When to Use**:
- After pulling server agent changes
- When local migrations are ready
- When you want to sync to production

---

### Check Differences

```bash
supabase db diff
```

**What It Does**:
- Shows differences between local and production
- Helps identify what needs syncing
- Safe to run (read-only)

**When to Use**:
- Before syncing
- After syncing (to verify)
- Anytime to check status

---

## 🔍 Verification Steps

### After Pre-Sync

```bash
# 1. Check migrations were created
ls -la supabase/migrations/

# 2. Verify local database
supabase db diff

# 3. Check Supabase status
supabase status
```

**Expected**:
- ✅ No differences between local and production
- ✅ All migrations applied locally
- ✅ Supabase running

---

### After Post-Sync

```bash
# 1. Verify no differences
supabase db diff

# 2. Check migration count
ls -1 supabase/migrations/*.sql | wc -l

# 3. Verify production (check via Supabase dashboard)
```

**Expected**:
- ✅ No differences
- ✅ All migrations applied to production
- ✅ Both databases aligned

---

## ⚠️ Important Notes

### Migration Conflicts

**If conflicts occur**:
1. Review the migration files
2. Check `supabase/migrations/` directory
3. Manually resolve conflicts if needed
4. Test locally before pushing

### Production Safety

**Before pushing**:
- ✅ Review migrations
- ✅ Test locally first
- ✅ Use `supabase db push --dry-run` to preview
- ✅ Backup production if needed

### Migration Naming

Migrations are auto-generated with timestamps:
- Format: `YYYYMMDDHHMMSS_description.sql`
- Don't manually edit generated migrations
- Create new migrations for your changes

---

## 🚨 Troubleshooting

### Issue: "Project not linked"

**Solution**:
```bash
supabase link --project-ref chmrszrwlfeqovwxyrmt
```

---

### Issue: "Local Supabase not running"

**Solution**:
```bash
supabase start
```

---

### Issue: "Migration conflicts"

**Solution**:
1. Review conflicting migrations
2. Manually merge if needed
3. Test locally
4. Push when ready

---

### Issue: "Push failed"

**Solution**:
1. Check error message
2. Review migrations
3. Use `supabase db push --dry-run` to preview
4. Fix issues and retry

---

## 📊 Sync Status Checklist

### Before Server Agent ✅
- [ ] Run `sync-db-pre-server.ts`
- [ ] Verify no differences (`supabase db diff`)
- [ ] Confirm local is up-to-date
- [ ] Server agent can proceed

### After Server Agent ✅
- [ ] Run `sync-db-post-server.ts`
- [ ] Verify server agent changes pulled
- [ ] Verify no conflicts
- [ ] Confirm production updated
- [ ] Verify final sync (`supabase db diff`)

---

## 🔄 Complete Workflow Example

```bash
# Step 1: Before server agent
pnpm tsx scripts/sync-db-pre-server.ts

# Step 2: Server agent works (no action needed)

# Step 3: After server agent
pnpm tsx scripts/sync-db-post-server.ts

# Step 4: Verify
supabase db diff
```

---

## 📚 Related Commands

### Check Migration Status

```bash
# List migrations
ls -la supabase/migrations/

# Check which migrations are applied
supabase migration list
```

### Reset Local Database

```bash
# ⚠️ WARNING: This resets local database!
supabase db reset
```

### Generate Migration from Changes

```bash
# After making schema changes locally
supabase db diff > supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

---

## ✅ Summary

**Quick Reference**:

1. **Before Server Agent**:
   ```bash
   pnpm tsx scripts/sync-db-pre-server.ts
   ```

2. **After Server Agent**:
   ```bash
   pnpm tsx scripts/sync-db-post-server.ts
   ```

3. **Check Status Anytime**:
   ```bash
   pnpm tsx scripts/sync-db-safe.ts
   # OR
   supabase db diff
   ```

**Key Commands**:
- `supabase db pull` - Pull from production
- `supabase migration up` - Apply migrations locally
- `supabase db push` - Push to production
- `supabase db diff` - Check differences

---

**Document Created**: January 17, 2026  
**Last Updated**: January 17, 2026  
**Status**: ✅ **READY FOR USE**
