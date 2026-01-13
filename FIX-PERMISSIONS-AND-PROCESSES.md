# Fix Permissions and Stuck Processes

## 🔴 Current Issue

**Error**: `403 The caller does not have permission`

**Cause**: Service account doesn't have access to the NEW spreadsheet yet.

---

## ✅ Service Account Permissions

### Your Question: "Is Editor access good enough?"

**YES! Editor access is perfectly fine.** Here's why:

| Access Level | Works? | Recommended? | Notes |
|--------------|--------|--------------|-------|
| **Viewer** | ✅ Yes | ✅ **Best** | Sufficient for read-only operations |
| **Editor** | ✅ Yes | ⚠️ Works but unnecessary | More than needed, but harmless |
| **Commenter** | ❌ No | ❌ No | Insufficient permissions |

**Answer**: Editor access works fine! However, **Viewer is sufficient** since we only use read-only scopes.

---

## 🔧 Fix: Share Spreadsheet with Service Account

### Step 1: Get Service Account Email

Your service account email is:
\`\`\`
poke-mnky-service@mood-mnky.iam.gserviceaccount.com
\`\`\`

### Step 2: Share the Spreadsheet

1. **Open the Google Sheet**:
   - Go to: https://docs.google.com/spreadsheets/d/1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ/edit

2. **Click the "Share" button** (top right)

3. **Add Service Account**:
   - In the "Add people and groups" field, paste:
     \`\`\`
     poke-mnky-service@mood-mnky.iam.gserviceaccount.com
     \`\`\`

4. **Set Permission**:
   - Choose **"Viewer"** (recommended) or **"Editor"** (also works)
   - **Viewer is sufficient** for our read-only operations

5. **Uncheck "Notify people"** (optional - service accounts don't need notifications)

6. **Click "Share"**

### Step 3: Verify Access

After sharing, wait a few seconds, then test:

\`\`\`bash
npx tsx scripts/test-scopes-direct.ts 1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ
\`\`\`

You should see:
\`\`\`
✅ Success! Spreadsheet: "Average at Best Draft League"
\`\`\`

---

## 🐛 Fix: Stuck Processes

### Issue: Scripts Causing System Issues

**Symptoms**:
- High CPU usage
- Multiple Node.js processes running
- System slowdown

### Solution: Kill Stuck Processes

#### Option 1: Kill High-CPU Processes (Recommended)

\`\`\`powershell
# See high-CPU processes
Get-Process node | Where-Object {$_.CPU -gt 1000} | Format-Table Id, CPU, WorkingSet

# Kill specific process (replace <PID> with actual ID)
Stop-Process -Id <PID> -Force

# Kill all high-CPU processes
Get-Process node | Where-Object {$_.CPU -gt 1000} | Stop-Process -Force
\`\`\`

#### Option 2: Kill All Node Processes (⚠️ Will kill dev server)

\`\`\`powershell
# Kill ALL Node.js processes
Get-Process node | Stop-Process -Force

# Then restart dev server
pnpm dev
\`\`\`

#### Option 3: Use Task Manager

1. Press `Ctrl + Shift + Esc`
2. Go to **Details** tab
3. Sort by **CPU**
4. Find Node.js processes with high CPU
5. Right-click → **End Task**

### Identify What's Running

\`\`\`powershell
# See all Node.js processes
Get-Process node | Select-Object Id, ProcessName, CPU, @{Name='Memory(MB)';Expression={[math]::Round($_.WorkingSet/1MB,2)}} | Format-Table

# Check command lines (to see which scripts are running)
Get-WmiObject Win32_Process | Where-Object {$_.Name -eq "node.exe"} | Select-Object ProcessId, CommandLine | Format-List
\`\`\`

---

## 🔍 Debugging Steps

### 1. Check Service Account Access

**Current Status**: ❌ **No access** (403 error)

**Fix**: Share spreadsheet with service account (see above)

### 2. Check Running Processes

\`\`\`powershell
# Count Node.js processes
(Get-Process node).Count

# Should be: 1-3 (dev server + maybe 1-2 other scripts)
# If more than 5, you have stuck processes
\`\`\`

### 3. Check High-CPU Processes

\`\`\`powershell
# Processes using >1000 CPU time
Get-Process node | Where-Object {$_.CPU -gt 1000} | Format-Table Id, CPU, StartTime
\`\`\`

**Common culprits**:
- Process ID 13756 (very high CPU: 10914)
- Process ID 91796 (high memory: 1.9GB)
- Process ID 90816 (negative memory - suspicious)

### 4. Kill Stuck Processes

\`\`\`powershell
# Kill the high-CPU process
Stop-Process -Id 13756 -Force

# Kill high-memory process
Stop-Process -Id 91796 -Force

# Kill suspicious process
Stop-Process -Id 90816 -Force
\`\`\`

---

## ✅ Verification Checklist

After fixing permissions and processes:

- [ ] Spreadsheet shared with service account email
- [ ] Service account has at least Viewer access
- [ ] Test script runs successfully
- [ ] No stuck Node.js processes
- [ ] Dev server running (if needed)
- [ ] CPU usage normal

---

## 🚀 Next Steps

1. **Share the spreadsheet** (most important!)
   - Add: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
   - Set to: **Viewer** (or Editor)
   - Click Share

2. **Kill stuck processes**:
   \`\`\`powershell
   Get-Process node | Where-Object {$_.CPU -gt 1000} | Stop-Process -Force
   \`\`\`

3. **Test access**:
   \`\`\`bash
   npx tsx scripts/test-scopes-direct.ts 1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ
   \`\`\`

4. **Run analysis** (after dev server is running):
   \`\`\`bash
   # Terminal 1: Start dev server
   pnpm dev
   
   # Terminal 2: Run analysis
   npx tsx scripts/test-sheet-analysis.ts
   \`\`\`

---

## 📝 Summary

**Permission Issue**: ✅ **Editor access is fine** (Viewer is sufficient but Editor works)

**Action Needed**: Share the NEW spreadsheet with the service account email

**Process Issue**: Kill stuck Node.js processes with high CPU/memory usage

**After Fixing**: Test with `test-scopes-direct.ts` script
