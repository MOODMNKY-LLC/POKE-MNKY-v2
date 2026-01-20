# Draft Pool UI Testing - Quick Reference Card

**Quick checklist for UI testing**

---

## 🚀 Quick Start

1. **Start Dev Server** (if not running):
   ```bash
   pnpm dev
   ```

2. **Navigate to Admin Page**:
   ```
   http://localhost:3000/admin
   ```

3. **Find Section**: "Draft Pool Import & Sync"

---

## 📋 Testing Checklist

### ✅ Import Tab (5 minutes)
- [ ] File upload area visible
- [ ] Select `app-agent-handoff/data/draft-pool-generated.json`
- [ ] Click "Import to Staging"
- [ ] Verify results: 778 imported, 14 Tera banned, 0 errors

### ✅ Staging Preview Tab (2 minutes)
- [ ] Click "Staging Preview" tab
- [ ] Verify statistics: 778 total, 764 available, 14 Tera banned
- [ ] Click "Refresh" button
- [ ] Verify counts remain correct

### ✅ Sync Tab - Dry Run (5 minutes)
- [ ] Click "Sync to Production" tab
- [ ] Verify "Season 5" selected
- [ ] Check "Dry run" checkbox
- [ ] Click "Sync to Production"
- [ ] Confirm in dialog
- [ ] Verify results: Would sync 778, 0 conflicts
- [ ] Verify NO changes to `draft_pool` table

### ✅ Sync Tab - Actual Sync (5 minutes) ⚠️
- [ ] Uncheck "Dry run" checkbox
- [ ] Click "Sync to Production"
- [ ] Confirm in dialog
- [ ] Verify results: Synced 778, 0 conflicts
- [ ] Verify `draft_pool` table updated

---

## ✅ Expected Results

### Import Results
```
✅ Imported: 778 Pokemon
✅ Tera Banned: 14 Pokemon
✅ Errors: 0
```

### Staging Statistics
```
Total: 778
Available: 764
Banned: 0
Tera Banned: 14
```

### Sync Results (Dry-Run)
```
Would Sync: 778
Would Skip: 0
Conflicts: 0
Unmatched: ~746
```

### Sync Results (Actual)
```
Synced: 778
Skipped: 0
Conflicts: 0
Unmatched: ~746
```

---

## 🔍 Quick Verification Queries

### Check Staging
```sql
SELECT COUNT(*) FROM sheets_draft_pool WHERE sheet_name = 'Draft Board';
-- Expected: 778
```

### Check Production (After Sync)
```sql
SELECT COUNT(*) FROM draft_pool WHERE season_id = '<season-id>';
-- Expected: 778
```

### Check Tera Banned
```sql
SELECT COUNT(*) FROM draft_pool WHERE tera_captain_eligible = false;
-- Expected: 14
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Button not enabling | Check file selection, refresh page |
| Unauthorized error | Verify admin role, check RBAC |
| Import errors | Check JSON structure, browser console |
| High unmatched count | ✅ Expected (~746), not a blocker |

---

## 📝 Notes

- **Unmatched Names**: ~746 is expected - Pokemon names from Google Sheets may not match `pokemon_cache`
- **Dry-Run**: Always test dry-run first before actual sync
- **Conflicts**: 0 conflicts expected unless Pokemon already drafted
- **Tera Banned**: Should have `tera_captain_eligible = false` but `status = 'available'`

---

**Quick Reference Created:** 2026-01-20  
**Full Guide:** See `DRAFT-POOL-UI-TESTING-GUIDE.md`
