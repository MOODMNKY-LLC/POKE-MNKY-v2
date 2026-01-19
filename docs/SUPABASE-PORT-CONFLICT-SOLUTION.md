# Supabase Port Conflict Solution

**Date**: January 19, 2026  
**Issue**: Port 54322 (and other Supabase ports) already in use by process 52484

---

## 🔍 Problem Identified

Port **54322** (Supabase database port) is already LISTENING, preventing Supabase from starting.

**Process ID**: 52484  
**Ports Blocked**: 54320, 54321, 54322, 54323, 54324, 54327 (all Supabase ports)

---

## ✅ Solutions

### Solution 1: Restart Docker Desktop (Recommended)

Docker Desktop on Windows may be holding onto ports from a previous session.

1. **Close Docker Desktop completely**
2. **Restart Docker Desktop**
3. **Wait for Docker to fully start**
4. **Try starting Supabase again**:
   ```bash
   cd C:\DEV-MNKY\MOOD_MNKY\POKE-MNKY-v2
   supabase start
   ```

### Solution 2: Change Supabase Ports

If restarting Docker doesn't work, change the database port in `config.toml`:

```toml
[db]
port = 54330  # Change from 54322 to 54330
shadow_port = 54331  # Change from 54320 to 54331
```

Then update other services that depend on this port.

### Solution 3: Kill Process 52484 (Use with Caution)

⚠️ **Warning**: This might affect other Docker services.

```powershell
# Check what process 52484 is
Get-Process -Id 52484 -ErrorAction SilentlyContinue

# If it's safe to kill (e.g., orphaned Docker process):
Stop-Process -Id 52484 -Force
```

### Solution 4: Check for Other Supabase Instances

```bash
# Check all Docker containers
docker ps -a

# Check for Supabase containers in other projects
docker ps -a --filter "name=supabase"

# Stop all Supabase containers
docker ps -a --filter "name=supabase" --format "{{.ID}}" | ForEach-Object { docker stop $_ }
```

---

## 🔍 Diagnostic Commands

### Check Port Usage

```powershell
# Check what's using port 54322
netstat -ano | Select-String -Pattern ":54322"

# Check all Supabase ports
netstat -ano | Select-String -Pattern ":5432[0-9]"
```

### Check Docker Containers

```bash
# List all containers
docker ps -a

# Check for containers using Supabase ports
docker ps --filter "publish=54322"
docker ps --filter "publish=54321"
docker ps --filter "publish=54320"
```

### Check Docker Networks

```bash
# List all networks
docker network ls

# Inspect networks for port bindings
docker network inspect bridge
```

---

## 📋 Recommended Action Plan

1. **First**: Restart Docker Desktop
2. **If that fails**: Check for other Supabase instances (`docker ps -a`)
3. **If still failing**: Change port in `config.toml` to unused port
4. **Last resort**: Kill process 52484 (if safe)

---

**Last Updated**: January 19, 2026  
**Status**: 🔍 **PORT CONFLICT IDENTIFIED** - Restart Docker Desktop recommended
