# Migration Repair Guide - 2026-01-19

**Issue**: Migration history mismatch between local files and remote database  
**Impact**: Blocks `supabase db pull --linked` (needed for App Agent workflow)  
**Solution**: Repair migration history safely

---

## Understanding the Problem

### What Causes Migration Mismatches?

1. **Migrations applied directly to production** (via Supabase Dashboard or MCP)
   - Migration exists in remote history
   - No corresponding local file exists

2. **Local migrations not pushed**
   - Migration file exists locally
   - Not marked as applied in remote

3. **Migration order/timestamp issues**
   - Migrations applied out of order
   - Timestamps don't match

### Why It Matters

- **Blocks `supabase db pull`**: Can't sync schema from production
- **Blocks `supabase db push`**: Can't apply new migrations
- **App Agent Impact**: Can't pull production DB to work with seeded data

---

## Safe Repair Strategy

### Step 1: Identify the Mismatch

```bash
# See what Supabase thinks is wrong
supabase db pull --linked 2>&1 | grep -A 20 "migration"

# List all migrations (local vs remote)
supabase migration list --linked
```

**Look for**:
- Migrations with empty "Local" column (exist in remote, not local)
- Migrations with empty "Remote" column (exist locally, not in remote)

### Step 2: Repair Missing Local Files

**If remote has migrations that don't exist locally:**

```bash
# Option A: Create stub files (if schema already matches)
# Extract missing versions from error message
supabase db pull --linked 2>&1 | grep "supabase migration repair" | \
  sed 's/.*reverted //' | sort -u > /tmp/missing_versions.txt

# Create stub migration files
while read version; do
  filename="supabase/migrations/${version}_synced_from_production.sql"
  cat > "$filename" << 'EOF'
-- Migration synced from production
-- This migration was applied directly to production
-- Date: 2026-01-19

-- No-op migration to maintain migration history consistency
-- The actual schema changes are already in production
SELECT 1;
EOF
done < /tmp/missing_versions.txt
```

**Option B: Mark as reverted (if consolidated in baseline)**

```bash
# If migrations are consolidated in baseline_schema.sql
supabase migration repair --status reverted <version> --linked
```

### Step 3: Mark Local Migrations as Applied

**If local has migrations not marked as applied in remote:**

```bash
# Mark each migration as applied
supabase migration repair --status applied <version> --linked
```

### Step 4: Verify Repair

```bash
# Check migration list (should show all matching)
supabase migration list --linked

# Try pulling (should work now)
supabase db pull --linked
```

---

## Impact on App Agent Workflow

### ✅ After Repair: App Agent Can Work Normally

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

3. **Push Changes**:
   ```bash
   supabase db push --linked
   ```
   - ✅ New migrations apply normally
   - ✅ No conflicts

### ⚠️ Before Repair: App Agent Blocked

- ❌ Can't pull production DB
- ❌ Can't sync schema
- ❌ Can't work with seeded data

---

## Safe Repair Checklist

Before repairing, verify:

- [ ] **Schema matches**: Production schema = what migrations create
- [ ] **Data safe**: Repair doesn't touch data (metadata-only)
- [ ] **Backup available**: Can restore if needed
- [ ] **Understand impact**: Know which migrations are missing/extra

### What Repair Does (Safe ✅)

- **`--status reverted`**: Deletes record from `supabase_migrations.schema_migrations`
  - ✅ Does NOT revert schema changes
  - ✅ Does NOT drop tables
  - ✅ Does NOT affect data
  - ✅ Only updates metadata

- **`--status applied`**: Inserts record into history table
  - ✅ Does NOT execute SQL
  - ✅ Does NOT create schema objects
  - ✅ Only updates metadata

**Conclusion**: Repair is **metadata-only** and **safe** ✅

---

## Quick Repair Commands

### If Remote Has Extra Migrations (Not in Local)

```bash
# Create stub files for missing migrations
# (See Step 2 above for script)
```

### If Local Has Migrations (Not in Remote)

```bash
# Mark as applied (if schema already matches)
supabase migration repair --status applied <version> --linked
```

### If Migrations Are Out of Order

```bash
# Usually safe to ignore if schema matches
# Or create stub files to match remote order
```

---

## Example Repair Session

```bash
# 1. Check current status
supabase migration list --linked | grep -E "^\s+[0-9]"

# 2. See what's missing
supabase db pull --linked 2>&1 | grep "migration repair"

# 3. Create stub files for missing migrations
# (Use script from Step 2)

# 4. Mark local migrations as applied (if needed)
supabase migration repair --status applied 20260119113545 --linked
supabase migration repair --status applied 20260119114000 --linked
# ... etc

# 5. Verify
supabase migration list --linked
supabase db pull --linked  # Should work now
```

---

## After Repair: App Agent Instructions

Once repair is complete, App Agent should:

1. **Pull Production DB**:
   ```bash
   supabase db pull --linked
   ```

2. **Verify Seeded Data**:
   ```sql
   SELECT COUNT(*) FROM teams WHERE season_id = (SELECT id FROM seasons WHERE is_current = true);
   -- Expected: 20
   
   SELECT COUNT(*) FROM draft_pool WHERE status = 'available';
   -- Expected: 778
   ```

3. **Start Building**:
   - Use `AAB-DRAFT-DB-SCHEMA.md` for reference
   - All tables are seeded and ready
   - Can test draft flow end-to-end

---

## Troubleshooting

### Error: "Migration history doesn't match"

**Solution**: Follow repair steps above

### Error: "Cannot repair: migration file doesn't exist"

**Solution**: Create stub file first, then repair

### Error: "Schema mismatch after repair"

**Solution**: 
1. Verify production schema matches migrations
2. May need to create actual migration files (not stubs)
3. Or mark as reverted if consolidated in baseline

---

**Last Updated**: 2026-01-19  
**Status**: Ready for repair - Follow steps above
