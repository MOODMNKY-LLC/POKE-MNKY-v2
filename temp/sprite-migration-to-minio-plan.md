# Sprite Migration to MinIO - Revised Strategy

**Date:** January 13, 2026  
**Status:** 📋 Planning Complete - Ready for Implementation

---

## Executive Summary

Migrate sprite files directly from local storage to MinIO (home server) using local network access. Skip Supabase download since it's incomplete. Also upload PokeAPI data to `poke-mnky` bucket for backup/restore.

**Key Facts:**
- ✅ All sprite files already local: `resources/sprites/sprites/` (58,824 files)
- ✅ PokeAPI data already local: `resources/api-data/data/api/` (14,332 JSON files)
- ✅ Local MinIO access: `http://10.0.0.5:30090` (fast!)
- ❌ Supabase Storage incomplete (ran out of storage) - skip download

---

## Migration Phases

### Phase 1: Code Preparation ✅ Ready
**Goal:** Update code to support MinIO URLs with backward compatibility

**Tasks:**
1. Update `lib/pokemon-utils.ts`:
   - Modify `getSpriteUrl()` to check `SPRITES_BASE_URL` env var
   - If `SPRITES_BASE_URL` set → use MinIO
   - If not set → use Supabase (backward compatible)

2. Test locally:
   - Set `SPRITES_BASE_URL` in `.env.local`
   - Test single sprite URL generation
   - Verify fallback works

**Files to Modify:**
- `lib/pokemon-utils.ts` (sprite URL functions)

**Estimated Time:** 30 minutes

---

### Phase 2: Ditto Backup (Deferred) 🔄
**Goal:** Create ultimate backup source from PokeAPI GitHub

**Status:** ⏸️ **DEFERRED** - Will revisit after core migration is complete

**Why:** Provides independent restore capability without Supabase

**Tasks:** (To be completed later)
1. Run ditto clone
2. Verify clone
3. Store as backup

**Benefits:**
- Ultimate backup source (PokeAPI GitHub)
- Can restore entire sprite set anytime
- Independent of Supabase or MinIO

**Estimated Time:** 1-2 hours (when ready)

---

### Phase 3: Upload Sprites to MinIO 📤
**Goal:** Upload all sprites directly from local files to MinIO

**Tasks:**
1. Create upload script (`scripts/upload-sprites-to-minio.ts`):
   - Based on `scripts/mirror-sprites-to-storage.ts`
   - Change from Supabase client to AWS S3 client (MinIO)
   - Read from `resources/sprites/sprites/`
   - Upload to MinIO `pokedex-sprites` bucket
   - Preserve directory structure (`sprites/pokemon/...`)
   - Calculate checksums
   - Update `pokepedia_assets` table with MinIO URLs
   - Track progress and errors

2. Run upload:
   ```powershell
   pnpm tsx scripts/upload-sprites-to-minio.ts
   ```

3. Verify upload:
   - Compare file counts (should be ~58,824)
   - Spot-check random files
   - Verify checksums
   - Test URL accessibility

**Output:**
- All sprites in MinIO `pokedex-sprites` bucket
- Updated database records
- Upload report

**Estimated Time:** 10-30 minutes (local network is fast!)

---

### Phase 4: Upload PokeAPI Data to MinIO 📦
**Goal:** Upload PokeAPI JSON data to `poke-mnky` bucket for backup/restore

**Tasks:**
1. Create upload script (`scripts/upload-pokeapi-data-to-minio.ts`):
   - Read from `resources/api-data/data/api/`
   - Upload to MinIO `poke-mnky` bucket
   - Preserve directory structure
   - Track progress

2. Run upload:
   ```powershell
   pnpm tsx scripts/upload-pokeapi-data-to-minio.ts
   ```

3. Verify upload:
   - Compare file counts (should be ~14,332 JSON files)
   - Spot-check random files

**Purpose:**
- Backup/restore capability
- Can be used for future syncs
- Independent of Supabase

**Estimated Time:** 30-60 minutes (large dataset, but local network)

---

### Phase 5: Update Database Records 🔄
**Goal:** Update `pokepedia_assets` table with MinIO URLs

**Tasks:**
1. Update existing records:
   - Match by `bucket` + `path`
   - Update `source_url` to MinIO URL
   - Or create new records if don't exist

2. Verify:
   - Check record counts
   - Verify URLs are correct
   - Test URL generation

**Estimated Time:** 5-10 minutes

---

### Phase 6: Testing & Verification ✅
**Goal:** Verify migration success before production cutover

**Tasks:**
1. Single file test:
   - Upload one test sprite
   - Update one database record
   - Test URL generation
   - Verify browser access
   - Test CORS

2. Small batch test:
   - Upload 100 sprites
   - Test in application
   - Verify all accessible
   - Check performance

3. Full migration verification:
   - Compare file counts (local vs MinIO)
   - Spot-check random files
   - Verify checksums match
   - Test URL generation
   - Verify browser access

**Estimated Time:** 30 minutes

---

### Phase 7: Production Rollout 🚀
**Goal:** Switch production to MinIO URLs

**Tasks:**
1. Update production environment:
   - Set `SPRITES_BASE_URL` in production `.env`
   - Deploy code changes

2. Monitor:
   - Check error logs
   - Monitor sprite loading
   - Verify CORS working
   - Check performance

**Rollback Plan:**
- Remove `SPRITES_BASE_URL` from `.env`
- Redeploy
- Code automatically falls back to Supabase URLs
- Instant rollback (< 5 minutes)

**Estimated Time:** 15 minutes (deployment)

---

### Phase 8: Verification Period 👀
**Goal:** Monitor production for 24-48 hours

**Tasks:**
1. Monitor error logs
2. Check sprite loading in production
3. Verify CORS working
4. Monitor MinIO performance
5. Check Cloudflare caching

**Success Criteria:**
- No sprite loading errors
- CORS working correctly
- Performance acceptable
- No user complaints

**Estimated Time:** 24-48 hours (monitoring)

---

### Phase 9: Cleanup (Optional) 🧹
**Goal:** Optional cleanup after verification

**Tasks:**
1. After 48 hours of successful operation:
   - Verify no issues
   - Optional: Remove Supabase sprites (if desired)

2. Keep backups:
   - Local files (`resources/sprites/`)
   - Ditto clone (`tools/ditto/data/sprites/`)
   - MinIO (production)

**Estimated Time:** 10 minutes

---

## Detailed Implementation

### Script 1: Upload Sprites to MinIO

**File:** `scripts/upload-sprites-to-minio.ts`

**Based on:** `scripts/mirror-sprites-to-storage.ts`

**Changes:**
- Replace Supabase client with AWS S3 client
- Use MinIO endpoint from env vars
- Upload to `pokedex-sprites` bucket
- Update `pokepedia_assets` table with MinIO URLs

**Key Code:**
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { createClient } from "@supabase/supabase-js"

// Initialize MinIO client
const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT_INTERNAL,
  region: process.env.MINIO_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO
})

// Upload function
async function uploadToMinIO(filePath: string, storagePath: string) {
  const fileBuffer = fs.readFileSync(filePath)
  const command = new PutObjectCommand({
    Bucket: "pokedex-sprites",
    Key: storagePath,
    Body: fileBuffer,
    ContentType: getContentType(filePath),
  })
  await s3Client.send(command)
}
```

### Script 2: Upload PokeAPI Data to MinIO

**File:** `scripts/upload-pokeapi-data-to-minio.ts`

**Purpose:** Backup PokeAPI JSON data to `poke-mnky` bucket

**Structure:**
- Read from `resources/api-data/data/api/`
- Upload to `poke-mnky` bucket
- Preserve directory structure
- Track progress

---

## Backup Strategy

### Multiple Redundancy Layers:

1. **Primary:** MinIO (production)
2. **Backup 1:** Local files (`resources/sprites/`)
3. **Backup 2:** Ditto clone (`tools/ditto/data/sprites/`)
4. **Backup 3:** PokeAPI data in MinIO (`poke-mnky` bucket)
5. **Ultimate Source:** PokeAPI GitHub (can re-clone anytime)

---

## Risk Mitigation

### Data Loss Prevention:
- ✅ Keep local files (never delete)
- ✅ Ditto clone as restore source
- ✅ Checksum verification at each step
- ✅ Multiple backup layers

### Service Disruption:
- ✅ Gradual rollout (test batch first)
- ✅ Instant rollback (env var change)
- ✅ Backward compatible code
- ✅ Monitor closely

### Performance:
- ✅ Local network upload (very fast)
- ✅ Test with small batch first
- ✅ Monitor MinIO performance
- ✅ Verify Cloudflare caching

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Code Preparation | 30 min | 30 min |
| ~~Ditto Backup (deferred)~~ | ~~1-2 hours~~ | ~~-~~ |
| Upload Sprites | 10-30 min | 40-60 min |
| Upload PokeAPI Data | 30-60 min | 2.5-4 hours |
| Update Database | 5-10 min | 2.75-4.25 hours |
| Testing | 30 min | 3.25-4.75 hours |
| Production Rollout | 15 min | 3.5-5 hours |
| Verification Period | 24-48 hours | - |
| Cleanup | 10 min | - |

**Total Active Time:** ~2.5-3.5 hours (without Ditto)  
**Verification Period:** 24-48 hours

**Much faster than original plan!** (No download step needed, Ditto deferred)

---

## Success Criteria

- ✅ All 58,824 sprites migrated
- ✅ All 14,332 PokeAPI JSON files backed up
- ✅ Checksums match (100% verification)
- ✅ URLs generate correctly
- ✅ Browser access works (CORS)
- ✅ Application loads sprites correctly
- ✅ No performance degradation
- ✅ Rollback tested and ready

---

## Next Steps

1. **Start with Code Changes** (Phase 1)
2. **Run Ditto Backup** (Phase 2 - optional)
3. **Upload Sprites to MinIO** (Phase 3)
4. **Upload PokeAPI Data** (Phase 4)
5. **Update Database** (Phase 5)
6. **Test Thoroughly** (Phase 6)
7. **Deploy to Production** (Phase 7)
8. **Monitor** (Phase 8)
9. **Cleanup** (Phase 9)

---

## Key Advantages of This Approach

1. **No Download Step:** Files already local, upload directly
2. **Fast Upload:** Local network (10.0.0.5) is much faster than internet
3. **Complete Data:** All files available locally (not incomplete like Supabase)
4. **Easy Retry:** Can retry failed uploads easily
5. **Multiple Backups:** Local files + Ditto + MinIO + PokeAPI GitHub

---

**Ready to proceed?** Start with Phase 1 (Code Preparation) - it's the foundation for everything else.
