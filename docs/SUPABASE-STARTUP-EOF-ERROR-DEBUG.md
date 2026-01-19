# Supabase Startup EOF Error - Debug Analysis & Solutions

**Date**: January 19, 2026  
**Error**: `failed to connect to postgres: failed to connect to 'host=127.0.0.1 user=postgres database=postgres': failed to receive message (unexpected EOF)`

---

## 🔍 Root Cause Analysis

### Problem Identified

The error occurs because of a **PostgreSQL version mismatch** between:
1. **Docker volumes** containing PostgreSQL 15 data (from previous setup)
2. **config.toml** specifying PostgreSQL 17 (reset by `supabase init`)

When `supabase init` ran, it reset `config.toml` to default PostgreSQL 17, but Docker volumes still contain PostgreSQL 15 data. PostgreSQL 17 cannot read PostgreSQL 15 data directories, causing the connection to fail with "unexpected EOF".

### Why "unexpected EOF"?

The PostgreSQL container starts, but when it tries to read the old PostgreSQL 15 data directory, it fails initialization. The connection attempt happens during this unstable state, resulting in the connection being closed unexpectedly (EOF = End Of File, meaning the connection was terminated).

---

## 📊 Evidence

### Current State

1. **config.toml** shows:
   ```toml
   [db]
   major_version = 17  # ← Reset by supabase init
   port = 54322
   ```

2. **Previous State** (from `docs/SUPABASE-VERSION-DOWNGRADE.md`):
   - You previously downgraded from PostgreSQL 17 to 15
   - PostgreSQL 17 caused compatibility issues
   - You explicitly chose PostgreSQL 15 as stable

3. **Docker Volumes**:
   - Still contain PostgreSQL 15 data
   - Not automatically cleaned by `supabase init`
   - Incompatible with PostgreSQL 17

---

## ✅ Solution Options

### Option A: Upgrade to PostgreSQL 17 (Clean Reset)

**Pros**:
- Uses latest PostgreSQL version
- Matches current config.toml

**Cons**:
- PostgreSQL 17 is very new and may have compatibility issues
- You previously downgraded from 17 due to problems
- May break existing migrations or features

**Steps**:
```bash
# 1. Stop Supabase
supabase stop

# 2. List and remove all Supabase Docker volumes
docker volume ls | grep supabase
docker volume rm $(docker volume ls -q --filter label=com.supabase.cli.project)

# Alternative: Remove specific volumes
docker volume rm supabase_db_<project-name>
docker volume rm supabase_storage_<project-name>
# ... (remove all Supabase volumes)

# 3. Verify config.toml has PostgreSQL 17 (already set)
# major_version = 17

# 4. Start fresh
supabase start
```

---

### Option B: Downgrade to PostgreSQL 15 (Recommended) ⭐

**Pros**:
- Stable, well-tested version
- You've already used it successfully
- Avoids compatibility issues
- Matches your previous working setup

**Cons**:
- Not the latest version (but stable)

**Steps**:
```bash
# 1. Stop Supabase
supabase stop

# 2. List and remove all Supabase Docker volumes
docker volume ls | grep supabase
docker volume rm $(docker volume ls -q --filter label=com.supabase.cli.project)

# Alternative: Remove specific volumes manually
# Find volumes:
docker volume ls | grep supabase

# Remove them (replace <project-name> with your actual project name):
docker volume rm supabase_db_<project-name>
docker volume rm supabase_storage_<project-name>
docker volume rm supabase_auth_<project-name>
# ... (remove all Supabase volumes)

# 3. Update config.toml to PostgreSQL 15
# Change: major_version = 17 → major_version = 15

# 4. Start fresh
supabase start
```

---

## 🎯 Recommended Solution: Option B (PostgreSQL 15)

Based on your previous experience:
- ✅ You successfully used PostgreSQL 15
- ✅ You explicitly downgraded from 17 due to issues
- ✅ PostgreSQL 15 is stable and well-supported

**Recommended Action**: Downgrade to PostgreSQL 15 and clean reset volumes.

---

## 🔧 Detailed Fix Steps (Option B - Recommended)

### Step 1: Stop Supabase

```bash
supabase stop
```

### Step 2: Identify Supabase Volumes

```bash
# List all Docker volumes
docker volume ls

# Filter for Supabase volumes
docker volume ls | grep supabase

# Or find by label
docker volume ls -q --filter label=com.supabase.cli.project
```

### Step 3: Remove Supabase Volumes

**Option A: Remove all at once** (if you have only one Supabase project):
```bash
docker volume rm $(docker volume ls -q --filter label=com.supabase.cli.project)
```

**Option B: Remove individually** (safer, if you have multiple projects):
```bash
# Replace <project-name> with your actual project name
docker volume rm supabase_db_<project-name>
docker volume rm supabase_storage_<project-name>
docker volume rm supabase_auth_<project-name>
docker volume rm supabase_realtime_<project-name>
docker volume rm supabase_analytics_<project-name>
# ... (remove all Supabase-related volumes)
```

**To find your project name**:
```bash
# Check supabase/.temp/project-ref or look at volume names
docker volume ls | grep supabase
```

### Step 4: Update config.toml

Change PostgreSQL version back to 15:

```toml
[db]
port = 54322
shadow_port = 54320
major_version = 15  # ← Change from 17 to 15
```

### Step 5: Start Fresh

```bash
supabase start
```

This will:
- Pull fresh PostgreSQL 15 image
- Initialize new data directory
- Apply all migrations
- Start all services

---

## 🔍 Verification

After fixing, verify everything works:

```bash
# Check Supabase status
supabase status

# Verify database version (should show PostgreSQL 15)
# Check the output for database version

# Test connection
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT version();"
```

---

## 📋 Troubleshooting

### If volumes won't remove

```bash
# Check if containers are still running
docker ps -a | grep supabase

# Stop and remove containers first
docker stop $(docker ps -aq --filter name=supabase)
docker rm $(docker ps -aq --filter name=supabase)

# Then remove volumes
docker volume rm <volume-name>
```

### If still getting EOF error

```bash
# Full cleanup
supabase stop
docker system prune -a --volumes  # ⚠️ Removes ALL unused Docker resources

# Then restart
supabase start
```

### If migrations fail

```bash
# Check migration status
supabase migration list

# Reset database (applies migrations fresh)
supabase db reset
```

---

## 📚 Research Findings

Based on research of similar issues:

1. **Common Cause**: PostgreSQL version mismatch between data directory and running version
2. **Solution Pattern**: Stop → Remove volumes → Restart with correct version
3. **Prevention**: Always clean volumes when changing PostgreSQL major versions

**Key References**:
- GitHub issues show this exact error when upgrading PostgreSQL versions
- Supabase docs recommend cleaning volumes when changing database versions
- Docker volumes persist data across container restarts, so version changes require volume cleanup

---

## ⚠️ Important Notes

### Data Loss Warning

⚠️ **Removing Docker volumes will delete all local database data**. This is expected for local development, but:
- Make sure you don't have important local-only data
- Migrations will be re-applied automatically
- Seed data (if any) will be re-seeded

### Version Consistency

- **Local**: Should match your development needs (PostgreSQL 15 recommended)
- **Remote**: Check your production database version
- **Mismatch**: Local and remote can differ, but be aware of version-specific features

---

## 🎯 Next Steps

1. **Choose solution** (Option B recommended)
2. **Stop Supabase**: `supabase stop`
3. **Remove volumes**: Use commands above
4. **Update config.toml**: Set `major_version = 15`
5. **Start fresh**: `supabase start`
6. **Verify**: Check status and test connection

---

**Last Updated**: January 19, 2026  
**Status**: 🔍 **ANALYSIS COMPLETE** - Ready for Fix
