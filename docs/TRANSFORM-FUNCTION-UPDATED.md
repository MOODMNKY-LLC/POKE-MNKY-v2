# Transform Function - Updated Version (Handles Multiple Current Seasons)

## Problem

The "Get Current Season" node may return multiple seasons if more than one is marked `is_current = true`. The transform function needs to:
1. Handle array responses
2. Pick the most recent season (by `created_at DESC`)
3. Validate the season ID is not a placeholder UUID

## Updated Transform Function Code

Use this code in the **"Transform to Supabase"** Function node:

```javascript
// n8n Function node
// Pull data explicitly from upstream nodes (do NOT rely on $input)
// Node names MUST match exactly: "Get Page Data" and "Get Current Season"

function firstItem(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  if (value.results && Array.isArray(value.results)) return value.results[0] ?? null;
  return value;
}

function getTitle(prop) {
  const arr = prop?.title;
  return Array.isArray(arr) && arr.length ? (arr[0]?.plain_text ?? null) : null;
}

function getNumber(prop) {
  return typeof prop?.number === 'number' ? prop.number : null;
}

function getSelectName(prop) {
  return prop?.select?.name ?? null;
}

function getCheckbox(prop) {
  return typeof prop?.checkbox === 'boolean' ? prop.checkbox : false;
}

function getRichText(prop) {
  const arr = prop?.rich_text;
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr.map((t) => t?.plain_text).filter(Boolean).join('');
}

// --- Get Notion page from "Get Page Data" ---
const rawPage = $('Get Page Data').item.json;
const page = firstItem(rawPage);

if (!page?.properties) {
  throw new Error(
    `Get Page Data did not return a Notion page with properties. Got: ${JSON.stringify(rawPage).slice(0, 500)}`
  );
}

const props = page.properties;

// --- Get season from "Get Current Season" ---
const rawSeason = $('Get Current Season').item.json;

// Handle multiple seasons - pick most recent
let season;
if (Array.isArray(rawSeason)) {
  if (rawSeason.length === 0) {
    throw new Error('No current season found in database. Please ensure a season exists with is_current = true');
  }
  
  // Sort by created_at DESC and pick first (most recent)
  const sorted = rawSeason.sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA; // DESC order
  });
  
  season = sorted[0];
  
  // Warn if multiple current seasons found
  if (rawSeason.length > 1) {
    console.warn(`⚠️ Multiple current seasons found (${rawSeason.length}). Using most recent: ${season.name} (${season.id})`);
  }
} else {
  season = rawSeason;
}

if (!season) {
  throw new Error('No current season found in database. Please ensure a season exists with is_current = true');
}

const season_id = season?.id ?? null;

// Validate season ID is not a placeholder UUID
const PLACEHOLDER_UUID = '00000000-0000-0000-0000-000000000001';
if (season_id === PLACEHOLDER_UUID) {
  throw new Error(
    `Invalid season ID: Placeholder UUID detected (${PLACEHOLDER_UUID}). ` +
    `Please ensure only one season is marked as current, and it has a valid UUID. ` +
    `Found season: ${season.name || 'Unknown'}`
  );
}

// --- Extract required fields ---
const pokemon_name = getTitle(props['Name']);
const point_value = getNumber(props['Point Value']);
const status_raw = getSelectName(props['Status']);
const tera_captain_eligible = getCheckbox(props['Tera Captain Eligible']);
const pokemon_id = getNumber(props['Pokemon ID (PokeAPI)']);

// optional (not in payload unless you add column)
const notes = getRichText(props['Notes']);

// --- Validation ---
if (!pokemon_name) {
  throw new Error('Pokemon name is required');
}

if (!point_value || point_value < 1 || point_value > 20) {
  throw new Error('Point value must be between 1 and 20');
}

if (!season_id) {
  throw new Error('Season ID is required. Please ensure a season exists with is_current = true');
}

// --- Supabase payload ---
const payload = {
  pokemon_name,
  point_value,
  status: status_raw ? String(status_raw).toLowerCase() : null,
  tera_captain_eligible,
  pokemon_id,
  season_id,
  banned_reason: null,
  // notes, // uncomment if you have a notes column in Supabase
};

return [{ json: payload }];
```

## Key Changes

1. **Handles Array Response**: Checks if `rawSeason` is an array
2. **Sorts by Created At**: Picks the most recent season (by `created_at DESC`)
3. **Placeholder UUID Validation**: Throws error if season ID is the placeholder UUID
4. **Warning Log**: Logs a warning if multiple current seasons are found
5. **Better Error Messages**: More descriptive errors for debugging

## How to Update

1. Open n8n workflow: https://aab-n8n.moodmnky.com/workflow/AeazX7cYBLeNmRBJ
2. Click **"Transform to Supabase"** Function node
3. Replace the entire `functionCode` with the code above
4. **Save**

## Still Recommended: Fix Database

While this function handles multiple seasons gracefully, **you should still fix the database** to ensure only one season is marked as current:

1. Run SQL in production Supabase:
   ```sql
   UPDATE seasons SET is_current = false WHERE name = 'Season 5';
   ```

2. Or use the script (if you have production credentials):
   ```bash
   # Update .env.local with production Supabase URL and key
   npx tsx scripts/fix-current-season.ts
   ```

See `docs/FIX-PRODUCTION-CURRENT-SEASON.md` for more details.
