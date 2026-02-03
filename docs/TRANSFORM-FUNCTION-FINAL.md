# Transform Function - Final Version (Based on Actual Data Structure)

## Data Structure Analysis

From the actual JSON output, I can see:
- The data is an **array** with one page object: `[{...}]`
- The `Name` property is at: `properties.Name.title[0].plain_text` = "Absol"
- The `Point Value` is at: `properties['Point Value'].number` = 10
- The `Status` is at: `properties.Status.select.name` = "Available"
- The `Tera Captain Eligible` is at: `properties['Tera Captain Eligible'].checkbox` = true

## Updated Transform Function

```javascript
// Transform Notion page data to Supabase draft_pool format
// $input.item.json contains the Notion page data from "Get Page Data"
// $('Get Current Season').item.json contains the season data (as an array)

// Handle array input (n8n might pass the array or the first item)
let pageData = $input.item.json;
if (Array.isArray(pageData)) {
  pageData = pageData[0];
}
const page = pageData;

// Get Current Season returns an array (getAll with limit 1)
const seasonDataArray = $('Get Current Season').item.json;
const seasonData = Array.isArray(seasonDataArray) ? seasonDataArray[0] : seasonDataArray;

// Extract properties from Notion page (using actual structure from JSON)
const name = page.properties?.Name?.title?.[0]?.plain_text || '';
const pointValue = page.properties?.['Point Value']?.number || null;
const statusRaw = page.properties?.Status?.select?.name || 'Available';
const status = statusRaw.toLowerCase();
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

// Get season ID from Supabase query
const seasonId = seasonData?.id || null;

if (!seasonId) {
  throw new Error('No current season found in database. Please ensure a season exists with is_current = true');
}

if (!name || name.trim() === '') {
  throw new Error(`Pokemon name is required. Page ID: ${page.id || 'unknown'}`);
}

if (!pointValue || pointValue < 1 || pointValue > 20) {
  throw new Error(`Point value must be between 1 and 20. Got: ${pointValue}`);
}

// Return Supabase-ready data
return {
  json: {
    pokemon_name: name.trim(),
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

## Key Changes

1. **Array handling**: Checks if input is an array and extracts first item
2. **Correct property paths**: Uses the exact structure from your JSON:
   - `properties.Name.title[0].plain_text` for name
   - `properties['Point Value'].number` for point value
   - `properties.Status.select.name` for status
   - `properties['Tera Captain Eligible'].checkbox` for tera captain
3. **Simplified extraction**: Removed unnecessary fallbacks since we know the exact structure
