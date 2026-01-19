# Supabase Reset Guide - Fixing PostgreSQL Version Mismatch

**Date**: January 19, 2026  
**Issue**: Containers still using PostgreSQL 17.6 after config change to 15  
**Status**: 🔧 **TROUBLESHOOTING**

---

## 🔍 Problem

After changing `major_version = 15` in `config.toml`, Supabase containers are still using PostgreSQL 17.6. This happens because Docker containers persist the old version.

---

## ✅ Solution: Complete Reset

### Step 1: Stop and Remove All Containers

```bash
# Stop Supabase
supabase stop

# Remove all containers (forces recreation)
supabase stop --no-backup
```

**Alternative (if above doesn't work)**:
```bash
# Stop Supabase
supabase stop

# Remove containers manually via Docker
docker ps -a | grep supabase
docker rm -f $(docker ps -a | grep supabase | awk '{print $1}')
```

### Step 2: Verify Config

Check that `supabase/config.toml` has:
```toml
major_version = 15
```

### Step 3: Start Fresh

```bash
# Start Supabase (will create new containers with PostgreSQL 15)
supabase start
```

---

## 🔧 If Still Having Issues

### Option 1: Complete Clean Reset

```bash
# Stop everything
supabase stop

# Remove all Supabase Docker resources
docker ps -a | grep supabase | awk '{print $1}' | xargs docker rm -f
docker volume ls | grep supabase | awk '{print $2}' | xargs docker volume rm

# Start fresh
supabase start
```

### Option 2: Check Docker Containers

```bash
# List all Supabase containers
docker ps -a | grep supabase

# Check PostgreSQL version in running container
docker exec supabase_db_POKE-MNKY-v2 psql -U postgres -c "SELECT version();"
```

### Option 3: Manual Container Removal

If containers are stuck:

```bash
# Find container names
docker ps -a --filter "name=supabase"

# Remove specific containers
docker rm -f supabase_db_POKE-MNKY-v2
docker rm -f supabase_rest_POKE-MNKY-v2
docker rm -f supabase_edge_runtime_POKE-MNKY-v2
docker rm -f supabase_studio_POKE-MNKY-v2
docker rm -f supabase_inbucket_POKE-MNKY-v2
docker rm -f supabase_kong_POKE-MNKY-v2
docker rm -f supabase_auth_POKE-MNKY-v2
docker rm -f supabase_storage_POKE-MNKY-v2
docker rm -f supabase_realtime_POKE-MNKY-v2
docker rm -f supabase_analytics_POKE-MNKY-v2

# Remove volumes (optional - will lose local data)
docker volume ls | grep supabase | awk '{print $2}' | xargs docker volume rm

# Start fresh
supabase start
```

---

## 📋 Verification

After reset, verify PostgreSQL version:

```bash
# Check status
supabase status

# Should show PostgreSQL 15.x (not 17.x)
# Check in logs or via:
docker exec supabase_db_POKE-MNKY-v2 psql -U postgres -c "SELECT version();"
```

---

## ⚠️ Important Notes

### Data Loss

- **Removing containers**: Loses local database data (expected for dev)
- **Removing volumes**: Loses all local data including migrations history
- **Migrations**: Your migration files are safe (they're in `supabase/migrations/`)

### After Reset

1. Migrations will be automatically reapplied
2. Seed data will be loaded (if configured)
3. You'll need to recreate any test data

---

## 🐛 Common Errors

### "EOF" Errors

This usually means containers are stopping unexpectedly. Try:
```bash
supabase stop
# Wait a few seconds
supabase start
```

### "Port already in use"

```bash
# Find what's using the port
netstat -ano | findstr :54321

# Stop Supabase
supabase stop

# Try again
supabase start
```

### "Container already exists"

```bash
# Force remove
docker rm -f <container_name>

# Or remove all Supabase containers
docker ps -a | grep supabase | awk '{print $1}' | xargs docker rm -f
```

---

**Last Updated**: January 19, 2026  
**Status**: 🔧 **TROUBLESHOOTING** - Use complete reset to fix version mismatch
