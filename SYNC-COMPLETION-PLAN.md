# Poképedia Sync Completion Plan

**Date:** 2026-01-13  
**Goal:** Complete all data syncing before UI integration

---

## Current Status

### ✅ Completed
- **Ditto Clone:** 47/48 endpoints (97.9%)
- **Data Import:** 3,840+ resources imported
- **Pokemon Projections:** 1,350 Pokemon projections built
- **Endpoints:** 47/48 endpoints imported

### ⏳ In Progress
- **Sprite Mirroring:** Script fixed, ready to run full sync
- **Language Endpoint:** Not found in ditto data (may not exist in local PokeAPI)

---

## Remaining Tasks

### 1. Complete Sprite Mirroring ✅ (Script Fixed)
**Status:** Script schema fixed, ready to run

**Action:**
```bash
pnpm tsx scripts/mirror-sprites-to-storage.ts --dry-run=false
```

**Expected:**
- Upload ~59,000+ sprite files
- Duration: 2-4 hours
- Creates entries in `pokepedia_assets` table

**Note:** Script now uses correct schema:
- `asset_kind` (not `asset_type`)
- `bucket` and `path` (not `storage_path`)
- `bytes` (not `file_size`)
- `source_url` (required field)

### 2. Language Endpoint (Optional)
**Status:** Not found in ditto data

**Options:**
- Skip if not critical for MVP
- Import from api-data if available
- Or import from production PokeAPI if needed

### 3. Verify Complete Sync
**Action:**
```bash
pnpm tsx scripts/verify-sync-status.ts
```

**Success Criteria:**
- ✅ All 48 endpoints imported (or 47 if language unavailable)
- ✅ 1,350+ Pokemon projections
- ✅ Sprites uploaded and recorded
- ✅ No critical errors

---

## Data Summary

### Resources Imported
- **Total:** 3,840+ resources
- **Pokemon:** 1,351 resources
- **Endpoints:** 47/48

### Projections Built
- **Pokemon:** 1,350 projections
- **Coverage:** All imported Pokemon

### Assets
- **Sprites:** Ready to upload (script fixed)
- **Cries:** Pending implementation

---

## Next Steps

1. **Run full sprite mirroring** (2-4 hours)
2. **Verify sync completion**
3. **Test data queries**
4. **Proceed with UI integration**

---

## Commands Reference

```bash
# Verify sync status
pnpm tsx scripts/verify-sync-status.ts

# Complete sprite mirroring
pnpm tsx scripts/mirror-sprites-to-storage.ts --dry-run=false

# Rebuild projections (if needed)
pnpm tsx scripts/build-pokepedia-projections.ts

# Check specific endpoint
pnpm tsx scripts/import-ditto-data.ts --endpoint=<name>
```
