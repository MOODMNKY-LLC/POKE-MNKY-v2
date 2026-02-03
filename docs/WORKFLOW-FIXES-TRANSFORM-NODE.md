# Workflow Fixes - Transform Node Issue

## Problem

The "Transform to Supabase" node is failing because:
1. **"Get Current Season"** uses `getAll` operation which returns an **array**
2. The transform function tries to access `seasonData?.id` directly, but `seasonData` is an array `[{id: "...", ...}]`
3. It should access `seasonData?.[0]?.id` to get the first (and only) season

## Fix

### Update Transform Function Code

1. Open workflow: https://aab-n8n.moodmnky.com/workflow/AeazX7cYBLeNmRBJ
2. Click on **"Transform to Supabase"** node
3. Replace the function code with this corrected version:

```javascript
// Transform Notion page data to Supabase draft_pool format
// $input.item.json contains the Notion page data
// $('Get Current Season').item.json contains the season data (as an array)

const page = $input.item.json;
const seasonDataArray = $('Get Current Season').item.json;

// Get Current Season returns an array (getAll with limit 1)
// Extract the first item from the array
const seasonData = Array.isArray(seasonDataArray) ? seasonDataArray[0] : seasonDataArray;

// Extract properties from Notion page
const name = page.properties?.Name?.title?.[0]?.plain_text || '';
const pointValue = page.properties?.['Point Value']?.number || null;
const status = page.properties?.Status?.select?.name?.toLowerCase() || 'available';
const teraCaptainEligible = page.properties?.['Tera Captain Eligible']?.checkbox || false;
const pokemonId = page.properties?.['Pokemon ID (PokeAPI)']?.number || null;
const bannedReason = page.properties?.Notes?.rich_text?.[0]?.plain_text || null;

// Map status to enum
const statusMap = {
  'available': 'available',
  'banned': 'banned',
  'unavailable': 'unavailable',
  'drafted': 'drafted'
};

const mappedStatus = statusMap[status] || 'available';

// Get season ID from Supabase query (handle array response)
const seasonId = seasonData?.id || null;

if (!seasonId) {
  throw new Error('No current season found in database. Please ensure a season exists with is_current = true');
}

if (!name) {
  throw new Error('Pokemon name is required');
}

if (!pointValue || pointValue < 1 || pointValue > 20) {
  throw new Error('Point value must be between 1 and 20');
}

// Return Supabase-ready data
return {
  json: {
    pokemon_name: name,
    point_value: pointValue,
    status: mappedStatus,
    tera_captain_eligible: teraCaptainEligible,
    pokemon_id: pokemonId,
    season_id: seasonId,
    banned_reason: bannedReason || null,
    // Include Notion page ID for reference
    notion_page_id: page.id,
  }
};
```

### Key Changes

1. **Line 5**: Changed `seasonData` to `seasonDataArray` to clarify it's an array
2. **Line 8**: Added array handling: `const seasonData = Array.isArray(seasonDataArray) ? seasonDataArray[0] : seasonDataArray;`
3. **Line 32**: Now accesses `seasonData?.id` correctly (after extracting from array)

## Testing

After updating:

1. **Test with a Pokémon where "Added to Draft Board" is `true`**:
   - The filter will only pass items where the checkbox is checked
   - If you test with `false`, nothing will pass through (this is correct behavior)

2. **Check execution logs**:
   - The transform node should now successfully extract the season ID
   - The upsert node should receive the correct data

## Additional Notes

- The filter is working correctly - it filters OUT items where "Added to Draft Board" is `false`
- Make sure you're testing with a row where the checkbox is actually checked (`true`)
- The "Get Page Data" node should use `get` operation (not `getAll`) with `pageId: "={{ $json.id }}"`
