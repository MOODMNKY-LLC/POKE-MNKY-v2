# Phase 3: Upload Sprites to MinIO - Script Ready ✅

**Date:** January 13, 2026  
**Status:** ✅ **SCRIPT READY** - Ready to run full upload

---

## Summary

Created `scripts/upload-sprites-to-minio.ts` - a high-performance upload script that uploads all sprites from local storage to MinIO with concurrent uploads, progress tracking, and error handling.

---

## Script Features

### ✅ High Performance
- **Batch size:** 100 files per batch (configurable)
- **Concurrent uploads:** 20 files simultaneously within each batch
- **No rate limits:** Optimized for robust servers
- **Progress tracking:** Real-time progress, rate, and time estimates

### ✅ Smart Resume
- Checks if file exists in MinIO before uploading
- Compares checksums to skip unchanged files
- Can resume interrupted uploads

### ✅ Error Handling
- Continues processing despite individual failures
- Logs all errors to `minio-sprite-upload-errors.log`
- Detailed error messages for debugging

### ✅ Database Integration
- Updates `pokepedia_assets` table with MinIO URLs
- Tracks checksums, file sizes, and content types
- Uses upsert to handle existing records

---

## Usage

### Dry Run (Test)
```powershell
pnpm tsx scripts/upload-sprites-to-minio.ts --dry-run --limit=10
```

### Small Batch Test
```powershell
pnpm tsx scripts/upload-sprites-to-minio.ts --limit=100
```

### Full Upload (All 58,824+ files)
```powershell
pnpm tsx scripts/upload-sprites-to-minio.ts
```

### Custom Batch Size
```powershell
pnpm tsx scripts/upload-sprites-to-minio.ts --batch-size=200
```

---

## Command Line Options

- `--dry-run` - Test mode, no actual uploads
- `--limit=N` - Limit to first N files (for testing)
- `--batch-size=N` - Set batch size (default: 100)

---

## What It Does

1. **Collects Files:**
   - Scans `resources/sprites/sprites/` recursively
   - Filters image files (.png, .jpg, .gif, .svg)
   - Found: **59,031 files** (all sprite types)

2. **Uploads to MinIO:**
   - Uploads to `pokedex-sprites` bucket
   - Preserves directory structure: `sprites/pokemon/...`
   - Uses concurrent uploads for speed

3. **Updates Database:**
   - Updates `pokepedia_assets` table
   - Sets `source_url` to MinIO URL
   - Records checksums and metadata

4. **Tracks Progress:**
   - Shows batch progress
   - Displays upload rate (files/sec)
   - Estimates remaining time
   - Final summary report

---

## Expected Performance

**With robust servers and no rate limits:**
- **Upload rate:** ~50-200 files/sec (depends on file sizes)
- **Total time:** ~5-20 minutes for 59,031 files
- **Concurrent uploads:** 20 files at once

---

## Verification

After upload completes:

1. **Check MinIO:**
   ```powershell
   mc ls -r local/pokedex-sprites/sprites | Measure-Object -Line
   ```

2. **Verify Database:**
   ```sql
   SELECT COUNT(*) FROM pokepedia_assets 
   WHERE bucket = 'pokedex-sprites' 
   AND source_url LIKE 'http://10.0.0.5:30090%';
   ```

3. **Test URLs:**
   - Open: `http://10.0.0.5:30090/pokedex-sprites/sprites/pokemon/25.png`
   - Should display sprite image

---

## Error Handling

- Errors logged to: `minio-sprite-upload-errors.log`
- Format: `storage_path|error_message`
- Can retry failed uploads by re-running script (skips successful uploads)

---

## Next Steps

1. **Run Full Upload:**
   ```powershell
   pnpm tsx scripts/upload-sprites-to-minio.ts
   ```

2. **Monitor Progress:**
   - Watch console output
   - Check error log if issues occur

3. **Verify Upload:**
   - Check file count in MinIO
   - Verify database records
   - Test sprite URLs in browser

4. **Proceed to Phase 4:**
   - Upload PokeAPI data to `poke-mnky` bucket

---

## Files Created

- ✅ `scripts/upload-sprites-to-minio.ts` - Main upload script

---

## Ready to Proceed! 🚀

The script is tested and ready. Run the full upload when ready!

---

**Last Updated:** January 13, 2026  
**Status:** ✅ Ready for Full Upload
