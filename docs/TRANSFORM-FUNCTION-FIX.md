# Transform Function Fix - Pokemon Name Extraction

## Problem

The transform function is failing with "Pokemon name is required" because it can't find the name property. This is likely because:

1. **n8n's Notion node simplifies the data structure** - Properties might be flattened
2. **Property name might be different** - Could be "Name", "name", or something else
3. **Data structure from "Get Page Data" might differ** from Notion Trigger

## Solution

Update the transform function to handle multiple data formats and add better debugging.

## Updated Transform Function

Replace the function code in the "Transform to Supabase" node with this:

```javascript
// Transform Notion page data to Supabase draft_pool format
// $input.item.json contains the Notion page data from "Get Page Data"
// $('Get Current Season').item.json contains the season data (as an array)

const page = $input.item.json;
const seasonDataArray = $('Get Current Season').item.json;

// Get Current Season returns an array (getAll with limit 1)
// Extract the first item from the array
const seasonData = Array.isArray(seasonDataArray) ? seasonDataArray[0] : seasonDataArray;

// Debug: Log the page structure to understand the data format
console.log('Page data structure:', JSON.stringify(page, null, 2));
console.log('Page properties keys:', Object.keys(page.properties || {}));

// Extract properties from Notion page - handle multiple formats
// Try different ways to access the name property
let name = '';

// Method 1: Full Notion API format
if (page.properties?.Name?.title?.[0]?.plain_text) {
  name = page.properties.Name.title[0].plain_text;
}
// Method 2: Simplified format (n8n might flatten it)
else if (page.properties?.Name) {
  // Could be a string or object
  if (typeof page.properties.Name === 'string') {
    name = page.properties.Name;
  } else if (page.properties.Name.plain_text) {
    name = page.properties.Name.plain_text;
  } else if (Array.isArray(page.properties.Name) && page.properties.Name[0]?.plain_text) {
    name = page.properties.Name[0].plain_text;
  }
}
// Method 3: Direct property access (flattened)
else if (page.Name) {
  name = typeof page.Name === 'string' ? page.Name : page.Name.plain_text || '';
}
// Method 4: Try lowercase
else if (page.properties?.name?.title?.[0]?.plain_text) {
  name = page.properties.name.title[0].plain_text;
}

// Extract other properties with similar fallback logic
const pointValue = page.properties?.['Point Value']?.number 
  || page.properties?.['point_value']?.number
  || page['Point Value']
  || page.point_value
  || null;

const statusRaw = page.properties?.Status?.select?.name 
  || page.properties?.status?.select?.name
  || page.properties?.Status
  || page.status
  || 'available';

const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : 'available';

const teraCaptainEligible = page.properties?.['Tera Captain Eligible']?.checkbox 
  || page.properties?.['tera_captain_eligible']?.checkbox
  || page['Tera Captain Eligible']
  || page.tera_captain_eligible
  || false;

const pokemonId = page.properties?.['Pokemon ID (PokeAPI)']?.number
  || page.properties?.['Pokemon ID']?.number
  || page.properties?.['pokemon_id']?.number
  || page['Pokemon ID (PokeAPI)']
  || page.pokemon_id
  || null;

const bannedReason = page.properties?.Notes?.rich_text?.[0]?.plain_text
  || page.properties?.Notes?.plain_text
  || page.properties?.Notes
  || page.Notes
  || null;

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

if (!name || name.trim() === '') {
  // Enhanced error message with debugging info
  const availableKeys = Object.keys(page.properties || {});
  throw new Error(`Pokemon name is required. Available property keys: ${availableKeys.join(', ')}. Page ID: ${page.id || 'unknown'}`);
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

1. **Multiple extraction methods** - Tries 4 different ways to get the name
2. **Better error messages** - Shows available property keys when name is missing
3. **Handles simplified formats** - Works with both full Notion API format and n8n's simplified format
4. **Fallback for all properties** - Each property has multiple fallback options
5. **Debug logging** - Logs the page structure to help diagnose issues

## Testing

After updating:

1. **Run the workflow** and check the execution logs
2. **Look for the console.log output** - This will show you the actual data structure
3. **If it still fails**, the error message will show available property keys
4. **Update the function** based on what you see in the logs

## Next Steps

If the function still can't find the name:

1. Check the execution logs for the console.log output
2. Look at what property keys are available
3. Update the extraction logic based on the actual structure
4. You might need to check the "Get Page Data" node's output format
