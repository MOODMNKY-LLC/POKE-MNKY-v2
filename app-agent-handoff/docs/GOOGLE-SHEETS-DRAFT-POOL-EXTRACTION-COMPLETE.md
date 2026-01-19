# Google Sheets Draft Pool Extraction - Complete

**Date**: 2026-01-19  
**Status**: ✅ Complete

## Summary

Successfully extracted comprehensive draft pool generation logic from the messy Google Sheets structure and created an automated draft pool generator. All 6 key sheets have been documented in detail.

---

## Approach to Handling Messy Sheet Structure

### The Challenge

The Google Sheets Draft Board has an irregular structure optimized for human viewing:
- Pokemon organized in columns by point values (20 points, 19 points, etc.)
- Multiple header rows
- Status columns (Banned, Tera Banned, Drafted) with markers
- Pokemon names scattered across columns
- Inconsistent spacing and formatting

### The Solution

**Two-Pass Parsing Strategy**:

1. **First Pass**: Extract reference lists
   - Banned Pokemon from Column 3
   - Tera Banned Pokemon from Column 6
   - Build lookup sets for status determination

2. **Second Pass**: Extract Pokemon from point value columns
   - Map header columns to point values (col 8 = 20 pts, col 11 = 19 pts, etc.)
   - Pokemon names are in `headerCol + 1` (col 9 = 20 pts Pokemon, col 12 = 19 pts Pokemon)
   - Determine status using row-level markers AND reference lists
   - Categorize: available, banned, tera_banned, drafted

### Key Insights

1. **Column Pattern**: Point value headers are every 3 columns starting at col 8
   - Pattern: `headerCol = 8 + (20 - pointValue) * 3`
   - Pokemon column: `pokemonCol = headerCol + 1`

2. **Status Determination**:
   - **Banned**: Pokemon in col 3 OR col 2 = "X"
   - **Tera Banned**: Pokemon in col 6 OR col 5 = "X" (still draftable, can't be Tera Captain)
   - **Drafted**: Col 70 = "X"

3. **Name Validation**:
   - Skip empty cells, numbers, status markers
   - Minimum length: 2 characters
   - Exclude: "X", "Banned", "Tera Banned", "Drafted", "Pts Left"

---

## Extracted Data

### Draft Pool Statistics

- **Total Pokemon**: 778
- **Available**: 764
- **Banned**: 69 (in col 3)
- **Tera Banned**: 14 (in col 6, still draftable)
- **Drafted**: 0 (currently)

### Point Value Distribution

| Point Value | Available Pokemon |
|------------|-------------------|
| 20 Points  | 7                |
| 19 Points  | 11               |
| 18 Points  | 10               |
| 17 Points  | 17               |
| 16 Points  | 19               |
| 15 Points  | 34               |
| 14 Points  | 17               |
| 13 Points  | 22               |
| 12 Points  | 31               |
| 11 Points  | 33               |
| 10 Points  | 24               |
| 9 Points   | 24               |
| 8 Points   | 35               |
| 7 Points   | 32               |
| 6 Points   | 53               |
| 5 Points   | 55               |
| 4 Points   | 43               |
| 3 Points   | 50               |
| 2 Points   | 22               |
| 1 Point    | 225              |

---

## Documentation Created

### 1. Google Sheets Structure Documentation
**Location**: `/knowledge-base/aab-battle-league/google-sheets-structure.md`

Comprehensive documentation covering:
- **Master Data Sheet**: Weekly battle results, standings, conferences
- **Draft Board**: Complete structure, column mapping, parsing logic
- **Rules**: League rules, season rules, drafting rules, banned sets
- **Pokédex**: Pokemon cross-reference database
- **Data**: Team and coach information
- **Standings**: Weekly standings tracking

### 2. Draft Pool Logic Extraction
**Location**: `/data/draft-pool-logic.json`

Structured JSON containing:
- Configuration (draft budget, Tera budget, team size, etc.)
- All Pokemon with status and metadata
- Banned and Tera Banned lists
- Point value distribution
- Generation rules and algorithms

### 3. Automated Draft Pool Generator
**Location**: `/scripts/generate-draft-pool.js`

Features:
- ✅ Extract Pokemon from Draft Board
- ✅ Determine status (available, banned, tera_banned, drafted)
- ✅ Group by point value
- ✅ Filter by criteria (point value range, name pattern, exclude Tera Banned)
- ✅ Export to structured JSON
- ✅ Generate statistics and distribution

### 4. Generated Draft Pool
**Location**: `/data/draft-pool-generated.json`

Ready-to-use draft pool JSON with:
- Available Pokemon list
- Banned Pokemon list
- Tera Banned Pokemon list
- Point value distribution
- Metadata and statistics

---

## Scripts Created

### 1. `extract-draft-pool-logic.js`
Extracts and analyzes draft pool logic from Google Sheets.

**Usage**:
```bash
node scripts/extract-draft-pool-logic.js
```

**Output**: `/data/draft-pool-logic.json`

### 2. `generate-draft-pool.js`
Generates structured draft pool from Google Sheets data.

**Usage**:
```bash
node scripts/generate-draft-pool.js
```

**Output**: `/data/draft-pool-generated.json`

**API**:
```javascript
import { generateDraftPool, filterDraftPool } from './scripts/generate-draft-pool.js';

// Generate draft pool
const draftPool = generateDraftPool(googleSheetsData);

// Filter by criteria
const filtered = filterDraftPool(draftPool, {
  minPointValue: 10,
  maxPointValue: 15,
  excludeTeraBanned: true,
});
```

---

## Draft Pool Generation Logic

### Available Pokemon Criteria

A Pokemon is **available** for drafting if:
1. ✅ Name appears in a point value column (cols 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66)
2. ✅ NOT in Banned column (col 3)
3. ✅ NOT marked as Drafted (col 70 ≠ "X")
4. ⚠️ CAN be Tera Banned (col 6) but still draftable (just can't be Tera Captain)

### Status Determination Algorithm

```javascript
function determineStatus(pokemonName, row, bannedList, teraBannedList) {
  // Check if drafted
  if (row[70] === 'X') return 'drafted';
  
  // Check if banned
  if (row[2] === 'X' || bannedList.includes(pokemonName)) {
    return 'banned';
  }
  
  // Check if Tera Banned (still draftable)
  if (row[5] === 'X' || teraBannedList.includes(pokemonName)) {
    return 'tera_banned';
  }
  
  return 'available';
}
```

---

## Integration Points

### With Showdown Pokedex

The extracted Pokemon names can be cross-referenced with Showdown Pokedex data:
- Validate Pokemon names
- Get competitive tier information
- Retrieve base stats and abilities
- Check forme information

**Name Matching Strategy**:
1. Exact match (lowercase)
2. Normalize (remove spaces/hyphens)
3. Handle forme suffixes (e.g., "Rotom Wash" → "rotomwash")
4. Convert to Showdown format

### With Database

The generated draft pool can be:
- Imported into Supabase `draft_pool` table
- Used for draft pool API endpoints
- Integrated with draft management UI
- Synced with Google Sheets (bidirectional)

---

## Next Steps

1. ✅ Extract draft pool logic from Google Sheets
2. ✅ Document all 6 sheets comprehensively
3. ✅ Create automated draft pool generator
4. ⏳ Integrate with Showdown Pokedex for validation
5. ⏳ Build draft pool API endpoint
6. ⏳ Create draft pool management UI
7. ⏳ Implement Google Sheets sync (bidirectional)

---

## Files Created/Modified

### New Files
- `/knowledge-base/aab-battle-league/google-sheets-structure.md` - Comprehensive sheet documentation
- `/scripts/extract-draft-pool-logic.js` - Logic extraction script
- `/scripts/generate-draft-pool.js` - Draft pool generator script
- `/data/draft-pool-logic.json` - Extracted logic data
- `/data/draft-pool-generated.json` - Generated draft pool
- `/docs/GOOGLE-SHEETS-DRAFT-POOL-EXTRACTION-COMPLETE.md` - This document

### Modified Files
- `/knowledge-base/aab-battle-league/README.md` - Added reference to Google Sheets documentation

---

## Related Documentation

- [Google Sheets Structure](../knowledge-base/aab-battle-league/google-sheets-structure.md)
- [Showdown Pokedex Data](../knowledge-base/aab-battle-league/data-structures/showdown-pokedex-data.md)
- [Draft Pool Implementation Guide](./DRAFT-POOL-IMPLEMENTATION-GUIDE.md)

---

**Status**: ✅ Complete - Ready for integration with database and API
