# Dev Server Start Guide

**Issue**: Port 3000 in use or lock file preventing startup

---

## Quick Fix

### Step 1: Kill Process on Port 3000

```powershell
# Find and kill process on port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
  Select-Object -ExpandProperty OwningProcess -Unique | 
  ForEach-Object { Stop-Process -Id $_ -Force }
```

### Step 2: Remove Lock File

```powershell
# Remove Next.js lock file
Remove-Item .next\dev\lock -Force -ErrorAction SilentlyContinue
```

### Step 3: Start Dev Server

```bash
pnpm dev
```

---

## Alternative: Use Different Port

If you want to keep the existing server running:

```bash
# Start on port 3002
PORT=3002 pnpm dev
```

Or update `package.json` scripts to use a different port.

---

## Verify Port is Free

```powershell
# Check if port 3000 is in use
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

If no output, port is free.

---

**Status**: Ready to start dev server
