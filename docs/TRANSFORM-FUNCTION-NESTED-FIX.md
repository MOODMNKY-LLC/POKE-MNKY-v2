# Transform Function - Handle Nested JSON Structure

## Problem

The JSON is very nested and the extraction isn't working. We need to:
1. Properly access the nested structure
2. Handle the array wrapping
3. Extract from deeply nested properties

## Solution - Handle Nested Structure

```javascript
// Transform Notion page data to Supabase draft_pool format
// Handle deeply nested JSON structure from n8n

// Step 1: Get the raw input data
const rawInput = $input.item.json;

// Step 2: Unwrap array if needed
let pageData = rawInput;
if (Array.isArray(rawInput)) {
  pageData = rawInput[0];
}

// Step 3: Handle if it's wrapped in another object
const page = pageData.properties ? pageData : (pageData.json || pageData.data || pageData);

// Step 4: Get season data
const rawSeasonData = $('Get Current Season').item.json;
let seasonData = rawSeasonData;
if (Array.isArray(rawSeasonData)) {
  seasonData = rawSeasonData[0];
}
if (seasonData.json) {
  seasonData = seasonData.json;
}

// Step 5: Extract properties with safe navigation
// Name: properties.Name.title[0].plain_text
const nameProperty = page?.properties?.Name;
let name = '';
if (nameProperty?.title && Array.isArray(nameProperty.title) && nameProperty.title[0]) {
  name = nameProperty.title[0].plain_text || '';
} else if (nameProperty?.plain_text) {
  name = nameProperty.plain_text;
} else if (typeof nameProperty === 'string') {
  name = nameProperty;
}

// Point Value: properties['Point Value'].number
const pointValueProperty = page?.properties?.['Point Value'];
const pointValue = pointValueProperty?.number ?? null;

// Status: properties.Status.select.name
const statusProperty = page?.properties?.Status;
let statusRaw = 'Available';
if (statusProperty?.select?.name) {
  statusRaw = statusProperty.select.name;
} else if (typeof statusProperty === 'string') {
  statusRaw = statusProperty;
}
const status = statusRaw.toLowerCase();

// Tera Captain Eligible: properties['Tera Captain Eligible'].checkbox
const teraProperty = page?.properties?.['Tera Captain Eligible'];
const teraCaptainEligible = teraProperty?.checkbox ?? false;

// Pokemon ID: properties['Pokemon ID (PokeAPI)'].number
const pokemonIdProperty = page?.properties?.['Pokemon ID (PokeAPI)'];
const pokemonId = pokemonIdProperty?.number ?? null;

// Banned Reason: properties.Notes.rich_text[0].plain_text
const notesProperty = page?.properties?.Notes;
let bannedReason = null;
if (notesProperty?.rich_text && Array.isArray(notesProperty.rich_text) && notesProperty.rich_text[0]) {
  bannedReason = notesProperty.rich_text[0].plain_text || null;
} else if (notesProperty?.plain_text) {
  bannedReason = notesProperty.plain_text;
}

// Map status to enum
const statusMap = {
  'available': 'available',
  'banned': 'banned',
  'unavailable': 'unavailable',
  'drafted': 'drafted'
};
const mappedStatus = statusMap[status] || 'available';

// Get season ID
const seasonId = seasonData?.id || null;

// Validation
if (!seasonId) {
  throw new Error('No current season found. Ensure a season exists with is_current = true');
}

if (!name || name.trim() === '') {
  // Debug: Log what we actually have
  console.log('Page structure:', JSON.stringify(page, null, 2));
  console.log('Name property:', JSON.stringify(nameProperty, null, 2));
  throw new Error(`Pokemon name is required. Page ID: ${page?.id || 'unknown'}. Available properties: ${Object.keys(page?.properties || {}).join(', ')}`);
}

if (!pointValue || pointValue < 1 || pointValue > 20) {
  throw new Error(`Point value must be 1-20. Got: ${pointValue}`);
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
    banned_reason: bannedReason,
    notion_page_id: page?.id || null,
  }
};
```

## Alternative: Direct Path Access

If the above doesn't work, try this version that uses direct path access:

```javascript
// Direct path access version
const page = Array.isArray($input.item.json) ? $input.item.json[0] : $input.item.json;
const season = Array.isArray($('Get Current Season').item.json) ? $('Get Current Season').item.json[0] : $('Get Current Season').item.json;

// Use direct property access with optional chaining
const name = page.properties?.Name?.title?.[0]?.plain_text || '';
const pointValue = page.properties?.['Point Value']?.number || null;
const statusRaw = page.properties?.Status?.select?.name || 'Available';
const status = statusRaw.toLowerCase();
const teraCaptainEligible = page.properties?.['Tera Captain Eligible']?.checkbox || false;
const pokemonId = page.properties?.['Pokemon ID (PokeAPI)']?.number || null;
const bannedReason = page.properties?.Notes?.rich_text?.[0]?.plain_text || null;

const statusMap = {'available': 'available', 'banned': 'banned', 'unavailable': 'unavailable', 'drafted': 'drafted'};

if (!season?.id) throw new Error('No current season found');
if (!name) throw new Error(`Pokemon name required. Page: ${JSON.stringify(page.properties?.Name)}`);
if (!pointValue || pointValue < 1 || pointValue > 20) throw new Error(`Invalid point value: ${pointValue}`);

return {
  json: {
    pokemon_name: name.trim(),
    point_value: pointValue,
    status: statusMap[status] || 'available',
    tera_captain_eligible: teraCaptainEligible,
    pokemon_id: pokemonId,
    season_id: season.id,
    banned_reason: bannedReason,
    notion_page_id: page.id,
  }
};
```
