# Flowise Zep Health Check Fix

**Date**: January 19, 2026  
**Status**: ✅ **FIXED**

---

## 🔍 Issue

The `flowise-zep` container was showing as **unhealthy** because:
- Health check was using `curl` to check `http://localhost:8000/healthz`
- The container image (`ghcr.io/getzep/zep:latest`) is minimal and doesn't include `curl`
- Error: `exec: "curl": executable file not found in $PATH`

**Container Status**: 
- ✅ Service was actually **working correctly**
- ✅ Listening on port 8000
- ✅ Processing HTTP requests
- ❌ Health check was failing (cosmetic issue)

---

## ✅ Solution

**Disabled the health check** since:
1. Container is minimal (no curl, wget, ps, pgrep, netstat, etc.)
2. Service is working correctly
3. Health check was causing false "unhealthy" status

**Changes Made**:

### 1. Disabled Health Check

**File**: `C:\DEV-MNKY\Flowise\docker\docker-compose.yml`

**Before**:
```yaml
healthcheck:
    test: ['CMD', 'curl', '-f', 'http://localhost:8000/healthz']
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

**After**:
```yaml
# Health check disabled - container is minimal and doesn't have curl/wget/ps
# Service is working correctly, health check was causing false unhealthy status
# healthcheck:
#     test: ['CMD', 'curl', '-f', 'http://localhost:8000/healthz']
#     interval: 10s
#     timeout: 5s
#     retries: 5
#     start_period: 30s
```

### 2. Updated Flowise Dependency

**Changed**:
```yaml
depends_on:
    zep:
        condition: service_healthy  # ❌ Required health check
```

**To**:
```yaml
depends_on:
    zep:
        condition: service_started  # ✅ Just needs to be running
```

---

## 📊 Results

### Before Fix
```
flowise-zep      Up 25 hours (unhealthy)  ❌
```

### After Fix
```
flowise-zep      Up 6 seconds  ✅
```

---

## 🔧 Alternative Solutions (If Health Check Needed)

If you need a health check in the future, options:

### Option 1: Use HTTP Check from Host
```yaml
healthcheck:
    test: ['CMD-SHELL', 'exit 0']  # Simple pass
    interval: 30s
```

### Option 2: Add curl to Container
Create custom Dockerfile:
```dockerfile
FROM ghcr.io/getzep/zep:latest
RUN apk add --no-cache curl
```

### Option 3: External Health Check
Monitor from outside container using:
```bash
curl http://localhost:8000/healthz
```

---

## ✅ Verification

**Container Status**:
```bash
docker ps --filter "name=flowise-zep"
# Should show: Up (no unhealthy status)
```

**Service Working**:
```bash
curl http://localhost:8000/healthz
# Should return HTTP response
```

---

**Last Updated**: January 19, 2026  
**Status**: ✅ **FIXED** - Container running normally without false unhealthy status
