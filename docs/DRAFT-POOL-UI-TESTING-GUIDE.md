# Draft Pool Import/Sync System - UI Testing Guide

**Date:** 2026-01-20  
**Step:** Step 2 - UI Testing  
**Status:** ⏳ **READY FOR TESTING**

---

## Overview

This guide walks you through testing the Draft Pool Import & Sync system via the admin UI. Follow each step systematically and verify results at each stage.

**Estimated Time:** 15-20 minutes for complete testing

---

## Pre-Testing Checklist

Before starting UI testing, verify:

- [x] ✅ Migrations applied (verified via Step 1)
- [x] ✅ Validation script passed (20/20 tests)
- [x] ✅ Environment variables configured
- [x] ✅ Admin user logged in
- [x] ✅ JSON file ready (`app-agent-handoff/data/draft-pool-generated.json`)
- [ ] ⏳ Next.js dev server running (`pnpm dev`)
- [ ] ⏳ Admin page accessible (`http://localhost:3000/admin`)

---

## Step-by-Step Testing Guide

### Step 1: Access Admin Page

**Action:**
1. Open your browser
2. Navigate to `http://localhost:3000/admin`
3. Ensure you're logged in as an admin user

**Expected:**
- ✅ Admin dashboard loads
- ✅ "Draft Pool Import & Sync" section visible
- ✅ Three tabs visible: "Import", "Staging Preview", "Sync to Production"

**If Issues:**
- Check authentication: Ensure you're logged in
- Check RBAC: Verify user has admin/commissioner role
- Check console: Look for any JavaScript errors

---

### Step 2: Test Import Tab

#### 2.1: Verify Import Tab UI

**Action:**
1. Click on the **"Import"** tab
2. Observe the file upload area

**Expected:**
- ✅ File upload area visible
- ✅ Drag-drop zone displayed
- ✅ "Choose file" button visible
- ✅ Instructions text visible
- ✅ "Import to Staging" button visible (initially disabled)

**UI Elements to Verify:**
- File input field
- Drag-drop overlay
- Import button
- Loading states (will show during import)

#### 2.2: Test File Selection

**Action:**
1. Click "Choose file" button
2. Navigate to `app-agent-handoff/data/draft-pool-generated.json`
3. Select the file

**Expected:**
- ✅ File selected successfully
- ✅ File name displayed in UI
- ✅ "Import to Staging" button becomes enabled
- ✅ File size shown (if implemented)

**Alternative Method:**
- Drag and drop the JSON file onto the upload area
- Should work the same way

#### 2.3: Execute Import

**Action:**
1. Click "Import to Staging" button
2. Wait for import to complete
3. Observe loading state and results

**Expected:**
- ✅ Loading spinner/indicator appears
- ✅ Button becomes disabled during import
- ✅ Import completes (5-10 seconds for 778 Pokemon)
- ✅ Results displayed:
  - ✅ Imported: 778 Pokemon
  - ✅ Tera Banned: 14 Pokemon
  - ✅ Errors: 0
  - ✅ Warnings: 0 (or minimal)

**Results Display Should Show:**
```
✅ Import completed successfully!
📊 Statistics:
   • Imported: 778 Pokemon
   • Tera Banned: 14 Pokemon
   • Errors: 0
   • Warnings: 0
```

**If Errors Occur:**
- Check browser console for error messages
- Verify JSON file structure is correct
- Check network tab for API response
- Verify admin permissions

#### 2.4: Test Error Handling

**Action:**
1. Try uploading an invalid file (e.g., a text file or invalid JSON)
2. Observe error handling

**Expected:**
- ✅ Error message displayed clearly
- ✅ User-friendly error message
- ✅ File selection cleared
- ✅ Import button disabled again

**Common Errors:**
- "Invalid JSON structure" - File doesn't match expected format
- "Unauthorized" - User doesn't have admin permissions
- "File too large" - If file size limit exists

---

### Step 3: Test Staging Preview Tab

#### 3.1: Navigate to Staging Preview

**Action:**
1. Click on the **"Staging Preview"** tab
2. Wait for statistics to load

**Expected:**
- ✅ Tab switches successfully
- ✅ Statistics displayed:
  - ✅ Total Records: 778
  - ✅ Available: 764
  - ✅ Banned: 0
  - ✅ Tera Banned: 14
- ✅ Alert message visible (explaining staging table purpose)
- ✅ Refresh button visible

**Statistics Display:**
```
📊 Staging Table Statistics

Total Records: 778
Available: 764
Banned: 0
Tera Banned: 14
```

#### 3.2: Test Refresh Functionality

**Action:**
1. Click "Refresh" button
2. Observe statistics update

**Expected:**
- ✅ Loading indicator appears briefly
- ✅ Statistics refresh
- ✅ Counts remain the same (unless data changed)

#### 3.3: Verify Alert Message

**Action:**
1. Read the alert/info message on the Staging Preview tab

**Expected:**
- ✅ Alert visible explaining staging table purpose
- ✅ Message indicates this is a preview before production sync
- ✅ Clear instructions about next steps

---

### Step 4: Test Sync Tab

#### 4.1: Navigate to Sync Tab

**Action:**
1. Click on the **"Sync to Production"** tab
2. Observe the sync interface

**Expected:**
- ✅ Tab switches successfully
- ✅ Season dropdown visible
- ✅ "Season 5" auto-selected (current season)
- ✅ Dry-run checkbox visible
- ✅ "Sync to Production" button visible
- ✅ Button initially disabled (until season selected)

**UI Elements:**
- Season selector dropdown
- Dry-run checkbox
- Sync button
- Results display area (initially empty)

#### 4.2: Verify Season Selection

**Action:**
1. Check the season dropdown
2. Verify "Season 5" is selected (or current season)
3. Try selecting a different season (if available)

**Expected:**
- ✅ Dropdown populated with seasons
- ✅ Current season highlighted/selected
- ✅ "Current" badge visible next to current season
- ✅ Can select different seasons
- ✅ Sync button enables when season selected

#### 4.3: Test Dry-Run Sync

**Action:**
1. Ensure "Dry run" checkbox is **checked**
2. Verify "Season 5" is selected
3. Click "Sync to Production" button
4. Confirm in the confirmation dialog
5. Wait for dry-run to complete

**Expected:**
- ✅ Confirmation dialog appears:
  - "Are you sure you want to sync?"
  - Shows dry-run status
  - Shows selected season
- ✅ After confirmation, loading indicator appears
- ✅ Dry-run completes (5-10 seconds)
- ✅ Results displayed:
  - ✅ Would Sync: 778 Pokemon
  - ✅ Would Skip: 0 (unless Pokemon already drafted)
  - ✅ Conflicts: 0 (unless Pokemon already drafted)
  - ✅ Unmatched Names: ~746 (expected)
- ✅ **No changes made to `draft_pool` table**

**Dry-Run Results Display:**
```
✅ Dry-run completed successfully!

📊 Sync Preview:
   • Would Sync: 778 Pokemon
   • Would Skip: 0 Pokemon
   • Conflicts: 0
   • Unmatched Names: 746 (will have pokemon_id = NULL)
```

**Verification:**
- Check `draft_pool` table - should be unchanged
- Verify counts match expected values
- Review unmatched names list (if displayed)

#### 4.4: Test Actual Sync (⚠️ CAUTION)

**⚠️ IMPORTANT:** Only proceed if you're testing on a test season or are ready to update production data!

**Action:**
1. **Uncheck** "Dry run" checkbox
2. Verify season selection (use test season if available)
3. Click "Sync to Production" button
4. Confirm in the confirmation dialog
5. Wait for sync to complete

**Expected:**
- ✅ Confirmation dialog appears (without "dry-run" indicator)
- ✅ Warning about production data update
- ✅ After confirmation, loading indicator appears
- ✅ Sync completes (10-20 seconds for 778 Pokemon)
- ✅ Results displayed:
  - ✅ Synced: 778 Pokemon
  - ✅ Skipped: 0 (unless Pokemon already drafted)
  - ✅ Conflicts: 0 (unless Pokemon already drafted)
  - ✅ Unmatched Names: ~746
- ✅ **`draft_pool` table updated**

**Sync Results Display:**
```
✅ Sync completed successfully!

📊 Sync Results:
   • Synced: 778 Pokemon
   • Skipped: 0 Pokemon
   • Conflicts: 0
   • Unmatched Names: 746
```

**Verification:**
- Check `draft_pool` table - should have 778 records
- Verify `tera_captain_eligible` values:
  - Tera banned Pokemon: `false`
  - Other Pokemon: `true`
- Verify `status` values:
  - Available Pokemon: `'available'`
  - Banned Pokemon: `'banned'`

---

### Step 5: Data Verification

#### 5.1: Verify Staging Table

**Via SQL:**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_available = true) as available,
  COUNT(*) FILTER (WHERE is_available = false) as banned,
  COUNT(*) FILTER (WHERE is_tera_banned = true) as tera_banned
FROM sheets_draft_pool
WHERE sheet_name = 'Draft Board';
```

**Expected:**
- Total: 778
- Available: 764
- Banned: 0
- Tera Banned: 14

#### 5.2: Verify Production Table (After Sync)

**Via SQL:**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'available') as available,
  COUNT(*) FILTER (WHERE status = 'banned') as banned,
  COUNT(*) FILTER (WHERE status = 'drafted') as drafted,
  COUNT(*) FILTER (WHERE tera_captain_eligible = false) as tera_ineligible
FROM draft_pool
WHERE season_id = '<season-id>';
```

**Expected:**
- Total: 778
- Available: 778 (all are available)
- Banned: 0
- Drafted: 0 (unless already drafted)
- Tera Ineligible: 14

#### 5.3: Verify Tera Banned Logic

**Via SQL:**
```sql
-- Check Tera banned Pokemon
SELECT 
  pokemon_name,
  status,
  tera_captain_eligible,
  point_value
FROM draft_pool
WHERE tera_captain_eligible = false
ORDER BY point_value DESC
LIMIT 20;
```

**Expected:**
- All should have `status = 'available'`
- All should have `tera_captain_eligible = false`
- Should show ~14 Pokemon (Tera banned list)

**Sample Expected Results:**
```
pokemon_name        | status    | tera_captain_eligible | point_value
--------------------|-----------|----------------------|------------
Flutter Mane        | available | false                | 20
Deoxys              | available | false                | 20
Archaludon          | available | false                | 19
...
```

---

## Common Issues & Solutions

### Issue 1: Import Button Not Enabling

**Symptoms:**
- File selected but button remains disabled

**Solutions:**
- Check browser console for errors
- Verify file is valid JSON
- Check file size (should be reasonable)
- Try refreshing the page

### Issue 2: "Unauthorized" Error

**Symptoms:**
- API returns 401/403 error

**Solutions:**
- Verify user is logged in
- Check user has admin/commissioner role
- Verify RBAC system is configured
- Check `lib/rbac.ts` for role definitions

### Issue 3: Import Shows Errors

**Symptoms:**
- Import completes but shows errors

**Solutions:**
- Check error messages in results
- Verify JSON structure matches expected format
- Check browser console for details
- Review network tab for API response

### Issue 4: Sync Shows Many Conflicts

**Symptoms:**
- Sync shows conflicts > 0

**Solutions:**
- This is expected if Pokemon are already drafted
- Conflicts preserve drafted Pokemon (correct behavior)
- Review conflict list to see which Pokemon are protected

### Issue 5: Unmatched Names Count High

**Symptoms:**
- Many unmatched Pokemon names (~746)

**Solutions:**
- ✅ **This is EXPECTED** - Pokemon names from Google Sheets may not match `pokemon_cache`
- System handles this gracefully (`pokemon_id = NULL`)
- Can be improved by updating `pokemon_cache` table
- Not a blocker for functionality

### Issue 6: Statistics Don't Match

**Symptoms:**
- UI shows different counts than expected

**Solutions:**
- Click "Refresh" button on Staging Preview tab
- Verify import completed successfully
- Check database directly via SQL
- Clear browser cache and retry

---

## Success Criteria

✅ **UI Testing is Successful If:**

1. **Import Tab:**
   - ✅ File upload works (drag-drop and file picker)
   - ✅ Import completes without errors
   - ✅ Results display correctly
   - ✅ Error handling works for invalid files

2. **Staging Preview Tab:**
   - ✅ Statistics display correctly
   - ✅ Refresh button works
   - ✅ Counts match import results
   - ✅ Alert message visible

3. **Sync Tab:**
   - ✅ Season dropdown populates
   - ✅ Current season auto-selected
   - ✅ Dry-run works correctly
   - ✅ Dry-run shows expected counts
   - ✅ Actual sync updates production (if tested)
   - ✅ Confirmation dialogs work

4. **Data Verification:**
   - ✅ Staging table populated correctly
   - ✅ Production table updated correctly (after sync)
   - ✅ Tera banned Pokemon have `tera_captain_eligible = false`
   - ✅ Status mapping correct

---

## Testing Checklist

### Import Workflow
- [ ] File upload area visible
- [ ] Drag-drop works
- [ ] File selection works
- [ ] Import button enables after file selection
- [ ] Loading state shows during import
- [ ] Import completes successfully
- [ ] Results display correctly
- [ ] Error handling works

### Staging Preview
- [ ] Statistics display correctly
- [ ] Refresh button works
- [ ] Counts match import results
- [ ] Alert message visible

### Sync Workflow
- [ ] Season dropdown populates
- [ ] Current season auto-selected
- [ ] Dry-run checkbox works
- [ ] Confirmation dialog appears
- [ ] Dry-run completes successfully
- [ ] Dry-run shows expected counts
- [ ] No production changes in dry-run
- [ ] Actual sync works (if tested)
- [ ] Production table updated correctly

### Data Verification
- [ ] Staging table has correct data
- [ ] Tera banned flag set correctly
- [ ] Production table updated correctly (after sync)
- [ ] `tera_captain_eligible` values correct
- [ ] `status` enum values correct

---

## Next Steps After UI Testing

Once UI testing is complete:

1. ✅ Document any issues found
2. ✅ Verify all features work as expected
3. ✅ Test edge cases (if time permits)
4. ✅ Proceed to production use (if all tests pass)

---

## Quick Reference

### API Endpoints Used
- `POST /api/admin/draft-pool/import` - Import JSON to staging
- `GET /api/admin/draft-pool/staging` - Get staging statistics
- `POST /api/admin/draft-pool/sync` - Sync staging to production

### Key Files
- Component: `components/admin/draft-pool-import.tsx`
- Import API: `app/api/admin/draft-pool/import/route.ts`
- Sync API: `app/api/admin/draft-pool/sync/route.ts`
- Import Service: `lib/draft-pool/import-service.ts`
- Sync Service: `lib/draft-pool/sync-service.ts`

### Expected Data
- Total Pokemon: 778
- Available: 764
- Tera Banned: 14
- Current Season: Season 5

---

**Testing Guide Created:** 2026-01-20  
**Ready for Testing:** ✅ Yes  
**Estimated Time:** 15-20 minutes
