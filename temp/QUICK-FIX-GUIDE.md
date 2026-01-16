# Quick Fix Guide

## 🔴 Current Issues

1. **403 Permission Error**: Service account doesn't have access to new spreadsheet
2. **Stuck Processes**: High CPU Node.js processes causing system issues

---

## ✅ Fix #1: Share Spreadsheet (CRITICAL)

### Your Service Account Email:
\`\`\`
poke-mnky-service@mood-mnky.iam.gserviceaccount.com
\`\`\`

### Steps:

1. **Open the spreadsheet**:
   - https://docs.google.com/spreadsheets/d/1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ/edit

2. **Click "Share"** (top right corner)

3. **Add the service account**:
   - Paste: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
   - Set permission to: **Viewer** (recommended) or **Editor** (also works)
   - Uncheck "Notify people"
   - Click **Share**

4. **Wait 10-30 seconds** for permissions to propagate

5. **Test**:
   \`\`\`bash
   npx tsx scripts/test-scopes-direct.ts
   \`\`\`

---

## ✅ Fix #2: Kill Stuck Processes

### Quick Kill (PowerShell):

\`\`\`powershell
# Kill processes with CPU > 1000
Get-Process node | Where-Object {$_.CPU -gt 1000} | Stop-Process -Force

# Or kill specific high-CPU processes
Stop-Process -Id 13756 -Force  # Very high CPU
Stop-Process -Id 91796 -Force  # High memory
Stop-Process -Id 90816 -Force  # Suspicious
\`\`\`

### Or Use Task Manager:

1. Press `Ctrl + Shift + Esc`
2. Go to **Details** tab
3. Sort by **CPU** (descending)
4. Find Node.js processes with high CPU
5. Right-click → **End Task**

---

## ✅ Fix #3: Restart Clean

\`\`\`powershell
# Kill all Node.js processes
Get-Process node | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Start dev server fresh
cd C:\DEV-MNKY\MOOD_MNKY\POKE-MNKY-v2
pnpm dev
\`\`\`

---

## 🧪 Test After Fixes

\`\`\`bash
# Test 1: Verify spreadsheet access
npx tsx scripts/test-scopes-direct.ts

# Test 2: Check processes
Get-Process node | Measure-Object -Property CPU -Sum

# Test 3: Run analysis (requires dev server)
# Terminal 1: pnpm dev
# Terminal 2: npx tsx scripts/test-sheet-analysis.ts
\`\`\`

---

## 📋 Summary

**Permission**: ✅ Editor access is fine (Viewer is sufficient)

**Action**: Share spreadsheet with `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`

**Processes**: Kill stuck Node.js processes with high CPU

**After**: Test with `test-scopes-direct.ts`
