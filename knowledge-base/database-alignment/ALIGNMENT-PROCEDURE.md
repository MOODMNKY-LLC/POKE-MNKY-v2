# Database Alignment Procedure

**Purpose**: Step-by-step procedure to align local and production databases

---

## Pre-Alignment Checklist

- [ ] Backup production database
- [ ] Verify Supabase CLI is installed and linked
- [ ] Review current migration status
- [ ] Understand what changes exist in each environment

---

## Step 1: Assess Current State

```bash
# Check migration status
supabase migration list --linked

# Check for schema differences
supabase db diff --linked

# Verify production tables exist
# (Check via Supabase Dashboard or SQL query)
```

---

## Step 2: Choose Alignment Strategy

### Strategy A: Production is Source of Truth
- Use when production has manual changes
- Pull production schema locally
- Generate migrations from differences

### Strategy B: Local is Source of Truth  
- Use when local has new migrations
- Push local migrations to production
- Verify application success

### Strategy C: Repair History
- Use when migration history is inconsistent
- Repair migration tracking table
- Ensure local and remote match

---

## Step 3: Execute Alignment

### For Strategy A (Pull Production):
```bash
# Pull production schema
supabase db pull --schema public

# Review generated migration
# Test locally
supabase db reset

# Commit migration
git add supabase/migrations/
git commit -m "Sync production schema"
```

### For Strategy B (Push Local):
```bash
# Preview changes
supabase db push --dry-run

# Apply migrations
supabase db push

# Verify application
supabase migration list --linked
```

### For Strategy C (Repair History):
```bash
# Repair specific migrations
supabase migration repair --status reverted <migration_id>

# Or mark as applied
supabase migration repair --status applied <migration_id>

# Verify repair
supabase migration list --linked
```

---

## Step 4: Verify Alignment

```bash
# Check migration lists match
supabase migration list --linked

# Verify schemas match
supabase db diff --linked

# Test locally
supabase db reset
```

---

## Post-Alignment

- [ ] Document alignment actions taken
- [ ] Update team on alignment status
- [ ] Establish processes to prevent future drift
- [ ] Schedule regular alignment checks

---

**Related**: See `workflows/03-alignment-strategies.md` for detailed strategies
