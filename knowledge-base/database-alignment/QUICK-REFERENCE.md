# Quick Reference Guide

**Purpose**: Quick access to common commands and procedures for database alignment

---

## Essential Commands

### Local Development
```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Reset local database (applies all migrations)
supabase db reset

# Create new migration
supabase migration new <description>

# Apply pending migrations
supabase migration up

# Check migration status
supabase migration list
```

### Alignment Operations
```bash
# Pull production schema to local
supabase db pull --schema public

# Push local migrations to production
supabase db push

# Compare schemas (dry run)
supabase db push --dry-run

# Generate diff migration
supabase db diff -f <migration_name>
```

### Status and Verification
```bash
# Check local Supabase status
supabase status

# List applied migrations
supabase migration list

# Check remote migration status
supabase migration list --linked
```

---

## Common Workflows

### Daily Development
1. `supabase start` - Start local environment
2. `supabase db reset` - Reset to clean state
3. Create migrations as needed
4. Test locally
5. Commit migrations to git

### Before Production Deployment
1. `supabase db pull` - Pull any remote changes
2. `supabase db push --dry-run` - Preview changes
3. Review migrations
4. `supabase db push` - Apply to production

### Resolving Drift
1. `supabase db pull` - Capture remote schema
2. Review generated migration
3. Test migration locally
4. Commit and deploy

---

## Troubleshooting Quick Fixes

### Migration History Mismatch
```bash
# Repair migration history (use with caution)
supabase migration repair --status reverted <migration_id>
```

### Local Environment Issues
```bash
# Reset everything
supabase stop
supabase start
supabase db reset
```

### Schema Comparison
```bash
# Compare local vs remote
supabase db diff --linked
```

---

## File Locations

- Migrations: `supabase/migrations/`
- Config: `supabase/config.toml`
- Seeds: `supabase/seed.sql`
- Knowledge Base: `knowledge-base/database-alignment/`

---

**For detailed information**, see the comprehensive guides in this knowledge base.
