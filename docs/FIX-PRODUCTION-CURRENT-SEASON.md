# Fix Production Supabase - Multiple Current Seasons

## Problem

The n8n workflow is querying **production Supabase**, which has **2 seasons** marked as `is_current = true`:
- Season 5 (ID: `00000000-0000-0000-0000-000000000001`) - placeholder UUID
- Season 6 (ID: `5a786c7f-cba3-471a-ad2d-0ef5d031d5ca`) - real UUID

The n8n query returns both, and the transform function picks the first one (Season 5 with placeholder UUID).

## Solution

### Option 1: Fix Production Database (Recommended)

Run this SQL in **production Supabase** SQL Editor:

```sql
-- Set Season 5 to is_current = false (keep Season 6 as current)
UPDATE seasons 
SET is_current = false 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify only Season 6 is current
SELECT id, name, is_current, created_at 
FROM seasons 
WHERE is_current = true 
ORDER BY created_at DESC;
```

**Expected Result**: Only Season 6 should be marked as current.

### Option 2: Update n8n Query to Sort and Limit

As a safeguard, update the "Get Current Season" node in n8n to:
1. Sort by `created_at DESC` (if supported)
2. Limit to `1`

However, n8n's Supabase node may not support sorting. In that case, **Option 1 is required**.

### Option 3: Update Transform Function to Pick Most Recent

Update the transform function to explicitly pick the most recent season:

```javascript
// In "Transform to Supabase" Function node
// Get season from "Get Current Season" ---
const rawSeason = $('Get Current Season').item.json;

// Handle array response - pick most recent
let season;
if (Array.isArray(rawSeason)) {
  // Sort by created_at DESC and pick first
  const sorted = rawSeason.sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA; // DESC
  });
  season = sorted[0];
} else {
  season = rawSeason;
}

const season_id = season?.id ?? null;

// Validate it's not a placeholder UUID
if (season_id === '00000000-0000-0000-0000-000000000001') {
  throw new Error('Invalid season ID: Placeholder UUID detected. Please ensure only one season is marked as current.');
}
```

## Quick Fix (Production Supabase)

1. Go to: https://supabase.com/dashboard/project/chmrszrwlfeqovwxyrmt/sql/new
2. Run:
   ```sql
   UPDATE seasons SET is_current = false WHERE name = 'Season 5';
   ```
3. Verify:
   ```sql
   SELECT * FROM seasons WHERE is_current = true;
   ```
   Should return only Season 6.

## After Fixing

1. Test the n8n workflow manually
2. Check "Get Current Season" node output - should return only Season 6
3. Check "Transform to Supabase" node output - `season_id` should be `5a786c7f-cba3-471a-ad2d-0ef5d031d5ca`
