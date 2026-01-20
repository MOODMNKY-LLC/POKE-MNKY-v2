# Draft Pool Import Failure - Troubleshooting Guide

**Date:** 2026-01-20  
**Issue:** Import failed with `draft-pool-generated.json`  
**Status:** 🔧 **TROUBLESHOOTING**

---

## Issue Description

The draft pool import failed when trying to upload `draft-pool-generated.json` via the admin UI.

**Error Message:** (Likely related to schema cache or column not found)

---

## Root Cause Analysis

### ✅ JSON Structure Verified
- JSON file structure is **VALID** ✅
- All required fields present ✅
- Validation function passes ✅

**Verification:**
```bash
npx tsx -e "import { validateDraftPoolJSON } from './lib/draft-pool/import-service'; ..."
# Result: true ✅
```

### ⚠️ Likely Issue: Schema Cache

The error "Could not find the 'is_tera_banned' column" suggests:
- **Supabase client schema cache is stale**
- **Next.js dev server needs restart**
- **Column exists in database but client hasn't refreshed**

---

## Solution Steps

### Step 1: Restart Next.js Dev Server

**This is the most likely fix:**

1. **Stop the dev server** (Ctrl+C in the terminal running `npm run dev`)

2. **Clear Next.js cache** (optional but recommended):
   ```bash
   # Windows PowerShell
   Remove-Item -Recurse -Force .next
   
   # Or manually delete the .next folder
   ```

3. **Restart dev server**:
   ```bash
   pnpm dev
   ```

4. **Wait for server to fully start** (watch for "Ready" message)

5. **Try import again** via UI

### Step 2: Verify Column Exists

**Check database directly:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sheets_draft_pool' 
  AND column_name = 'is_tera_banned';
```

**Expected:** Should return the column definition

### Step 3: Test Import Service Directly

**Test via script (bypasses UI):**
```bash
npx tsx scripts/test-draft-pool-import.ts
```

**Expected:** Import should complete successfully

### Step 4: Check Browser Console

**If import still fails:**

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try import again
4. Look for error messages
5. Check **Network** tab for API response

**Common errors to look for:**
- Schema cache errors
- Authentication errors
- Validation errors
- Network errors

---

## Alternative: Test Import via API Directly

**If UI still doesn't work, test API directly:**

```bash
# Using curl or Postman
curl -X POST http://localhost:3000/api/admin/draft-pool/import \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-auth-cookie>" \
  -d @app-agent-handoff/data/draft-pool-generated.json
```

**Or use a test script:**
```bash
npx tsx scripts/test-draft-pool-import.ts
```

---

## Verification Checklist

### Before Retrying Import:

- [ ] Dev server restarted ✅
- [ ] `.next` cache cleared (optional)
- [ ] Column `is_tera_banned` exists in database ✅
- [ ] Admin user logged in ✅
- [ ] JSON file accessible ✅

### After Retrying Import:

- [ ] Import completes without errors
- [ ] Results show: 778 imported, 14 Tera banned
- [ ] Staging table populated correctly
- [ ] No schema cache errors

---

## Common Error Messages & Solutions

### Error: "Could not find the 'is_tera_banned' column"

**Solution:**
1. Restart dev server (clears schema cache)
2. Verify migration applied: `SELECT column_name FROM information_schema.columns WHERE table_name = 'sheets_draft_pool' AND column_name = 'is_tera_banned';`
3. If column doesn't exist, re-apply migration

### Error: "Invalid JSON structure"

**Solution:**
- JSON structure is valid (verified)
- Check if file was corrupted during upload
- Try re-saving the JSON file
- Verify file encoding (should be UTF-8)

### Error: "Unauthorized" or "Admin access required"

**Solution:**
- Verify user is logged in
- Check user has admin/commissioner role
- Verify RBAC system is configured
- Check `lib/rbac.ts` for role definitions

### Error: Network/Connection Error

**Solution:**
- Check dev server is running
- Verify API route is accessible
- Check browser console for CORS errors
- Verify environment variables are set

---

## Debugging Steps

### 1. Check API Route Logs

**Look for errors in:**
- Terminal running `npm run dev`
- Browser console (F12)
- Network tab (check API response)

### 2. Test Validation Function

```bash
pnpm tsx -e "
import { readFileSync } from 'fs';
import { validateDraftPoolJSON } from './lib/draft-pool/import-service';
const data = JSON.parse(readFileSync('app-agent-handoff/data/draft-pool-generated.json', 'utf8'));
console.log('Valid:', validateDraftPoolJSON(data));
"
```

**Expected:** `Valid: true`

### 3. Test Import Service Directly

```bash
npx tsx scripts/test-draft-pool-import.ts
```

**Expected:** Import completes successfully

### 4. Check Database State

```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sheets_draft_pool' AND column_name = 'is_tera_banned';

-- Check current staging data
SELECT COUNT(*) FROM sheets_draft_pool WHERE sheet_name = 'Draft Board';
```

---

## Quick Fix Checklist

**Try these in order:**

1. ✅ **Restart dev server** (most common fix)
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```

2. ✅ **Clear Next.js cache**
   ```bash
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

3. ✅ **Verify column exists**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'sheets_draft_pool' AND column_name = 'is_tera_banned';
   ```

4. ✅ **Test import via script**
   ```bash
   pnpm tsx scripts/test-draft-pool-import.ts
   ```

5. ✅ **Check browser console** for specific error messages

---

## Expected Behavior After Fix

**When import works correctly:**

1. File uploads successfully ✅
2. Import button enables ✅
3. Import completes (5-10 seconds) ✅
4. Results displayed:
   - Imported: 778
   - Tera Banned: 14
   - Errors: 0
5. Toast notification: "Import Successful" ✅
6. Staging Preview tab shows updated statistics ✅

---

## Next Steps

### If Import Still Fails:

1. **Check specific error message** in browser console
2. **Share error details** for further troubleshooting
3. **Test import service directly** via script
4. **Verify database connection** and permissions

### If Import Succeeds:

1. ✅ Proceed to Staging Preview tab
2. ✅ Verify statistics match
3. ✅ Test Sync tab (dry-run first)
4. ✅ Complete UI testing

---

## Status

**Current:** 🔧 Troubleshooting import failure  
**Next Action:** Restart dev server and retry import  
**Expected:** Import should work after server restart

---

**Troubleshooting Guide Created:** 2026-01-20  
**Most Likely Fix:** Restart dev server  
**Column Status:** ✅ Exists in database  
**JSON Status:** ✅ Valid structure
