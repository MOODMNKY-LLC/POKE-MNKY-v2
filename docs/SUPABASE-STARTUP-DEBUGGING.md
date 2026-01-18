# Supabase Local Startup Debugging Guide

**Date**: January 18, 2026  
**Issue**: `supabase start` fails with "failed to receive message (unexpected EOF)"  
**Environment**: Windows, Docker Desktop, Supabase CLI 2.72.7  
**Status**: Investigating

---

## Problem Summary

Supabase CLI fails to start local development environment:
- Error: `failed to connect to postgres: failed to connect to 'host=127.0.0.1 user=postgres database=postgres': failed to receive message (unexpected EOF)`
- Pattern: "Starting database..." → "Stopping containers..." → Containers pruned → Connection error
- Manual PostgreSQL containers work fine (Docker is functional)

---

## Diagnostic Findings

### ✅ What Works
- Docker Desktop is running and functional
- Manual PostgreSQL containers start successfully
- Docker images are present locally
- Network connectivity is working

### ❌ What's Failing
- Supabase CLI container startup sequence
- Database container health check/timing
- Connection establishment before container is ready

### 🔍 Key Observations
1. **Port 54322**: Used by Cursor (PID 20976) - but Supabase should use this port
2. **Immediate Pruning**: Containers are pruned right after starting
3. **Race Condition**: CLI tries to connect before database is ready
4. **Windows-Specific**: Issue appears Windows/Docker Desktop specific

---

## Research Findings

### Known Issues

1. **Supabase CLI Windows Docker Networking**
   - Windows Docker Desktop can have networking delays
   - Health checks may timeout before containers are ready
   - WSL2 backend vs Hyper-V backend differences

2. **Container Startup Timing**
   - PostgreSQL takes 5-10 seconds to initialize
   - Supabase CLI may be connecting too early
   - Health check configuration may be too aggressive

3. **Port Conflicts**
   - Port 54322 is in use (Cursor)
   - May need to change port or kill conflicting process

---

## Solutions to Try

### Solution 1: Kill Process Using Port 54322

```powershell
# Find process using port 54322
netstat -ano | findstr ":54322" | findstr "LISTENING"

# Kill the process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force

# Try Supabase start again
supabase start
```

### Solution 2: Change Database Port

Edit `supabase/config.toml`:
```toml
[db]
port = 54323  # Change from 54322 to avoid conflict
```

Then restart:
```powershell
supabase start
```

### Solution 3: Increase Health Check Timeout

Set environment variable:
```powershell
$env:SUPABASE_DB_HEALTH_CHECK_TIMEOUT="120"
supabase start
```

### Solution 4: Use Docker Compose Directly

If Supabase CLI continues to fail, try generating docker-compose.yml manually:

```powershell
# Generate docker-compose.yml
supabase gen types typescript --local

# Start with docker-compose directly
cd supabase\.temp
docker-compose up -d
```

### Solution 5: Reset Supabase Configuration

```powershell
# Stop everything
supabase stop --no-backup

# Remove temp files
Remove-Item supabase\.temp -Recurse -Force -ErrorAction SilentlyContinue

# Remove volumes
docker volume ls --filter "name=POKE-MNKY-v2" --format "{{.Name}}" | ForEach-Object { docker volume rm $_ }

# Start fresh
supabase start
```

### Solution 6: Update Supabase CLI

```powershell
# Check current version
supabase --version

# Update if needed (using your package manager)
# For Scoop: scoop update supabase
# For Chocolatey: choco upgrade supabase
# For npm: npm update -g supabase
```

### Solution 7: Docker Desktop Configuration

Check Docker Desktop settings:
1. **Resources**: Ensure enough memory/CPU allocated
2. **WSL Integration**: If using WSL2, ensure integration is enabled
3. **Network**: Check if any network restrictions exist
4. **File Sharing**: Ensure project directory is shared

### Solution 8: Use Alternative Port Range

If port conflicts persist, change to a different port range in `config.toml`:
```toml
[db]
port = 54325  # Use higher port to avoid conflicts

[api]
port = 54326  # Also change API port if needed
```

---

## Debugging Commands

### Check Container Status
```powershell
docker ps -a --filter "name=POKE-MNKY-v2"
```

### Check Container Logs
```powershell
docker ps -a --filter "name=supabase_db" --format "{{.Names}}" | ForEach-Object { docker logs $_ --tail 50 }
```

### Monitor Docker Events
```powershell
docker events --filter "container=supabase" --since 30s
```

### Check Port Usage
```powershell
netstat -ano | findstr ":54322"
```

### Check Docker Networks
```powershell
docker network ls --filter "name=POKE-MNKY-v2"
```

---

## Next Steps

1. **Try Solution 1** (kill port conflict) - Most likely fix
2. **Try Solution 2** (change port) - If Solution 1 doesn't work
3. **Try Solution 5** (full reset) - If timing issues persist
4. **Check Docker Desktop** - Ensure proper configuration
5. **Update Supabase CLI** - May have bug fixes

---

## Related Issues

- Supabase CLI GitHub: https://github.com/supabase/cli/issues
- Docker Desktop Windows Issues: Check Docker Desktop logs
- PostgreSQL Docker Issues: Check PostgreSQL container logs

---

**Last Updated**: January 18, 2026  
**Status**: Ready for Testing
