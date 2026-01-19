# Supabase Version Downgrade - PostgreSQL 17 → 15

**Date**: January 18, 2026  
**Status**: ✅ **COMPLETED**  
**Change**: Downgraded PostgreSQL major version from 17 to 15

---

## 🔍 Issue

Local Supabase development was broken after updating to PostgreSQL 17. PostgreSQL 17 is very new and may not be fully supported by the Supabase CLI or have compatibility issues.

---

## ✅ Solution

**Changed**: `supabase/config.toml`
- **Before**: `major_version = 17`
- **After**: `major_version = 15` (default/stable version)

---

## 🔄 Next Steps

### 1. Reset Local Database

After changing the version, you'll need to reset your local database:

```bash
# Stop Supabase
supabase stop

# Reset local database (this will recreate it with PostgreSQL 15)
supabase db reset

# Start Supabase
supabase start
```

### 2. Re-apply Migrations

After reset, migrations will be automatically applied, but verify:

```bash
# Check migration status
supabase migration list

# If needed, apply migrations manually
supabase migration up
```

### 3. Verify Connection

```bash
# Check Supabase status
supabase status

# Verify database version
supabase db remote commit
```

---

## ⚠️ Important Notes

### Version Compatibility

- **PostgreSQL 15**: Default/stable version for Supabase local development
- **PostgreSQL 17**: Very new, may have compatibility issues
- **Remote Database**: Check your production database version with `SHOW server_version;`

### If Remote Uses PostgreSQL 17

If your production database is actually using PostgreSQL 17, you have two options:

1. **Keep local at 15** (recommended for now):
   - Local development uses PostgreSQL 15
   - Production uses PostgreSQL 17
   - Most features work the same
   - Some edge cases might differ

2. **Upgrade remote to match** (not recommended):
   - Wait for better Supabase CLI support for PostgreSQL 17
   - Or manually manage version differences

### Data Loss Warning

⚠️ **Resetting the local database will delete all local data**. This is expected for local development, but make sure you don't have any important local-only data you need to keep.

---

## 📋 Verification Checklist

After downgrade:

- [ ] Supabase starts successfully (`supabase start`)
- [ ] Database version is 15 (`supabase status`)
- [ ] Migrations applied (`supabase migration list`)
- [ ] Local app connects to database
- [ ] No errors in Supabase logs

---

## 🔧 Troubleshooting

### If Supabase Won't Start

```bash
# Clean restart
supabase stop
supabase db reset
supabase start
```

### If Migrations Fail

```bash
# Check migration status
supabase migration list

# Apply migrations manually
supabase migration up

# If still failing, check migration files for PostgreSQL 17-specific syntax
```

### If Version Mismatch Errors

If you see version mismatch errors, verify:
1. Local version: `supabase status` (should show PostgreSQL 15)
2. Remote version: Check Supabase Dashboard → Settings → Database

---

**Last Updated**: January 18, 2026  
**Status**: ✅ **VERSION DOWNGRADED** - Ready for Local Development
