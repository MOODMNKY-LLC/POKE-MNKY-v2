# Supabase Startup EOF Error - Deep Research Findings

**Date**: January 19, 2026  
**Error**: `failed to connect to postgres: failed to connect to 'host=127.0.0.1 user=postgres database=postgres': failed to receive message (unexpected EOF)`

---

## 🔍 Critical Discovery: PostgreSQL 15.8.1.094 is Broken

### GitHub Issue #3632: Known Bug

**Source**: https://github.com/supabase/cli/issues/3632

**Key Finding**: PostgreSQL image version **15.8.1.094** has a **known bug** that prevents it from starting on local development.

**Symptoms**:
- Database container fails to start
- EOF errors during connection attempts
- Works fine with version 15.8.1.085

**Workaround**:
```bash
# Remove the postgres-version file to revert to default version
rm supabase/.temp/postgres-version
# Or on Windows:
Remove-Item supabase\.temp\postgres-version
```

**Status**: Issue closed, but the bug persists in version 15.8.1.094

---

## 🎯 Solution 1: Remove postgres-version File (Recommended)

### Why This Works

When Supabase links to a remote project, it creates `.temp/postgres-version` file that forces a specific PostgreSQL version. If that version is broken (like 15.8.1.094), removing the file allows Supabase to use the default stable version.

### Steps

```bash
# 1. Stop Supabase
supabase stop

# 2. Remove postgres-version file (if it exists)
# Windows PowerShell:
Remove-Item supabase\.temp\postgres-version -ErrorAction SilentlyContinue

# Linux/Mac:
rm supabase/.temp/postgres-version

# 3. Verify config.toml has major_version = 15
# (Already done)

# 4. Start fresh
supabase start
```

---

## 🎯 Solution 2: Use --ignore-health-check Flag

### Source: Stack Overflow

**Source**: https://stackoverflow.com/questions/75710971/supabase-start-on-windows-failing

**When to Use**: When health checks are timing out due to resource constraints or slow initialization.

**Command**:
```bash
supabase start --ignore-health-check
```

**Note**: This bypasses health checks but doesn't fix underlying issues. Use as a temporary workaround.

---

## 🎯 Solution 3: Check for Resource Constraints

### Common Causes

1. **Insufficient RAM**: PostgreSQL initialization requires significant memory
2. **Slow disk I/O**: Windows Docker Desktop can be slower than native Docker
3. **CPU throttling**: Background processes competing for resources

### Diagnostic Steps

```bash
# Check Docker resource allocation
# Docker Desktop → Settings → Resources

# Check available disk space
docker system df

# Check running containers
docker ps -a

# Monitor resource usage during startup
# Task Manager → Performance tab
```

---

## 🎯 Solution 4: Force PostgreSQL 15.8.1.085 (Working Version)

### Steps

1. **Stop Supabase**:
   ```bash
   supabase stop
   ```

2. **Remove postgres-version file** (if exists):
   ```bash
   Remove-Item supabase\.temp\postgres-version -ErrorAction SilentlyContinue
   ```

3. **Create postgres-version file with working version**:
   ```bash
   # Create directory if it doesn't exist
   New-Item -ItemType Directory -Force -Path supabase\.temp
   
   # Write working version
   "15.8.1.085" | Out-File -FilePath supabase\.temp\postgres-version -Encoding utf8
   ```

4. **Pull the working image**:
   ```bash
   docker pull public.ecr.aws/supabase/postgres:15.8.1.085
   ```

5. **Start Supabase**:
   ```bash
   supabase start
   ```

---

## 🎯 Solution 5: Complete Clean Reset

### When to Use

- When all else fails
- After major version changes
- When Docker volumes are corrupted

### Steps

```bash
# 1. Stop Supabase
supabase stop --no-backup

# 2. Remove all Supabase containers
docker ps -a --filter name=supabase --format "{{.ID}}" | ForEach-Object { docker rm -f $_ }

# 3. Remove all Supabase volumes
docker volume ls --format "{{.Name}}" | Where-Object { $_ -like "*supabase*" } | ForEach-Object { docker volume rm $_ }

# 4. Remove postgres-version file
Remove-Item supabase\.temp\postgres-version -ErrorAction SilentlyContinue

# 5. Clean Docker system (optional, removes unused resources)
docker system prune -f --volumes --filter "label=com.supabase.cli.project"

# 6. Verify config.toml
# Ensure major_version = 15

# 7. Start fresh
supabase start
```

---

## 🔍 Additional Findings

### Windows-Specific Issues

1. **Port Conflicts**: Windows may have port conflicts more frequently
   - Check: `netstat -ano | findstr :54322`
   - Solution: Change port in `config.toml` if needed

2. **Docker Desktop Performance**: WSL2 backend can be slower
   - Consider switching to Hyper-V backend (if available)
   - Or use native Linux/WSL2 for better performance

3. **Path Issues**: Windows path separators can cause issues
   - Ensure paths use forward slashes in config files
   - Or use PowerShell's path handling

### Known Problematic Versions

- **15.8.1.094**: Broken, doesn't start (GitHub #3632)
- **15.1.0.147**: Stuck at "Starting database from backup" (GitHub #1892)

### Stable Versions

- **15.8.1.085**: Known to work reliably
- **15.8.1.054**: Older but stable
- **Default version**: Usually stable (let CLI choose)

---

## 📋 Recommended Action Plan

### Step 1: Try Quick Fix (5 minutes)

```bash
# Remove postgres-version file
Remove-Item supabase\.temp\postgres-version -ErrorAction SilentlyContinue

# Start with health check bypass
supabase start --ignore-health-check
```

### Step 2: If Step 1 Fails (10 minutes)

```bash
# Complete clean reset
supabase stop --no-backup
Remove-Item supabase\.temp\postgres-version -ErrorAction SilentlyContinue
docker system prune -f --volumes --filter "label=com.supabase.cli.project"
supabase start
```

### Step 3: If Step 2 Fails (15 minutes)

```bash
# Force working version
supabase stop --no-backup
New-Item -ItemType Directory -Force -Path supabase\.temp
"15.8.1.085" | Out-File -FilePath supabase\.temp\postgres-version -Encoding utf8
docker pull public.ecr.aws/supabase/postgres:15.8.1.085
supabase start
```

### Step 4: If All Fail (Diagnostic)

1. Check Docker Desktop resources (Settings → Resources)
2. Check Windows Event Viewer for Docker errors
3. Check Docker Desktop logs
4. Try restarting Docker Desktop
5. Check for antivirus/firewall interference

---

## 🔗 Key References

1. **GitHub Issue #3632**: https://github.com/supabase/cli/issues/3632
   - PostgreSQL 15.8.1.094 broken
   - Workaround: Remove `.temp/postgres-version`

2. **GitHub Issue #1892**: https://github.com/supabase/cli/issues/1892
   - PostgreSQL 15.1.0.147 stuck at backup

3. **Stack Overflow**: https://stackoverflow.com/questions/75710971/supabase-start-on-windows-failing
   - `--ignore-health-check` flag solution
   - Resource constraint issues

4. **Supabase Docs**: https://supabase.com/docs/guides/local-development/cli/getting-started
   - Official troubleshooting guide
   - Version management

---

## ⚠️ Important Notes

### Version Management

- **`.temp/postgres-version`**: Forces specific PostgreSQL version
- **`config.toml`**: Sets major version (15, 16, 17)
- **Remote project link**: Can override local version

### Data Loss Warning

⚠️ **All cleanup operations will delete local data**. Make sure you:
- Have migrations backed up
- Don't have important local-only data
- Can re-seed data if needed

### When to Contact Support

If none of these solutions work:
1. Check Supabase Discord: https://discord.supabase.com
2. Create GitHub issue with:
   - CLI version: `supabase --version`
   - Docker version: `docker --version`
   - OS version: `systeminfo` (Windows)
   - Full debug output: `supabase start --debug`

---

**Last Updated**: January 19, 2026  
**Status**: 🔍 **RESEARCH COMPLETE** - Multiple solutions identified
