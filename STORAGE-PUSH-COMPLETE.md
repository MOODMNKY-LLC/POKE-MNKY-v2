# Storage Objects Push to Production - Setup Complete ✅

**Date:** 2026-01-13  
**Method:** Modified `mirror-sprites-to-storage.ts` script  
**Status:** ✅ Script updated and tested (100 files uploaded successfully)

---

## Summary

The sprite upload script has been updated to properly handle production storage uploads. The script now checks **both** database metadata AND actual storage file existence before skipping, which handles the case where database was synced but storage files weren't.

### Test Results

- ✅ **100 files uploaded successfully** to production storage
- ✅ Script correctly identifies files missing from storage
- ✅ Idempotent: Safe to re-run (skips files that already exist)

---

## Script Updates

### Modified: `scripts/mirror-sprites-to-storage.ts`

**Change:** Added storage existence check before skipping uploads

```typescript
// Now checks BOTH database metadata AND storage file existence
// Only skips if BOTH exist (handles synced database but empty storage)
const fileExistsInStorage = /* check storage */
if (existing?.sha256 === checksum && fileExistsInStorage) {
  return { success: true, checksum, skipped: true }
}
```

---

## Upload All Sprites to Production

To upload all 59,031 sprites to production storage:

```powershell
# Set production credentials
$env:NEXT_PUBLIC_SUPABASE_URL="https://chmrszrwlfeqovwxyrmt.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXJzenJ3bGZlcW92d3h5cm10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE5OTQxMywiZXhwIjoyMDgzNzc1NDEzfQ.uTi9Re3MetIiwgtaS51JIbI1Oay1UCKy5aHmYz1QDHY"

# Run full upload (no limit)
pnpm tsx scripts/mirror-sprites-to-storage.ts
```

**Expected:** ~59,031 files will be uploaded in batches of 50  
**Time:** Approximately 1-2 hours depending on network speed

---

## Alternative: Upload in Chunks

If you want to upload in smaller chunks for monitoring:

```powershell
# Upload first 1000 files
pnpm tsx scripts/mirror-sprites-to-storage.ts --limit=1000

# Then continue with next 1000
# (Script will skip already-uploaded files)
```

---

## Verification

After upload completes, verify files in production:

```powershell
node -e "const { createClient } = require('@supabase/supabase-js'); const supabase = createClient('https://chmrszrwlfeqovwxyrmt.supabase.co', 'YOUR_SERVICE_ROLE_KEY'); supabase.storage.from('pokedex-sprites').list('sprites', { limit: 10 }).then(({ data }) => console.log('Files:', data?.length || 0));"
```

---

## Files Modified

- ✅ `scripts/mirror-sprites-to-storage.ts` - Added storage existence check

---

## Next Steps

1. **Run full upload** (see command above)
2. **Monitor progress** - Script shows batch progress
3. **Verify completion** - Check storage bucket file count
4. **Update sprite URLs** - Update `pokepedia_pokemon` sprite paths to use storage URLs

---

✅ **Script ready for full production upload!**
