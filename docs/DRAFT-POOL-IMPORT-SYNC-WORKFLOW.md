# Draft Pool Import & Sync Workflow

This document describes the workflow for importing draft pool data from the server agent's JSON format and syncing it to the production database.

## Overview

The draft pool import/sync system provides a two-stage process:

1. **Import Stage**: Upload JSON from server agent → `sheets_draft_pool` (staging table)
2. **Sync Stage**: Sync staging table → `draft_pool` (production table)

This separation allows for validation and review before affecting production data.

---

## Architecture

### Tables

#### `sheets_draft_pool` (Staging Table)
- **Purpose**: Temporary holding area for imported data
- **Source**: Server agent JSON (`draft-pool-generated.json`)
- **Fields**:
  - `pokemon_name` - Pokemon name from Google Sheets
  - `point_value` - Draft point value (1-20)
  - `is_available` - Boolean: true if draftable, false if banned
  - `is_tera_banned` - Boolean: true if cannot be Tera Captain
  - `sheet_name` - Source sheet name (default: "Draft Board")
  - `pokemon_id` - Linked to `pokemon_cache` (can be NULL)
  - `generation` - Pokemon generation (can be NULL)

#### `draft_pool` (Production Table)
- **Purpose**: Live draft pool data used by the application
- **Source**: Synced from `sheets_draft_pool`
- **Fields**:
  - `pokemon_name` - Pokemon name
  - `point_value` - Draft point value
  - `status` - Enum: 'available', 'banned', 'unavailable', 'drafted'
  - `tera_captain_eligible` - Boolean: false if Tera banned
  - `season_id` - UUID of the season
  - `pokemon_id` - Linked to `pokemon_cache`
  - `drafted_by_team_id` - Set when Pokemon is drafted

### Status Mapping

| Server Agent Status | Staging (`is_available`) | Production (`status`) | `tera_captain_eligible` |
|---------------------|-------------------------|----------------------|-------------------------|
| `available` | `true` | `available` | `true` |
| `banned` | `false` | `banned` | `true` |
| `tera_banned` | `true` | `available` | `false` |
| `drafted` | `false` | `drafted` | `true` (preserved) |

**Key Point**: Tera banned Pokemon are still draftable (`status = available`) but cannot be Tera Captains (`tera_captain_eligible = false`).

---

## Workflow Steps

### Step 1: Generate JSON from Server Agent

The server agent generates `draft-pool-generated.json` from Google Sheets:

```bash
# On server (if needed)
cd /path/to/app-agent-handoff
node scripts/generate-draft-pool.js
```

This creates `data/draft-pool-generated.json` with the following structure:

```json
{
  "config": {
    "draftBudget": 120,
    "teraBudget": 15,
    ...
  },
  "metadata": {
    "totalPokemon": 778,
    "availableCount": 764,
    "bannedCount": 0,
    "teraBannedCount": 14,
    "draftedCount": 0
  },
  "pokemon": {
    "available": [...],
    "banned": [...],
    "teraBanned": [...],
    "drafted": [...]
  },
  "bannedList": [...],
  "teraBannedList": [...]
}
```

### Step 2: Import to Staging

1. Navigate to `/admin` page
2. Open "Draft Pool Import & Sync" section
3. Go to **Import** tab
4. Upload `draft-pool-generated.json` file (drag-drop or click to select)
5. Click **Import to Staging**
6. Review import results:
   - Imported count
   - Tera banned count
   - Errors (if any)

**API Endpoint**: `POST /api/admin/draft-pool/import`

**Request Body**:
```json
{
  "draftPool": { /* ServerAgentDraftPool JSON */ },
  "sheetName": "Draft Board" // optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Draft pool imported successfully to staging table",
  "result": {
    "success": true,
    "imported": 778,
    "updated": 0,
    "errors": [],
    "warnings": [],
    "teraBannedCount": 14,
    "totalProcessed": 778
  }
}
```

### Step 3: Review Staging Data

1. Go to **Staging Preview** tab
2. Review statistics:
   - Total Pokemon
   - Available count
   - Banned count
   - Tera banned count
3. Verify data looks correct before syncing

### Step 4: Sync to Production

1. Go to **Sync to Production** tab
2. Select target **Season** from dropdown
3. (Optional) Check **Dry run** to preview changes without applying
4. Click **Sync to Production**
5. Review sync results:
   - Synced count
   - Skipped count (drafted Pokemon preserved)
   - Conflicts (if any)
   - Unmatched Pokemon names (if any)

**API Endpoint**: `POST /api/admin/draft-pool/sync`

**Request Body**:
```json
{
  "seasonId": "uuid-of-season",
  "sheetName": "Draft Board", // optional
  "dryRun": false // optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Draft pool synced successfully from staging to production",
  "result": {
    "success": true,
    "synced": 764,
    "skipped": 0,
    "conflicts": [],
    "warnings": [],
    "unmatchedNames": [],
    "totalProcessed": 778
  }
}
```

---

## Conflict Resolution

### Drafted Pokemon Protection

When syncing, if a Pokemon already exists in `draft_pool` with `status = 'drafted'`, it will be **skipped** to preserve draft data:

```json
{
  "conflicts": [
    {
      "pokemon": "Pikachu",
      "reason": "Already drafted - preserving existing draft data"
    }
  ]
}
```

### Unmatched Pokemon Names

If a Pokemon name from staging cannot be matched to `pokemon_cache`, it will still be synced but `pokemon_id` will be `NULL`:

```json
{
  "unmatchedNames": [
    "Flutter Mane",
    "Gouging Fire"
  ],
  "warnings": [
    {
      "pokemon": "Flutter Mane",
      "message": "Could not match to pokemon_cache - pokemon_id will be NULL"
    }
  ]
}
```

**Note**: The sync service uses fuzzy matching to handle name variations (e.g., "Rotom Wash" vs "rotom-wash").

---

## Error Handling

### Import Errors

- **Invalid JSON**: Returns 400 with structure validation error
- **Missing fields**: Returns 400 with details about expected structure
- **Database errors**: Returns 500 with error message

### Sync Errors

- **Missing seasonId**: Returns 400
- **Invalid seasonId**: Returns 400 if season doesn't exist
- **Database errors**: Returns 500 with error message

### Common Issues

1. **Pokemon names don't match**: Use fuzzy matching (handled automatically)
2. **Tera banned Pokemon showing as available**: This is correct - they're draftable but not Tera Captain eligible
3. **Drafted Pokemon being overwritten**: Drafted Pokemon are protected and skipped during sync

---

## API Reference

### POST `/api/admin/draft-pool/import`

Import server agent JSON to staging table.

**Authentication**: Required (admin only - TODO: implement RBAC)

**Request**:
```typescript
{
  draftPool: ServerAgentDraftPool,
  sheetName?: string // defaults to "Draft Board"
}
```

**Response**:
```typescript
{
  success: boolean,
  message?: string,
  error?: string,
  result?: ImportResult
}
```

### POST `/api/admin/draft-pool/sync`

Sync staging table to production.

**Authentication**: Required (admin only - TODO: implement RBAC)

**Request**:
```typescript
{
  seasonId: string, // UUID of season
  sheetName?: string, // defaults to "Draft Board"
  dryRun?: boolean // defaults to false
}
```

**Response**:
```typescript
{
  success: boolean,
  message?: string,
  error?: string,
  result?: SyncResult
}
```

---

## Best Practices

1. **Always use dry-run first**: Preview changes before syncing to production
2. **Review staging data**: Check statistics before syncing
3. **Backup before sync**: Consider backing up `draft_pool` table before major syncs
4. **Handle unmatched names**: Review and fix Pokemon name mismatches
5. **Preserve draft data**: Drafted Pokemon are automatically protected

---

## Troubleshooting

### Import fails with "Invalid JSON structure"

Check that the JSON matches the `ServerAgentDraftPool` interface:
- Must have `config`, `metadata`, `pokemon` objects
- `pokemon` must have `available`, `banned`, `teraBanned`, `drafted` arrays
- Must have `bannedList` and `teraBannedList` arrays

### Sync shows many unmatched names

1. Check Pokemon names in staging table match `pokemon_cache.name`
2. Names are case-insensitive but must match after normalization
3. Fuzzy matching handles common variations (spaces, hyphens)

### Tera banned Pokemon showing as available

This is **correct behavior**. Tera banned Pokemon:
- Have `status = 'available'` (draftable)
- Have `tera_captain_eligible = false` (cannot be Tera Captain)

---

## Related Files

- **Import Service**: `lib/draft-pool/import-service.ts`
- **Sync Service**: `lib/draft-pool/sync-service.ts`
- **Admin Component**: `components/admin/draft-pool-import.tsx`
- **API Routes**: 
  - `app/api/admin/draft-pool/import/route.ts`
  - `app/api/admin/draft-pool/sync/route.ts`
- **Migrations**:
  - `supabase/migrations/20260120000000_add_tera_captain_eligible.sql`
  - `supabase/migrations/20260120000001_add_is_tera_banned_to_staging.sql`

---

## Future Enhancements

- [ ] Implement proper RBAC for admin routes
- [ ] Add batch import support (multiple JSON files)
- [ ] Add rollback functionality
- [ ] Add sync history/audit log
- [ ] Add UI for viewing Tera banned Pokemon list
- [ ] Add validation rules (e.g., point value ranges)
