# Database Sync Plan - Production ↔ Local Alignment

**Date**: January 17, 2026  
**Status**: 🔄 **SYNC PLAN READY**  
**Purpose**: Ensure production and local Supabase databases are perfectly aligned after server agent updates

---

## 🎯 Objective

When you return from working with the server agent:
1. ✅ Pull all schema changes from production
2. ✅ Sync migration history
3. ✅ Verify alignment
4. ✅ Handle any conflicts

---

## 📋 Pre-Sync Checklist

### Before Server Agent Work

**Current State** (to be verified):
- [ ] Local Supabase is running (`supabase status`)
- [ ] Project is linked (`supabase projects list`)
- [ ] Migration history is current (`supabase migration list`)
- [ ] No uncommitted local migrations

**Document Current State**:
```bash
# Save current migration status
supabase migration list > migration-status-before.txt

# Save current schema snapshot
supabase db dump --local --schema-only -f schema-before.sql
```

---

## 🔄 Sync Process (When You Return)

### Step 1: Check Current Status

```bash
# 1. Verify Supabase is running
supabase status

# 2. Check project link
supabase projects list

# 3. Check migration status
supabase migration list

# 4. Verify production connection
supabase db remote commit
```

**Expected Output**: Should show any differences between local and remote

---

### Step 2: Pull Schema Changes from Production

```bash
# Pull all schema changes and migrations from production
supabase db pull
```

**What This Does**:
- Downloads any new migrations from production
- Creates migration files for schema differences
- Updates local migration history
- **Does NOT pull data** (only schema)

**If Conflicts Occur**:
- Review the generated migration file
- Check for any manual changes needed
- Commit the migration file

---

### Step 3: Apply Migrations Locally

```bash
# Migrations are auto-applied, but verify:
supabase migration list

# If needed, reset and reapply:
supabase db reset
```

**Note**: `db reset` will:
- Drop all local data
- Reapply all migrations
- Run seed files (if configured)

---

### Step 4: Verify Schema Alignment

```bash
# Compare local and remote schemas
supabase db diff

# Check migration status
supabase migration list
```

**Expected**: No differences, all migrations applied

---

### Step 5: Verify Data Alignment (If Needed)

**Check Critical Tables**:
```sql
-- Run in Supabase SQL Editor (local)
SELECT 
  'pokemon_cache' as table_name, COUNT(*) as local_count FROM pokemon_cache
UNION ALL
SELECT 'draft_pool', COUNT(*) FROM draft_pool
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'draft_sessions', COUNT(*) FROM draft_sessions;
```

**Compare with Production**:
- Use Supabase Dashboard
- Or run same query against production

**If Data Sync Needed**:
- See "Data Sync Options" section below

---

## 🔍 Verification Steps

### 1. Schema Verification

```bash
# Generate schema diff
supabase db diff > schema-diff.txt

# Should be empty if aligned
cat schema-diff.txt
```

**Expected**: Empty file or only expected differences

---

### 2. Migration Verification

```bash
# List all migrations
supabase migration list

# Check for:
# - All migrations marked as "Applied" locally
# - All migrations match production
# - No missing migrations
```

**Expected**: All migrations show as "Applied" on both local and remote

---

### 3. Table Structure Verification

```sql
-- Compare table counts
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public') as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Compare**: Local vs Production (should match)

---

### 4. Critical Tables Check

```sql
-- Verify critical tables exist and have correct structure
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'draft_pool',
    'draft_sessions',
    'teams',
    'pokemon_cache',
    'team_rosters',
    'matches'
  )
ORDER BY table_name, ordinal_position;
```

---

## 📊 Data Sync Options

### Option 1: Pull Data from Production (Recommended)

**If production has the correct data**:

```bash
# Dump production data
supabase db dump --linked --data-only -f production-data.sql

# Restore to local
supabase db reset  # This applies migrations
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f production-data.sql
```

---

### Option 2: Use Sync Scripts

**If local needs to rebuild data**:

```bash
# Pre-cache competitive Pokemon
pnpm exec tsx --env-file=.env.local scripts/pre-cache-competitive-pokemon.ts

# Full sync (if needed)
pnpm exec tsx --env-file=.env.local scripts/full-sync-pokemon.ts
```

---

### Option 3: Selective Table Sync

**For specific tables only**:

```bash
# Dump specific table from production
supabase db dump --linked --data-only --table draft_pool -f draft-pool-data.sql

# Restore to local
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f draft-pool-data.sql
```

---

## 🚨 Conflict Resolution

### Scenario 1: Migration History Mismatch

**Symptoms**:
- `supabase migration list` shows different statuses
- Remote has migrations local doesn't have
- Local has migrations remote doesn't have

**Solution**:
```bash
# 1. Pull to get remote migrations
supabase db pull

# 2. Repair migration history if needed
supabase migration repair --status applied <migration_version>

# 3. Verify alignment
supabase migration list
```

---

### Scenario 2: Schema Drift

**Symptoms**:
- `supabase db diff` shows differences
- Tables exist in one but not the other
- Column types differ

**Solution**:
```bash
# 1. Pull schema changes
supabase db pull

# 2. Review generated migration file
# File will be in: supabase/migrations/YYYYMMDDHHMMSS_remote_schema.sql

# 3. Apply locally
supabase db reset  # Or migrations auto-apply

# 4. Verify
supabase db diff
```

---

### Scenario 3: Data Conflicts

**Symptoms**:
- Same tables have different row counts
- Data inconsistencies

**Solution**:
1. **Decide source of truth** (usually production)
2. **Backup local data** (if needed):
   ```bash
   supabase db dump --local --data-only -f local-backup.sql
   ```
3. **Pull production data**:
   ```bash
   supabase db dump --linked --data-only -f production-data.sql
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f production-data.sql
   ```

---

## 🔄 Complete Sync Workflow

### When You Return

**Run This Script** (`scripts/sync-from-production.sh`):

```bash
#!/bin/bash
set -e

echo "🔄 Syncing Database from Production..."
echo ""

# Step 1: Check status
echo "📊 Step 1: Checking current status..."
supabase status
echo ""

# Step 2: Pull schema
echo "📥 Step 2: Pulling schema from production..."
supabase db pull
echo ""

# Step 3: Verify migrations
echo "✅ Step 3: Verifying migrations..."
supabase migration list
echo ""

# Step 4: Check for differences
echo "🔍 Step 4: Checking for schema differences..."
supabase db diff > schema-diff.txt
if [ -s schema-diff.txt ]; then
  echo "⚠️  Schema differences found:"
  cat schema-diff.txt
else
  echo "✅ No schema differences!"
fi
echo ""

# Step 5: Summary
echo "📋 Sync Summary:"
echo "  - Schema: Pulled from production"
echo "  - Migrations: Synced"
echo "  - Status: Ready for verification"
echo ""
echo "✅ Sync complete! Review schema-diff.txt for any differences."
```

---

## 📝 PowerShell Sync Script

**File**: `scripts/sync-from-production.ps1`

```powershell
# Sync Database from Production
Write-Host "🔄 Syncing Database from Production..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check status
Write-Host "📊 Step 1: Checking current status..." -ForegroundColor Yellow
supabase status
Write-Host ""

# Step 2: Pull schema
Write-Host "📥 Step 2: Pulling schema from production..." -ForegroundColor Yellow
supabase db pull
Write-Host ""

# Step 3: Verify migrations
Write-Host "✅ Step 3: Verifying migrations..." -ForegroundColor Yellow
supabase migration list
Write-Host ""

# Step 4: Check for differences
Write-Host "🔍 Step 4: Checking for schema differences..." -ForegroundColor Yellow
supabase db diff | Out-File -FilePath "schema-diff.txt" -Encoding utf8
$diffContent = Get-Content "schema-diff.txt" -Raw
if ($diffContent.Trim()) {
    Write-Host "⚠️  Schema differences found:" -ForegroundColor Yellow
    Write-Host $diffContent
} else {
    Write-Host "✅ No schema differences!" -ForegroundColor Green
}
Write-Host ""

# Step 5: Summary
Write-Host "📋 Sync Summary:" -ForegroundColor Cyan
Write-Host "  - Schema: Pulled from production" -ForegroundColor Gray
Write-Host "  - Migrations: Synced" -ForegroundColor Gray
Write-Host "  - Status: Ready for verification" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Sync complete! Review schema-diff.txt for any differences." -ForegroundColor Green
```

---

## ✅ Post-Sync Verification Checklist

After running sync:

- [ ] **Schema**: `supabase db diff` shows no differences
- [ ] **Migrations**: All migrations show as "Applied" on both
- [ ] **Tables**: All expected tables exist
- [ ] **Columns**: Critical columns exist with correct types
- [ ] **Indexes**: Important indexes are present
- [ ] **Functions**: Database functions are synced
- [ ] **RLS Policies**: Row Level Security policies match
- [ ] **Data** (if synced): Row counts match expectations

---

## 🔧 Troubleshooting

### Issue: "Remote database's migration history does not match"

**Solution**:
```bash
# Repair migration history
supabase migration repair --status applied <migration_version>

# Then pull again
supabase db pull
```

---

### Issue: "Cannot connect to remote database"

**Solution**:
```bash
# Re-link project
supabase link --project-ref chmrszrwlfeqovwxyrmt

# Verify connection
supabase db remote commit
```

---

### Issue: "Migration file conflicts"

**Solution**:
1. Review conflicting migrations
2. Merge changes manually
3. Or accept production version:
   ```bash
   # Remove local conflicting migration
   rm supabase/migrations/conflicting-migration.sql
   
   # Pull again
   supabase db pull
   ```

---

## 📚 Quick Reference Commands

| Command | Purpose |
|---------|---------|
| `supabase status` | Check local Supabase status |
| `supabase projects list` | List linked projects |
| `supabase db pull` | Pull schema from production |
| `supabase db push` | Push migrations to production |
| `supabase db diff` | Compare local vs remote schema |
| `supabase migration list` | List migration status |
| `supabase migration repair` | Fix migration history |
| `supabase db reset` | Reset local database |
| `supabase db dump --linked` | Dump production data |

---

## 🎯 Summary

### When You Return:

1. **Run sync script**: `./scripts/sync-from-production.ps1`
2. **Review differences**: Check `schema-diff.txt`
3. **Verify alignment**: Run verification checklist
4. **Handle conflicts**: Use conflict resolution steps
5. **Confirm sync**: All checks pass ✅

### Expected Outcome:

- ✅ Schema matches production exactly
- ✅ All migrations applied
- ✅ No drift or conflicts
- ✅ Ready for development

---

**Document Created**: January 17, 2026  
**Last Updated**: January 17, 2026  
**Status**: ✅ **READY FOR USE**
