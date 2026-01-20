# Draft Pool Import Fix - Quick Solution

**Issue:** Import failed with `draft-pool-generated.json`  
**Root Cause:** Next.js dev server has stale Supabase schema cache  
**Fix:** Restart dev server

---

## ✅ Quick Fix (Most Likely Solution)

### Step 1: Restart Dev Server

1. **Stop the dev server:**
   - Press `Ctrl+C` in the terminal running `pnpm dev`
   - Wait for it to fully stop

2. **Clear Next.js cache (recommended):**
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

3. **Restart dev server:**
   ```bash
   pnpm dev
   ```

4. **Wait for server to fully start:**
   - Look for "Ready" message
   - Server should be running on `http://localhost:3000`

5. **Try import again:**
   - Navigate to `/admin`
   - Go to "Draft Pool Import & Sync"
   - Upload JSON file again
   - Click "Import to Staging"

---

## ✅ Verification

**After restarting, the import should:**
- ✅ Upload file successfully
- ✅ Complete without schema errors
- ✅ Show results: 778 imported, 14 Tera banned, 0 errors

---

## Why This Fixes It

The Supabase client library caches the database schema. When we added the `is_tera_banned` column via migration, the running dev server still had the old schema cached. Restarting the server forces it to refresh the schema cache and recognize the new column.

---

## If It Still Fails

**Check browser console (F12) for specific error:**
- Look in **Console** tab
- Check **Network** tab for API response
- Share the exact error message for further troubleshooting

**Common errors:**
- Schema cache error → Restart server (should fix)
- Unauthorized → Check admin permissions
- Invalid JSON → File might be corrupted (re-save it)
- Network error → Check dev server is running

---

**Quick Fix Created:** 2026-01-20  
**Most Likely Solution:** Restart dev server  
**Column Status:** ✅ Exists in database  
**JSON Status:** ✅ Valid structure
