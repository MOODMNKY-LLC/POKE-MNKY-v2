# Transform Function - Debug Version

## Problem

The page ID is showing as `00000000-0000-0000-0000-000000000001` (placeholder), which means the data from "Get Page Data" isn't reaching the transform function correctly.

## Debug Version with Logging

This version will help us see what data structure we're actually receiving:

```javascript
// Transform Notion page data to Supabase draft_pool format
// $input.item.json contains the Notion page data from "Get Page Data"
// $('Get Current Season').item.json contains the season data (as an array)

// Debug: Log the entire input structure
console.log('=== TRANSFORM FUNCTION DEBUG ===');
console.log('$input:', JSON.stringify($input, null, 2));
console.log('$input.item:', JSON.stringify($input.item, null, 2));
console.log('$input.item.json:', JSON.stringify($input.item.json, null, 2));
console.log('Type of $input.item.json:', typeof $input.item.json);
console.log('Is Array?', Array.isArray($input.item.json));

// Try multiple ways to get the page data
let page = null;

// Method 1: Direct access
if ($input.item.json && $input.item.json.properties) {
  page = $input.item.json;
  console.log('Method 1: Found page via direct access');
}
// Method 2: Array first item
else if (Array.isArray($input.item.json) && $input.item.json[0]?.properties) {
  page = $input.item.json[0];
  console.log('Method 2: Found page via array[0]');
}
// Method 3: Check if it's nested
else if ($input.item.json?.json) {
  page = $input.item.json.json;
  console.log('Method 3: Found page via .json property');
}
// Method 4: Check input.all() if available
else if ($input.all && $input.all()[0]?.json) {
  page = $input.all()[0].json;
  console.log('Method 4: Found page via input.all()[0]');
}

if (!page) {
  // Log everything we can see
  console.log('Could not find page data. Available keys:', Object.keys($input.item || {}));
  throw new Error(`Could not extract page data. Input structure: ${JSON.stringify($input.item, null, 2)}`);
}

console.log('Page ID found:', page.id);
console.log('Page properties keys:', Object.keys(page.properties || {}));

// Get Current Season returns an array (getAll with limit 1)
const seasonDataArray = $('Get Current Season').item.json;
const seasonData = Array.isArray(seasonDataArray) ? seasonDataArray[0] : seasonDataArray;

console.log('Season data:', JSON.stringify(seasonData, null, 2));

// Extract properties from Notion page
const name = page.properties?.Name?.title?.[0]?.plain_text || '';
const pointValue = page.properties?.['Point Value']?.number || null;
const statusRaw = page.properties?.Status?.select?.name || 'Available';
const status = statusRaw.toLowerCase();
const teraCaptainEligible = page.properties?.['Tera Captain Eligible']?.checkbox || false;
const pokemonId = page.properties?.['Pokemon ID (PokeAPI)']?.number || null;
const bannedReason = page.properties?.Notes?.rich_text?.[0]?.plain_text || null;

console.log('Extracted values:');
console.log('  Name:', name);
console.log('  Point Value:', pointValue);
console.log('  Status:', status);
console.log('  Tera Captain Eligible:', teraCaptainEligible);
console.log('  Pokemon ID:', pokemonId);

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
  throw new Error(`Pokemon name is required. Page ID: ${page.id || 'unknown'}. Available properties: ${Object.keys(page.properties || {}).join(', ')}`);
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

## What This Does

1. **Extensive logging** - Shows exactly what data structure we're receiving
2. **Multiple extraction methods** - Tries 4 different ways to get the page data
3. **Better error messages** - Shows available keys when data isn't found
4. **Step-by-step logging** - Logs each extraction step

## Next Steps

1. Replace the function with this debug version
2. Run the workflow
3. Check the execution logs for the `console.log` output
4. Share the logs so we can see the actual data structure
5. Update the function based on what we find
