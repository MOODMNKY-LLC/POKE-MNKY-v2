# Poképedia Data Import Guide

This guide covers the complete workflow for importing PokéAPI data into Supabase using the new ingestion scripts.

## Overview

The Poképedia ingestion pipeline supports two data sources:
1. **api-data** (`resources/api-data`) - Fast baseline dataset with JSON Schema
2. **ditto** (`tools/ditto/data`) - Comprehensive REST v2 corpus clone

Both sources import into the same `pokeapi_resources` table (canonical JSONB storage).

## Prerequisites

1. **Supabase Setup**
   - Database tables created (see `supabase/migrations/20260113010000_create_pokepedia_queue_system.sql`)
   - Environment variables set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

2. **Data Sources**
   - **api-data**: Already cloned in `resources/api-data`
   - **ditto**: Run clone first (see below)
   - **sprites**: Already cloned in `resources/sprites`

## Step-by-Step Workflow

### Step 1: Clone Data with Ditto (Optional but Recommended)

If you want comprehensive data coverage:

```bash
# Ensure local PokeAPI is running
cd tools/pokeapi-local
docker compose up -d

# Run ditto clone
cd ../ditto
poetry install  # One-time setup
poetry run ditto clone --src-url http://localhost/api/v2 --dest-dir ./data
```

**Note**: This can take a while (30+ minutes). You can proceed with api-data import while ditto runs.

### Step 2: Import Baseline Data (api-data)

Fast baseline import:

```bash
# Import all endpoints
pnpm tsx scripts/import-api-data.ts

# Or import specific endpoint
pnpm tsx scripts/import-api-data.ts --endpoint=pokemon

# Or import with limit for testing
pnpm tsx scripts/import-api-data.ts --endpoint=pokemon --limit=100
```

**Benefits**:
- Fast (no network calls)
- Complete structured dataset
- JSON Schema available for validation

### Step 3: Import Comprehensive Data (ditto)

After ditto clone completes:

```bash
# Import all endpoints
pnpm tsx scripts/import-ditto-data.ts

# Or import specific endpoint
pnpm tsx scripts/import-ditto-data.ts --endpoint=pokemon

# Or import with limit for testing
pnpm tsx scripts/import-ditto-data.ts --endpoint=pokemon --limit=100
```

**Note**: Upserts will update existing records from api-data import.

### Step 4: Build Projection Tables

Extract fast query tables from JSONB:

```bash
# Build all Pokemon projections
pnpm tsx scripts/build-pokepedia-projections.ts

# Or build with limit for testing
pnpm tsx scripts/build-pokepedia-projections.ts --limit=100
```

**Result**: `pokepedia_pokemon` table populated with:
- id, name, species_name
- height, weight, base_experience
- sprite paths (front_default, official_artwork)

### Step 5: Mirror Sprites to Storage

Upload sprites to Supabase Storage:

```bash
# Upload all sprites
pnpm tsx scripts/mirror-sprites-to-storage.ts

# Dry run to preview
pnpm tsx scripts/mirror-sprites-to-storage.ts --dry-run

# Or upload with limit for testing
pnpm tsx scripts/mirror-sprites-to-storage.ts --limit=100
```

**Result**:
- Sprites uploaded to `pokedex-sprites` bucket
- Metadata recorded in `pokepedia_assets` table
- Public CDN URLs available

## Script Reference

### `import-api-data.ts`

Imports static JSON from `resources/api-data/data/api/v2/`.

**Options**:
- `--endpoint=<name>` - Import specific endpoint only
- `--limit=<number>` - Limit number of files per endpoint

**Example**:
```bash
pnpm tsx scripts/import-api-data.ts --endpoint=pokemon --limit=50
```

### `import-ditto-data.ts`

Imports cloned data from `tools/ditto/data/`.

**Options**:
- `--endpoint=<name>` - Import specific endpoint only
- `--limit=<number>` - Limit number of files per endpoint

**Example**:
```bash
pnpm tsx scripts/import-ditto-data.ts --endpoint=moves --limit=100
```

### `build-pokepedia-projections.ts`

Builds fast query tables from `pokeapi_resources` JSONB.

**Options**:
- `--limit=<number>` - Limit number of Pokemon to process

**Example**:
```bash
pnpm tsx scripts/build-pokepedia-projections.ts --limit=50
```

### `mirror-sprites-to-storage.ts`

Uploads sprites from `resources/sprites` to Supabase Storage.

**Options**:
- `--dry-run` - Preview without uploading
- `--limit=<number>` - Limit number of files to upload

**Example**:
```bash
pnpm tsx scripts/mirror-sprites-to-storage.ts --dry-run --limit=10
```

## Data Flow

```
api-data (baseline) ──┐
                      ├──> pokeapi_resources (JSONB)
ditto (comprehensive) ─┘
                              │
                              ├──> pokepedia_pokemon (projection)
                              │
                              └──> pokepedia_assets (sprite metadata)
```

## Troubleshooting

### Import Errors

**Error**: "Missing Supabase credentials"
- **Solution**: Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

**Error**: "Table not found"
- **Solution**: Run migrations: `supabase db push`

**Error**: "Ditto data directory not found"
- **Solution**: Run ditto clone first (see Step 1)

### Performance Tips

1. **Batch Processing**: Scripts process in batches (100 items) for performance
2. **Limit Testing**: Use `--limit` flag for testing before full import
3. **Dry Run**: Use `--dry-run` for sprite mirroring to preview

### Next Steps

After successful import:

1. **Query Data**: Use `pokepedia_pokemon` for fast UI queries
2. **Access Sprites**: Use Supabase Storage CDN URLs
3. **Incremental Sync**: Set up queue-based sync for updates (future)

## Related Documentation

- `README.md` - Project overview and setup
- `PROJECT-ROADMAP.md` - Development roadmap
- `temp/pokepedia-infra.md` - Architecture details
- `tools/ditto/DITTO-FIX.md` - Ditto troubleshooting
