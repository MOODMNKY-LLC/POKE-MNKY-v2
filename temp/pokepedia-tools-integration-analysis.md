# Poképedia Tools & Resources Integration Analysis

**Comprehensive Breakdown, Harmonious Integration Design, and Implementation Plan**

*Generated: 2026-01-13*  
*Based on: Deep research analysis of Supabase Storage, PostgreSQL JSONB bulk operations, and data ingestion pipeline architecture*

---

## Executive Summary

This document provides a comprehensive analysis of all tools and resources added to the Poképedia sync infrastructure, their respective roles, how they work together harmoniously, and a detailed implementation plan for storing all data, sprites, and cries in Supabase for in-app use.

**Key Findings:**
- Five core tools/resources form a complete data ingestion ecosystem
- Three-plane architecture (Canonical → Projection → Media) enables optimal performance
- Current batch sizes are conservative and can be optimized (50-100 → 500-1000)
- Missing orchestration layer and cries integration
- Resumable uploads recommended for media assets

---

## Part 1: Tool/Resource Role Breakdown

### 1.1 `resources/api-data` - Baseline Dataset & Schema

**Location:** `resources/api-data/`  
**Repository:** [PokeAPI/api-data](https://github.com/PokeAPI/api-data)  
**Contents:** 14,446 static JSON files + JSON Schema

#### Role in Poképedia Sync

**Primary Function:** Fast baseline dataset for initial seeding

**Key Characteristics:**
- Static JSON snapshots of PokeAPI REST v2 endpoints
- Includes JSON Schema for validation (`data/schema/`)
- Updated periodically by PokeAPI's updater bot
- Provides deterministic, version-controlled dataset

**Data Structure:**
```
resources/api-data/
├── data/
│   └── api/
│       └── v2/
│           ├── pokemon/
│           │   ├── 1/
│           │   │   └── index.json
│           │   ├── 2/
│           │   └── index.json
│           └── ... (other endpoints)
└── data/
    └── schema/
        └── ... (JSON Schema definitions)
```

#### Integration Points

1. **Import Script:** `scripts/import-api-data.ts`
   - Reads JSON files from `resources/api-data/data/api/v2/`
   - Handles nested directory structures (pokemon/1/index.json)
   - Batch inserts (current: 100 rows) into `pokeapi_resources`
   - Idempotent upserts using `(resource_type, resource_key)`

2. **Use Case:** 
   - **Fast initial seeding** before ditto clone completes
   - **Schema validation** using included JSON Schema
   - **Baseline dataset** for development/testing

3. **Advantages:**
   - No network calls required
   - Fast import (local file reads)
   - Deterministic and version-controlled
   - Includes schema for validation

4. **Limitations:**
   - May not include all endpoints (ditto provides comprehensive coverage)
   - Static snapshot (not real-time)
   - Requires periodic updates

#### Current Status
- ✅ Repository cloned
- ✅ Import script created
- ✅ 1,350 Pokemon imported (partial, for testing)
- ⏳ Full import pending (waiting for ditto completion decision)

---

### 1.2 `tools/ditto` - Comprehensive Clone Engine

**Location:** `tools/ditto/`  
**Repository:** [PokeAPI/ditto](https://github.com/PokeAPI/ditto)  
**Type:** Python tool (Poetry-managed)

#### Role in Poképedia Sync

**Primary Function:** Comprehensive REST v2 corpus cloning

**Key Characteristics:**
- Official PokeAPI tool for meta operations
- Three commands: `clone`, `analyze`, `transform`
- Designed for respectful API usage (avoids rate limits)
- Produces complete dataset mirror

**Commands:**
1. **`ditto clone`**: Crawls PokeAPI instance and downloads all data
   - Respects rate limits
   - Handles all endpoints (~48 total)
   - Stores in `data/api/v2/` structure
   
2. **`ditto analyze`**: Generates JSON schema from cloned data
   - Useful for validation
   - Enables TypeScript type generation
   
3. **`ditto transform`**: Rewrites base URLs in cloned data
   - Useful for self-hosting scenarios
   - Can rewrite references to local URLs

#### Integration Points

1. **Data Source:** Local PokeAPI instance (`tools/pokeapi-local`)
   - Runs at `http://localhost/api/v2/`
   - Avoids rate limits on production API
   - Provides complete dataset

2. **Import Script:** `scripts/import-ditto-data.ts`
   - Reads from `tools/ditto/data/api/v2/`
   - Recursively processes all JSON files
   - Batch inserts into `pokeapi_resources`
   - Handles all endpoints comprehensively

3. **Use Case:**
   - **Complete data coverage** (all endpoints, all resources)
   - **Foundation load** (one-time bulk import)
   - **Comprehensive sync** (complements api-data baseline)

4. **Current Status:**
   - ✅ Repository cloned
   - ✅ Docker setup configured
   - ✅ Multiprocessing fixes applied (PicklingError resolved)
   - ✅ URL path duplication fixes applied
   - ⏳ Clone in progress (~0.73% complete, 8/48 endpoints, 102 files)

#### Advantages
- Complete coverage (all endpoints)
- Official tool (respects fair use)
- No rate limit concerns (uses local instance)
- Produces comprehensive dataset

#### Limitations
- Long-running process (hours for full clone)
- Requires local PokeAPI instance
- Python dependency (Poetry required)

---

### 1.3 `resources/sprites` - Sprite Asset Repository

**Location:** `resources/sprites/`  
**Repository:** [PokeAPI/sprites](https://github.com/PokeAPI/sprites)  
**Contents:** 59,031 files (47,297 PNGs, 10,300 GIFs, 1,146 SVGs)

#### Role in Poképedia Sync

**Primary Function:** Complete sprite asset collection for Supabase Storage mirroring

**Key Characteristics:**
- Official PokeAPI sprite repository
- Comprehensive coverage (all generations, all variants)
- Organized by category and generation
- Reduces load on PokeAPI infrastructure

**Directory Structure:**
```
resources/sprites/
└── sprites/
    ├── pokemon/
    │   ├── other/
    │   │   ├── dream-world/      (SVGs)
    │   │   ├── official-artwork/ (475x475 PNGs)
    │   │   ├── home/             (512x512 PNGs)
    │   │   └── showdown/         (GIFs)
    │   └── versions/
    │       ├── generation-i/
    │       ├── generation-ii/
    │       └── ... (through generation-ix)
    └── items/
        └── ... (item sprites)
```

**Sprite Categories:**
- **Default sprites**: PNGs with back, female, shiny variants
- **Official artwork**: 475x475 PNGs (preferred for UI)
- **Home sprites**: 512x512 PNGs
- **Dream World**: SVGs
- **Showdown**: Animated GIFs
- **Generation-specific**: Sprites from each game generation

#### Integration Points

1. **Mirror Script:** `scripts/mirror-sprites-to-storage.ts`
   - Reads from `resources/sprites/sprites/`
   - Uploads to Supabase Storage bucket `pokedex-sprites`
   - Preserves directory structure
   - Records metadata in `pokepedia_assets` table
   - Uses SHA-256 checksums for deduplication

2. **Storage Structure:**
   - Bucket: `pokedex-sprites` (public)
   - Path: `sprites/pokemon/...` (matches repo structure)
   - Public URL: `{supabase_url}/storage/v1/object/public/pokedex-sprites/sprites/...`

3. **Database Integration:**
   - `pokepedia_assets` table tracks:
     - `source_url`: Original GitHub URL
     - `bucket`: `pokedex-sprites`
     - `path`: Storage path
     - `sha256`: File checksum
     - `content_type`: MIME type
     - `bytes`: File size

4. **Projection Integration:**
   - `pokepedia_pokemon` table includes:
     - `sprite_front_default_path`: Path to default sprite
     - `sprite_official_artwork_path`: Path to official artwork (preferred)

#### Current Status
- ✅ Repository cloned
- ✅ Mirror script created
- ✅ Dry run completed (validation)
- ⏳ Full mirror pending (59K+ files)

#### Advantages
- Complete sprite collection
- Official source (reduces PokeAPI load)
- Deterministic paths (easy URL generation)
- Version-controlled (Git repository)

#### Limitations
- Large dataset (59K+ files)
- Upload time (hours for full mirror)
- Storage costs (consider CDN caching)

---

### 1.4 `resources/cries` - Audio Asset Repository

**Location:** `resources/cries/`  
**Repository:** [PokeAPI/cries](https://github.com/PokeAPI/cries)  
**Contents:** 1,951 OGG audio files

#### Role in Poképedia Sync

**Primary Function:** Pokémon cry audio files for Supabase Storage mirroring

**Key Characteristics:**
- Official PokeAPI cries repository
- OGG format (open, royalty-free)
- Two variants: latest and legacy
- Mapped by Pokémon ID

**Directory Structure:**
```
resources/cries/
└── cries/
    └── pokemon/
        ├── latest/
        │   ├── 1.ogg
        │   ├── 2.ogg
        │   └── ... (through 10277.ogg)
        └── legacy/
            ├── 1.ogg
            ├── 2.ogg
            └── ... (through 649.ogg)
```

**Cry Variants:**
- **Latest**: Modern cries (all generations)
- **Legacy**: Original Game Boy cries (Gen 1-5)

#### Integration Points

1. **Mirror Script:** ⚠️ **NOT YET CREATED**
   - Should mirror to Supabase Storage bucket `pokedex-cries`
   - Preserve directory structure (`cries/pokemon/latest/`, `cries/pokemon/legacy/`)
   - Record metadata in `pokepedia_assets` table
   - Use SHA-256 checksums for deduplication

2. **Storage Structure:**
   - Bucket: `pokedex-cries` (public)
   - Path: `cries/pokemon/latest/{id}.ogg` or `cries/pokemon/legacy/{id}.ogg`
   - Public URL: `{supabase_url}/storage/v1/object/public/pokedex-cries/cries/pokemon/...`

3. **Database Integration:**
   - `pokepedia_assets` table should track:
     - `asset_kind`: `'cry'`
     - `resource_type`: `'pokemon'`
     - `resource_id`: Pokémon ID
     - `bucket`: `pokedex-cries`
     - `path`: Storage path
     - `sha256`: File checksum
     - `content_type`: `audio/ogg`

4. **Projection Integration:**
   - `pokepedia_pokemon` table already includes:
     - `cry_latest_path`: Path to latest cry
     - `cry_legacy_path`: Path to legacy cry
   - Paths extracted from `pokeapi_resources` JSONB data

#### Current Status
- ✅ Repository cloned
- ❌ Mirror script **NOT CREATED** (implementation needed)
- ❌ Storage bucket **NOT CREATED** (implementation needed)
- ❌ Integration **NOT COMPLETE**

#### Advantages
- Complete cry collection
- Official source
- Two variants (latest/legacy)
- Deterministic paths

#### Limitations
- Implementation missing
- Audio files (larger than sprites)
- Storage costs

---

### 1.5 `tools/pokeapi-local` - Local API Instance

**Location:** `tools/pokeapi-local/`  
**Repository:** [PokeAPI/pokeapi](https://github.com/PokeAPI/pokeapi)  
**Type:** Docker Compose application

#### Role in Poképedia Sync

**Primary Function:** Local PokeAPI instance for ditto clone source

**Key Characteristics:**
- Complete PokeAPI server running locally
- Docker Compose setup (app, db, cache, web, graphql-engine)
- Accessible at `http://localhost/api/v2/`
- GraphQL console at `http://localhost:8080`
- Database pre-populated with all Pokémon data

#### Integration Points

1. **Ditto Data Source:**
   - Ditto clones from `http://localhost/api/v2/`
   - Avoids rate limits on production API
   - Provides complete dataset
   - No network dependency (offline capable)

2. **Development Workflow:**
   - Start: `cd tools/pokeapi-local && docker compose up -d`
   - Verify: `curl http://localhost/api/v2/pokemon/1`
   - Use: Ditto clones from local instance

3. **Use Cases:**
   - **Foundation load**: Source for ditto clone
   - **Development**: Local testing without external API
   - **Offline work**: No internet required
   - **Rate limit avoidance**: No production API calls

#### Current Status
- ✅ Docker Compose setup complete
- ✅ All containers running
- ✅ Database populated
- ✅ Accessible and verified

#### Advantages
- No rate limits
- Offline capable
- Fast (local network)
- Complete dataset

#### Limitations
- Requires Docker
- Resource intensive (multiple containers)
- Local only (not for production)

---

## Part 2: Harmonious Integration Architecture

### 2.1 Three-Plane Architecture

The Poképedia sync system uses a three-plane architecture that separates concerns and optimizes for different use cases:

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA INGESTION PIPELINE                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PLANE 1: CANONICAL DATA (pokeapi_resources)                │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  api-data    │  │    ditto      │                        │
│  │  (baseline)  │  │  (complete)   │                        │
│  └──────┬───────┘  └──────┬───────┘                        │
│         │                  │                                 │
│         └────────┬─────────┘                                 │
│                  ▼                                            │
│         pokeapi_resources                                     │
│         (JSONB canonical store)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PLANE 2: PROJECTION DATA (pokepedia_pokemon)               │
│                                                              │
│         build-pokepedia-projections.ts                       │
│                  │                                           │
│                  ▼                                           │
│         pokepedia_pokemon                                    │
│         (Fast query tables for UI)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PLANE 3: MEDIA ASSETS (Storage + pokepedia_assets)          │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   sprites    │  │    cries     │                        │
│  │  (mirror)    │  │  (mirror)    │                        │
│  └──────┬───────┘  └──────┬───────┘                        │
│         │                  │                                 │
│         ▼                  ▼                                 │
│  pokedex-sprites      pokedex-cries                          │
│  (Supabase Storage)   (Supabase Storage)                      │
│         │                  │                                 │
│         └────────┬─────────┘                                 │
│                  ▼                                            │
│         pokepedia_assets                                      │
│         (Metadata tracking)                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Patterns

#### Pattern 1: Baseline + Comprehensive (Complementary)

**api-data** and **ditto** work together harmoniously:

1. **api-data** provides fast baseline:
   - Import 1,350+ Pokemon quickly
   - Get schema for validation
   - Enable development/testing immediately

2. **ditto** provides comprehensive coverage:
   - Completes all endpoints
   - Fills gaps in api-data
   - Provides complete dataset

3. **Idempotent Upserts:**
   - Both import to same table (`pokeapi_resources`)
   - Conflict resolution: `(resource_type, resource_key)`
   - No data loss or duplication
   - Order doesn't matter

**Benefits:**
- Fast initial development (api-data)
- Complete production data (ditto)
- No conflicts (idempotent design)

#### Pattern 2: Canonical → Projection (Extraction)

**pokeapi_resources** feeds **pokepedia_pokemon**:

1. **Canonical Store:**
   - Complete JSONB data
   - All fields preserved
   - Flexible schema

2. **Projection Extraction:**
   - Extracts commonly queried fields
   - Optimizes for UI queries
   - Creates indexes for performance

3. **Path Mapping:**
   - Converts external URLs to Storage paths
   - Maps sprites: `https://raw.githubusercontent.com/...` → `sprites/pokemon/...`
   - Maps cries: `https://raw.githubusercontent.com/...` → `cries/pokemon/...`

**Benefits:**
- Fast UI queries (projection tables)
- Complete data available (canonical store)
- Optimized indexes (projection tables)

#### Pattern 3: Media Mirroring (Independent but Coordinated)

**sprites** and **cries** mirror independently:

1. **Parallel Execution:**
   - Can run simultaneously
   - No dependencies between them
   - Independent error handling

2. **Path Coordination:**
   - Projections reference Storage paths
   - Paths must match between mirroring and projections
   - Deterministic path generation

3. **Metadata Tracking:**
   - Both record in `pokepedia_assets`
   - Different `asset_kind` values (`'sprite'` vs `'cry'`)
   - Same conflict resolution (`bucket,path`)

**Benefits:**
- Parallel processing (faster)
- Independent error handling
- Coordinated paths (consistent)

### 2.3 Orchestration Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

Step 1: Start Local PokeAPI
   └─► tools/pokeapi-local (docker compose up)

Step 2: Clone Data (Parallel Options)
   ├─► Option A: api-data import (fast baseline)
   │   └─► scripts/import-api-data.ts
   │
   └─► Option B: ditto clone (comprehensive)
       └─► tools/ditto (poetry run ditto clone)
           └─► scripts/import-ditto-data.ts

Step 3: Build Projections (Depends on Step 2)
   └─► scripts/build-pokepedia-projections.ts
       └─► Requires: pokeapi_resources populated

Step 4: Mirror Media Assets (Parallel, Depends on Step 3)
   ├─► Sprites: scripts/mirror-sprites-to-storage.ts
   │   └─► Requires: pokepedia_pokemon sprite paths
   │
   └─► Cries: scripts/mirror-cries-to-storage.ts (TODO)
       └─► Requires: pokepedia_pokemon cry paths

Step 5: Verify & Monitor
   └─► scripts/verify-projections.ts
```

**Key Dependencies:**
- Projections depend on canonical data
- Media mirroring can reference projection paths
- All steps are resumable (idempotent)

### 2.4 Error Handling & Resumability

**Idempotency Strategies:**

1. **Canonical Data:**
   - Unique constraint: `(resource_type, resource_key)`
   - Upsert operations (no duplicates)
   - Resumable: Can restart import without issues

2. **Projections:**
   - Unique constraint: `id` (Pokemon ID)
   - Upsert operations (no duplicates)
   - Resumable: Can rebuild projections anytime

3. **Media Assets:**
   - Unique constraint: `(bucket, path)`
   - Checksum validation (SHA-256)
   - Resumable: Skips existing files (same checksum)

**Error Recovery:**
- Failed batches: Log and continue
- Network errors: Retry with exponential backoff
- Storage errors: Skip and retry later
- Progress tracking: Monitor queue depth

---

## Part 3: Performance & Scalability Analysis

### 3.1 Current Performance Characteristics

#### Data Import Performance

**Current Implementation:**
- Batch size: 100 rows
- Method: Supabase client `.upsert()`
- JSONB parsing: Server-side (75% of time)

**Research Findings:**
- Optimal batch size: 500-1000 rows
- `jsonb_populate_recordset`: Supabase's own method (fastest)
- JSONB parsing overhead: Unavoidable (75% of insert time)
- TOAST storage: Performance degradation for values >2KB

**Recommendations:**
- Increase batch size to 500-1000 rows
- Consider `jsonb_populate_recordset` for very large imports
- Accept JSONB parsing overhead (unavoidable)
- Monitor TOAST usage (large JSONB values)

#### Storage Upload Performance

**Current Implementation:**
- Batch size: 50 files
- Method: Standard uploads
- Rate limit: 250 operations/minute (default)

**Research Findings:**
- Resumable uploads (TUS): Recommended for files >6MB
- Direct storage hostname: `project-ref.storage.supabase.co` (faster)
- CDN caching: 3x cheaper egress
- Batch size: 100-200 optimal for storage

**Recommendations:**
- Implement resumable uploads (TUS) for reliability
- Use direct storage hostname for large uploads
- Increase batch size to 100-200 files
- Implement rate limiting (250 ops/min)
- Enable CDN caching (automatic)

### 3.2 Scalability Considerations

#### Database Scalability

**Current Scale:**
- Pokemon: ~1,350 imported (partial)
- Target: ~1,025 Pokemon + all endpoints
- JSONB size: Variable (typically <2KB per resource)

**Projected Scale:**
- `pokeapi_resources`: ~14,000+ rows (all endpoints)
- `pokepedia_pokemon`: ~1,025 rows
- `pokepedia_assets`: ~61,000 rows (sprites + cries)

**Optimization Strategies:**
- GIN indexes on JSONB fields (already implemented)
- Projection tables for fast queries (already implemented)
- Partitioning: Not needed at current scale
- Archiving: Consider for old data versions

#### Storage Scalability

**Current Scale:**
- Sprites: 59,031 files (not yet uploaded)
- Cries: 1,951 files (not yet uploaded)
- Total: ~61,000 files

**Projected Storage:**
- Sprite sizes: ~50KB average (PNG), ~200KB (GIF)
- Cry sizes: ~50KB average (OGG)
- Total storage: ~5-10GB estimated

**Optimization Strategies:**
- CDN caching: Automatic (Supabase Storage)
- Compression: Consider WebP for sprites (future)
- Lazy loading: Load sprites on demand
- Sprite atlasing: Consider for performance (future)

### 3.3 Query Performance

#### Projection Table Queries

**Optimized Queries:**
```sql
-- Fast: Uses indexes
SELECT * FROM pokepedia_pokemon 
WHERE type_primary = 'fire' 
ORDER BY total_base_stat DESC 
LIMIT 20;

-- Fast: Uses GIN index
SELECT * FROM pokepedia_pokemon 
WHERE types @> '["fire", "flying"]'::jsonb;

-- Fast: Uses generation index
SELECT * FROM pokepedia_pokemon 
WHERE generation = 1 
ORDER BY "order" ASC;
```

**Canonical Table Queries:**
```sql
-- Slower: JSONB path queries
SELECT data->'types' FROM pokeapi_resources 
WHERE resource_type = 'pokemon' AND resource_key = '25';

-- Use projection tables for UI queries
-- Use canonical table for complete data access
```

**Recommendations:**
- Use projection tables for UI queries (fast)
- Use canonical table for complete data (flexible)
- Index optimization: Already implemented (good)

---

## Part 4: Comprehensive Implementation Plan

### 4.1 Phase 1: Complete Current Pipeline (Immediate)

#### Step 1.1: Complete Ditto Clone
**Status:** ⏳ In Progress (~0.73% complete)

**Actions:**
1. Monitor ditto clone progress
2. Wait for completion (~48 endpoints)
3. Verify data structure: `tools/ditto/data/api/v2/`

**Estimated Time:** 2-4 hours (depending on clone speed)

**Success Criteria:**
- All 48 endpoints cloned
- Data structure verified
- No errors in clone process

---

#### Step 1.2: Import Complete Ditto Data
**Status:** ⏳ Pending (waiting for clone completion)

**Actions:**
1. Run full import: `pnpm tsx scripts/import-ditto-data.ts`
2. Verify row counts match expected totals
3. Check for import errors

**Script:** `scripts/import-ditto-data.ts`

**Optimization:**
- Increase batch size from 100 to 500-1000 rows
- Monitor performance and adjust

**Estimated Time:** 30-60 minutes (depending on data volume)

**Success Criteria:**
- All endpoints imported to `pokeapi_resources`
- Row counts verified
- No import errors

---

#### Step 1.3: Build Complete Projections
**Status:** ⏳ Partial (1,000 Pokemon built, need all)

**Actions:**
1. Run full projection build: `pnpm tsx scripts/build-pokepedia-projections.ts`
2. Verify all Pokemon projected
3. Check sprite/cry path extraction

**Script:** `scripts/build-pokepedia-projections.ts`

**Estimated Time:** 5-10 minutes

**Success Criteria:**
- All ~1,025 Pokemon in `pokepedia_pokemon`
- Sprite paths extracted correctly
- Cry paths extracted correctly
- All new fields populated (types, stats, abilities, etc.)

---

#### Step 1.4: Mirror All Sprites to Storage
**Status:** ⏳ Pending (dry run completed)

**Actions:**
1. Create storage bucket: `pokedex-sprites` (if not exists)
2. Run full mirror: `pnpm tsx scripts/mirror-sprites-to-storage.ts`
3. Monitor upload progress
4. Verify metadata in `pokepedia_assets`

**Script:** `scripts/mirror-sprites-to-storage.ts`

**Optimization:**
- Increase batch size from 50 to 100-200 files
- Implement resumable uploads (TUS) for reliability
- Add rate limiting (250 ops/min)
- Use direct storage hostname

**Estimated Time:** 2-4 hours (59K+ files)

**Success Criteria:**
- All sprites uploaded to Storage
- Metadata recorded in `pokepedia_assets`
- Public URLs accessible
- Checksums verified

---

#### Step 1.5: Create Cries Mirroring Script
**Status:** ❌ **NOT CREATED** (implementation needed)

**Actions:**
1. Create script: `scripts/mirror-cries-to-storage.ts`
2. Model after `mirror-sprites-to-storage.ts`
3. Handle `cries/pokemon/latest/` and `cries/pokemon/legacy/` directories
4. Set `asset_kind` to `'cry'`
5. Use `pokedex-cries` bucket

**Script Structure:**
```typescript
// Similar to mirror-sprites-to-storage.ts but:
// - Source: resources/cries/cries/pokemon/
// - Bucket: pokedex-cries
// - Asset kind: 'cry'
// - Content type: 'audio/ogg'
```

**Estimated Time:** 2-3 hours (development + testing)

**Success Criteria:**
- Script created and tested
- Handles latest and legacy cries
- Records metadata correctly
- Idempotent (checksum-based)

---

#### Step 1.6: Mirror Cries to Storage
**Status:** ⏳ Pending (waiting for script creation)

**Actions:**
1. Create storage bucket: `pokedex-cries` (if not exists)
2. Run mirror script: `pnpm tsx scripts/mirror-cries-to-storage.ts`
3. Monitor upload progress
4. Verify metadata in `pokepedia_assets`

**Estimated Time:** 30-60 minutes (1,951 files)

**Success Criteria:**
- All cries uploaded to Storage
- Metadata recorded in `pokepedia_assets`
- Public URLs accessible
- Paths match projection expectations

---

### 4.2 Phase 2: Optimization (Short-term)

#### Step 2.1: Optimize Batch Sizes

**Data Import Optimization:**
- Current: 100 rows per batch
- Target: 500-1000 rows per batch
- Scripts to update:
  - `scripts/import-api-data.ts`
  - `scripts/import-ditto-data.ts`

**Storage Upload Optimization:**
- Current: 50 files per batch
- Target: 100-200 files per batch
- Scripts to update:
  - `scripts/mirror-sprites-to-storage.ts`
  - `scripts/mirror-cries-to-storage.ts` (when created)

**Estimated Time:** 1-2 hours

---

#### Step 2.2: Implement Resumable Uploads

**Actions:**
1. Install TUS client library
2. Update sprite mirroring script to use TUS
3. Update cries mirroring script to use TUS
4. Add progress tracking

**Benefits:**
- Reliability for large uploads
- Resume capability on network interruption
- Better error handling

**Estimated Time:** 4-6 hours

---

#### Step 2.3: Add Parallel Processing

**Actions:**
1. Implement parallel workers for media mirroring
2. Sprite and cry mirroring can run simultaneously
3. Use worker pools for concurrent uploads

**Benefits:**
- Faster media mirroring
- Better resource utilization
- Reduced total time

**Estimated Time:** 3-4 hours

---

#### Step 2.4: Implement Progress Tracking

**Actions:**
1. Add progress logging to all scripts
2. Create monitoring dashboard
3. Track queue depth and sync progress

**Metrics to Track:**
- Import progress (rows processed/total)
- Upload progress (files uploaded/total)
- Error rates
- Performance metrics (rows/sec, files/sec)

**Estimated Time:** 2-3 hours

---

### 4.3 Phase 3: Orchestration (Medium-term)

#### Step 3.1: Create Unified Orchestration Script

**Actions:**
1. Create script: `scripts/orchestrate-pokepedia-sync.ts`
2. Coordinate all import/mirror steps
3. Handle dependencies and sequencing
4. Implement error handling and retries

**Script Structure:**
```typescript
async function orchestrateSync() {
  // Step 1: Import data (api-data or ditto)
  await importData()
  
  // Step 2: Build projections
  await buildProjections()
  
  // Step 3: Mirror media (parallel)
  await Promise.all([
    mirrorSprites(),
    mirrorCries()
  ])
  
  // Step 4: Verify
  await verifySync()
}
```

**Estimated Time:** 4-6 hours

---

#### Step 3.2: Add Error Handling & Retry Logic

**Actions:**
1. Implement exponential backoff for retries
2. Add error logging and alerting
3. Create failure recovery procedures
4. Add idempotency checks

**Estimated Time:** 3-4 hours

---

#### Step 3.3: Implement Resumability

**Actions:**
1. Add checkpoint system for long operations
2. Track progress in database
3. Resume from last checkpoint on failure
4. Clean up checkpoints on success

**Estimated Time:** 4-5 hours

---

#### Step 3.4: Create Monitoring Dashboard

**Actions:**
1. Create admin page for sync monitoring
2. Display queue depth, progress, errors
3. Add manual trigger buttons
4. Show sync history

**Estimated Time:** 6-8 hours

---

### 4.4 Phase 4: Incremental Sync (Long-term)

#### Step 4.1: Implement Queue-Based Incremental Sync

**Actions:**
1. Use Supabase Queues (pgmq) for delta sync
2. Create Edge Functions for queue processing
3. Implement ETag caching for API calls
4. Schedule periodic sync jobs

**Estimated Time:** 8-10 hours

---

#### Step 4.2: Add Delta Detection for Media

**Actions:**
1. Compare local repo checksums with Storage
2. Only upload changed files
3. Track last sync timestamp
4. Implement efficient diff algorithm

**Estimated Time:** 4-6 hours

---

#### Step 4.3: Schedule Periodic Updates

**Actions:**
1. Set up cron jobs for incremental sync
2. Configure update frequency (daily/weekly)
3. Add notification system for updates
4. Monitor sync health

**Estimated Time:** 2-3 hours

---

## Part 5: Implementation Checklist

### Immediate Actions (Phase 1)

- [ ] **1.1** Monitor ditto clone completion
- [ ] **1.2** Import complete ditto data to `pokeapi_resources`
- [ ] **1.3** Build complete projections (`pokepedia_pokemon`)
- [ ] **1.4** Mirror all sprites to Supabase Storage
- [ ] **1.5** Create cries mirroring script (`mirror-cries-to-storage.ts`)
- [ ] **1.6** Mirror cries to Supabase Storage
- [ ] **1.7** Verify complete sync (all data, sprites, cries in Supabase)

### Short-term Optimizations (Phase 2)

- [ ] **2.1** Optimize batch sizes (500-1000 for data, 100-200 for storage)
- [ ] **2.2** Implement resumable uploads (TUS) for media
- [ ] **2.3** Add parallel processing for media mirroring
- [ ] **2.4** Implement progress tracking and monitoring

### Medium-term Orchestration (Phase 3)

- [ ] **3.1** Create unified orchestration script
- [ ] **3.2** Add error handling and retry logic
- [ ] **3.3** Implement resumability for long operations
- [ ] **3.4** Create monitoring dashboard

### Long-term Incremental Sync (Phase 4)

- [ ] **4.1** Implement queue-based incremental sync
- [ ] **4.2** Add delta detection for media assets
- [ ] **4.3** Schedule periodic updates

---

## Part 6: Key Recommendations

### Immediate Priorities

1. **Complete ditto clone** - Wait for current clone to finish
2. **Create cries mirroring script** - Critical missing piece
3. **Optimize batch sizes** - Quick performance win
4. **Implement resumable uploads** - Reliability for media

### Architecture Decisions

1. **Three-plane architecture** - Keep as designed (optimal)
2. **Idempotent operations** - Already implemented (good)
3. **Projection tables** - Already implemented (good)
4. **Storage mirroring** - Correct approach (good)

### Performance Optimizations

1. **Batch sizes** - Increase to 500-1000 (data), 100-200 (storage)
2. **Resumable uploads** - Implement TUS for media
3. **Parallel processing** - Add for media mirroring
4. **CDN caching** - Already enabled (good)

### Monitoring & Observability

1. **Progress tracking** - Add to all scripts
2. **Error logging** - Implement comprehensive logging
3. **Monitoring dashboard** - Create admin interface
4. **Alerting** - Set up for sync failures

---

## Conclusion

The Poképedia sync infrastructure consists of five core tools and resources that work together harmoniously through a three-plane architecture. The current implementation is solid but needs completion (cries integration) and optimization (batch sizes, resumable uploads). The comprehensive implementation plan provides a clear path forward, prioritizing immediate completion of the pipeline, followed by optimizations and long-term incremental sync capabilities.

**Next Steps:**
1. Complete Phase 1 (immediate pipeline completion)
2. Review and approve implementation plan
3. Begin execution with highest priority items
4. Monitor progress and adjust as needed

---

*End of Document*
