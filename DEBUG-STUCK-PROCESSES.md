# Debugging Stuck Processes

## 🔍 Issue: Scripts Causing System Issues

If scripts are crashing or causing performance issues, here's how to debug and fix:

---

## 🚨 Quick Fix: Kill Stuck Processes

### Option 1: Using PowerShell (Windows)

```powershell
# List all Node.js processes
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Format-Table Id, CPU, WorkingSet

# Kill specific high-CPU processes
Stop-Process -Id <PID> -Force

# Kill all Node.js processes (⚠️ Will kill dev server too!)
Get-Process node | Stop-Process -Force
```

### Option 2: Using Task Manager

1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Go to **Details** tab
3. Sort by **CPU** or **Memory**
4. Find Node.js processes with high usage
5. Right-click → **End Task**

### Option 3: Kill Specific Scripts

```powershell
# Kill processes running specific scripts
Get-Process node | Where-Object {$_.Path -like "*incremental-sync*"} | Stop-Process -Force
```

---

## 🔍 Identifying the Problem

### Check What's Running

```powershell
# See all Node.js processes
Get-Process node | Select-Object Id, ProcessName, CPU, WorkingSet, StartTime | Format-Table

# Check for specific scripts
Get-WmiObject Win32_Process | Where-Object {$_.CommandLine -like "*tsx*"} | Select-Object ProcessId, CommandLine
```

### Common Culprits

1. **`incremental-sync-pokemon.ts`** - Has `while(true)` loop
   - **Solution**: Only run when needed, ensure it has exit conditions

2. **Dev Server (`pnpm dev`)** - Should be running continuously
   - **Solution**: This is normal, but check if multiple instances are running

3. **Test Scripts** - Should exit after completion
   - **Solution**: Check if they're stuck in error loops

---

## 🛠️ Fixes Applied

### 1. Script Exit Conditions

All test scripts now have proper `process.exit()` calls:
- ✅ `test-sheet-analysis.ts` - Exits on success/failure
- ✅ `test-scopes-direct.ts` - Exits on success/failure  
- ✅ `test-parsers.ts` - Exits on success/failure

### 2. Long-Running Scripts

**`incremental-sync-pokemon.ts`** - Has `while(true)` loop
- ⚠️ **This script is designed to run continuously**
- Only run when you need continuous syncing
- Stop with `Ctrl+C` when done

---

## 🚀 Recommended Actions

### 1. Check Current Processes

```powershell
Get-Process node | Select-Object Id, CPU, WorkingSet | Sort-Object CPU -Descending | Select-Object -First 10
```

### 2. Kill High-CPU Processes

If you see processes with very high CPU (>1000):
```powershell
# Replace <PID> with the actual process ID
Stop-Process -Id <PID> -Force
```

### 3. Restart Dev Server Cleanly

```powershell
# Kill all node processes
Get-Process node | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Start dev server fresh
cd C:\DEV-MNKY\MOOD_MNKY\POKE-MNKY-v2
pnpm dev
```

---

## 📋 Process Management Best Practices

### 1. One Dev Server Instance

Only run **one** dev server at a time:
```bash
# Check if dev server is running
Get-Process node | Where-Object {$_.Path -like "*next*"}

# If multiple, kill extras
```

### 2. Test Scripts Should Exit

All test scripts should complete and exit:
- ✅ They have `process.exit()` calls
- ✅ They should finish in seconds/minutes
- ⚠️ If they run forever, something is wrong

### 3. Long-Running Scripts

Scripts like `incremental-sync-pokemon.ts`:
- ⚠️ Designed to run continuously
- ✅ Use `Ctrl+C` to stop
- ✅ Check exit conditions before running

---

## 🐛 Common Issues

### Issue: Multiple Dev Servers Running

**Symptoms**: High CPU, port conflicts

**Solution**:
```powershell
# Kill all node processes
Get-Process node | Stop-Process -Force

# Start fresh
pnpm dev
```

### Issue: Script Stuck in Loop

**Symptoms**: High CPU, script never exits

**Solution**:
1. Identify the script: `Get-WmiObject Win32_Process | Where-Object {$_.CommandLine -like "*tsx*"}`
2. Kill the process: `Stop-Process -Id <PID> -Force`
3. Check the script code for infinite loops

### Issue: Memory Leak

**Symptoms**: Continuously increasing memory usage

**Solution**:
1. Kill the process
2. Check for memory leaks in the code
3. Restart the process

---

## ✅ Verification

After cleaning up processes:

1. **Check process count**:
   ```powershell
   (Get-Process node).Count
   ```
   Should be low (1-3 for dev server)

2. **Check CPU usage**:
   ```powershell
   Get-Process node | Select-Object CPU | Measure-Object -Property CPU -Sum
   ```
   Should be low when idle

3. **Test scripts work**:
   ```bash
   npx tsx scripts/test-scopes-direct.ts
   ```
   Should complete and exit

---

## 📝 Summary

**Current Issue**: Multiple Node.js processes running, possibly stuck scripts

**Solution**:
1. ✅ Kill stuck processes (see commands above)
2. ✅ Verify only dev server is running
3. ✅ Test scripts exit properly
4. ✅ Service account permissions are fine (Editor works, Viewer recommended)

**Next Steps**:
1. Clean up processes
2. Verify service account has access (✅ Already confirmed)
3. Run analysis/parser tests
4. Monitor for stuck processes
