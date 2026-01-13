# ⚠️ Action Required

## 🔴 Issue #1: Spreadsheet Permissions (CRITICAL)

### Problem
**Error**: `403 The caller does not have permission`

**Cause**: The service account doesn't have access to the NEW spreadsheet yet.

### ✅ Solution

**Your Service Account Email**:
\`\`\`
poke-mnky-service@mood-mnky.iam.gserviceaccount.com
\`\`\`

**Steps**:

1. Open the spreadsheet:
   - https://docs.google.com/spreadsheets/d/1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ/edit

2. Click **"Share"** button (top right)

3. Add service account:
   - Paste: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
   - Permission: **Viewer** (recommended) or **Editor** (also works)
   - Uncheck "Notify people"
   - Click **Share**

4. Wait 10-30 seconds

5. Test:
   \`\`\`bash
   npx tsx scripts/test-scopes-direct.ts
   \`\`\`

### ✅ Answer: Is Editor Access Good Enough?

**YES!** Editor access works perfectly fine. However:
- **Viewer is sufficient** (we only read data)
- **Editor also works** (more than needed, but harmless)
- Both will work the same for our read-only operations

---

## 🔴 Issue #2: Stuck Processes

### Problem
Multiple Node.js processes running with high CPU usage, causing system slowdown.

### ✅ Solution

**Option 1: Use the PowerShell Script** (Recommended):
\`\`\`powershell
cd C:\DEV-MNKY\MOOD_MNKY\POKE-MNKY-v2
powershell -ExecutionPolicy Bypass -File scripts\kill-high-cpu-processes.ps1
\`\`\`

**Option 2: Manual Kill**:
\`\`\`powershell
# Kill processes with CPU > 1000
Get-Process node | Where-Object {$_.CPU -gt 1000} | Stop-Process -Force

# Or kill specific processes
Stop-Process -Id 13756 -Force  # Very high CPU
Stop-Process -Id 91796 -Force  # High memory (1.9GB)
Stop-Process -Id 90816 -Force  # Suspicious
\`\`\`

**Option 3: Task Manager**:
1. Press `Ctrl + Shift + Esc`
2. Go to **Details** tab
3. Sort by **CPU**
4. Find high-CPU Node.js processes
5. Right-click → **End Task**

---

## ✅ After Fixing Both Issues

### 1. Verify Spreadsheet Access:
\`\`\`bash
npx tsx scripts/test-scopes-direct.ts
\`\`\`

Should show:
\`\`\`
✅ Success! Spreadsheet: "Average at Best Draft League"
\`\`\`

### 2. Check Processes:
\`\`\`powershell
Get-Process node | Measure-Object -Property CPU -Sum
\`\`\`

Should show low CPU usage.

### 3. Run Analysis (requires dev server):
\`\`\`bash
# Terminal 1: Start dev server
pnpm dev

# Terminal 2: Run analysis
npx tsx scripts/test-sheet-analysis.ts
\`\`\`

---

## 📋 Summary

| Issue | Status | Action |
|-------|--------|--------|
| **Spreadsheet Access** | ❌ **Not shared** | Share with service account email |
| **Permissions** | ✅ **Editor is fine** | Viewer recommended, Editor works |
| **Stuck Processes** | ⚠️ **High CPU** | Kill high-CPU processes |

---

## 🚀 Next Steps

1. ✅ **Share spreadsheet** with `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
2. ✅ **Kill stuck processes** using the PowerShell script
3. ✅ **Test access** with `test-scopes-direct.ts`
4. ✅ **Run analysis** after dev server starts

---

## 📝 Notes

- **Editor access is fine** - it works, but Viewer is sufficient
- **The loop issue** is likely stuck Node.js processes
- **After sharing**, wait a few seconds for permissions to propagate
- **Test scripts** should exit after completion (they have `process.exit()` calls)
