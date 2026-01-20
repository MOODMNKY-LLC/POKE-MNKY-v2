# Draft Pool Import/Sync - Quick Test Checklist

Use this checklist when testing the system for the first time.

---

## Pre-Testing Setup

- [ ] Migrations applied to database
- [ ] Environment variables set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Admin user logged in
- [ ] JSON file ready (`app-agent-handoff/data/draft-pool-generated.json`)
- [ ] Test season created (optional, for safe testing)

---

## Quick Validation Test

```bash
# Run comprehensive validation
npx tsx scripts/validate-draft-pool-system.ts
```

**Expected:** All tests pass ✅

---

## UI Testing Checklist

### Import Tab
- [ ] File upload area visible
- [ ] Drag-drop works
- [ ] File selection works
- [ ] Import button enabled after file selection
- [ ] Loading state shows during import
- [ ] Import results display correctly
- [ ] Error handling works (try invalid file)

### Staging Preview Tab
- [ ] Statistics display correctly
- [ ] Refresh button works
- [ ] Counts match import results
- [ ] Alert message visible

### Sync Tab
- [ ] Season dropdown populates
- [ ] Current season auto-selected
- [ ] Dry-run checkbox works
- [ ] Sync button enabled when season selected
- [ ] Confirmation dialog appears
- [ ] Loading state shows during sync
- [ ] Sync results display correctly
- [ ] Dry-run shows "would sync" counts
- [ ] Actual sync updates production table

---

## Data Verification Checklist

### After Import
- [ ] Check `sheets_draft_pool` table has data
- [ ] Verify `is_tera_banned` flag set correctly
- [ ] Verify `is_available` flag set correctly
- [ ] Count matches JSON metadata

### After Dry-Run Sync
- [ ] Review sync statistics
- [ ] Check for unmatched Pokemon names
- [ ] Verify conflict count (should be 0 unless Pokemon drafted)
- [ ] No changes made to `draft_pool` table

### After Actual Sync
- [ ] Check `draft_pool` table updated
- [ ] Verify `tera_captain_eligible` set correctly
  - Tera banned Pokemon: `false`
  - Other Pokemon: `true`
- [ ] Verify `status` enum correct
  - Available Pokemon: `'available'`
  - Banned Pokemon: `'banned'`
- [ ] Verify `pokemon_id` populated (or NULL with warning)
- [ ] Verify drafted Pokemon preserved (if any)

---

## Common Issues & Solutions

### Issue: Import fails with "Invalid JSON structure"
**Solution:** Check JSON file matches `ServerAgentDraftPool` interface

### Issue: Sync shows many unmatched names
**Solution:** 
- Check `pokemon_cache` table has data
- Review Pokemon names in staging table
- Fuzzy matching should handle most cases

### Issue: Tera banned Pokemon showing as available
**Solution:** ✅ This is CORRECT - they're draftable but `tera_captain_eligible = false`

### Issue: Admin permission denied
**Solution:** 
- Verify user has admin/commissioner role
- Check RBAC system is set up
- Review `lib/rbac.ts` and user profiles

---

## Success Criteria

✅ **System is working correctly if:**
- Import completes without errors
- Staging table populated correctly
- Dry-run sync shows expected counts
- Actual sync updates production correctly
- Tera banned Pokemon have `tera_captain_eligible = false`
- Drafted Pokemon preserved during sync

---

**Quick Test Time:** ~10-15 minutes  
**Full Test Time:** ~30-45 minutes
