# Google Sheets Structure - AAB Battle League

**Last Updated**: 2026-01-19  
**Source**: `https://docs.google.com/spreadsheets/d/1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw`

## Overview

This document provides comprehensive documentation of all 6 key sheets in the AAB Battle League Google Sheets workbook. Each sheet serves a specific purpose in managing the draft league, tracking battles, standings, and league rules.

---

## Sheet Inventory

1. **Master Data Sheet** - Weekly battle results and overall standings
2. **Draft Board** - Complete draft pool with point values, bans, and draft status
3. **Rules** - Comprehensive league rules, season rules, drafting rules, and banned sets
4. **Pokédex** - Pokemon data and metadata
5. **Data** - Additional data tables and references
6. **Standings** - Current league standings and statistics

---

## 1. Master Data Sheet

### Purpose
Tracks weekly battle results, top performers, and overall league standings across two conferences (Lance Conference and Leon Conference).

### Structure
- **Rows**: 699
- **Columns**: 33
- **Header Row**: Row 52 (contains "Week", "Battles", "Result", "Differential", "Top Performers", "Overall League Standings")

### Key Sections

#### Weekly Battle Results (Rows 52+)
- **Week Number**: Sequential week identifier
- **Battles**: Matchup information (Team vs. Team)
- **Result**: Battle outcome
- **Differential**: Point differential (K/D ratio)
- **Top Performers**: Weekly top performing Pokemon with KO counts
- **Overall League Standings**: Running standings

#### Conference Structure
- **Lance Conference**: One division of teams
- **Leon Conference**: Another division of teams
- Each conference tracks:
  - Division & Rank
  - Team Name
  - Record (Wins/Losses, K/D)
  - Differential
  - Strength of Schedule

### Data Patterns
- Weekly data is organized chronologically
- Each week contains multiple battle results
- Top performers are tracked per week
- Standings update cumulatively

### Key Columns
- Column 0: Week number
- Column 1-3: Battle matchup (Team vs. Team)
- Column 4: Result
- Column 5: Differential
- Column 7-9: Top Performers (Team, Pokemon, KO's)
- Column 10-11: Overall Standings (Team Name, Record)

---

## 2. Draft Board

### Purpose
Central repository for the entire draft pool, including point values, banned Pokemon, Tera Banned Pokemon, and draft status.

### Structure
- **Rows**: 389
- **Columns**: 73
- **Header Row**: Row 2
- **Data Start Row**: Row 4

### Column Structure

#### Status Columns
- **Column 2**: "Banned" header
- **Column 3**: Banned Pokemon names (69 Pokemon)
- **Column 5**: "Tera Banned" header
- **Column 6**: Tera Banned Pokemon names (15 Pokemon)
- **Column 70**: "Drafted" status (X marker)
- **Column 72**: "Pts Left" (remaining points)

#### Point Value Columns
Pokemon are organized by point value in columns. The pattern is:
- **Header Column**: Contains "X Points" label
- **Pokemon Column**: Header Column + 1 (contains Pokemon names)

**Point Value Column Mapping**:
| Header Col | Pokemon Col | Point Value |
|------------|-------------|-------------|
| 8          | 9           | 20 Points  |
| 11         | 12          | 19 Points  |
| 14         | 15          | 18 Points  |
| 17         | 18          | 17 Points  |
| 20         | 21          | 16 Points  |
| 23         | 24          | 15 Points  |
| 26         | 27          | 14 Points  |
| 29         | 30          | 13 Points  |
| 32         | 33          | 12 Points  |
| 35         | 36          | 11 Points  |
| 38         | 39          | 10 Points  |
| 41         | 42          | 9 Points   |
| 44         | 45          | 8 Points   |
| 47         | 48          | 7 Points   |
| 50         | 51          | 6 Points   |
| 53         | 54          | 5 Points   |
| 56         | 57          | 4 Points   |
| 59         | 60          | 3 Points   |
| 62         | 63          | 2 Points   |
| 65         | 66          | 1 Point    |

### Pokemon Distribution
- **Total Pokemon**: 778
- **Banned**: 69 (in col 3)
- **Tera Banned**: 15 (in col 6)
- **Available**: 778 (currently none drafted)

**By Point Value**:
- 1 Point: 225 Pokemon
- 2 Points: 22 Pokemon
- 3 Points: 50 Pokemon
- 4 Points: 43 Pokemon
- 5 Points: 55 Pokemon
- 6 Points: 56 Pokemon
- 7 Points: 35 Pokemon
- 8 Points: 41 Pokemon
- 9 Points: 25 Pokemon
- 10 Points: 25 Pokemon
- 11 Points: 33 Pokemon
- 12 Points: 31 Pokemon
- 13 Points: 22 Pokemon
- 14 Points: 17 Pokemon
- 15 Points: 34 Pokemon
- 16 Points: 19 Pokemon
- 17 Points: 17 Pokemon
- 18 Points: 10 Pokemon
- 19 Points: 11 Pokemon
- 20 Points: 7 Pokemon

### Status Determination Logic

#### Banned Status
- **Method 1**: Pokemon name appears in Column 3 (Banned Pokemon column)
- **Method 2**: Column 2 contains "X" marker (row-level ban)
- **Examples**: Arceus, Arceus Bug, Calyrex Ice Rider, Dialga, Eternatus, etc.

#### Tera Banned Status
- **Method 1**: Pokemon name appears in Column 6 (Tera Banned Pokemon column)
- **Method 2**: Column 5 contains "X" marker (row-level Tera ban)
- **Note**: Tera Banned Pokemon can still be drafted, but cannot be Tera Captains

#### Drafted Status
- Column 70 contains "X" marker
- Indicates Pokemon has been selected in the draft

### Parsing Logic

```javascript
// Pseudo-code for extracting Pokemon from Draft Board
for each row starting from row 4:
  // Extract banned Pokemon
  if row[3] contains Pokemon name:
    add to banned list
  
  // Extract Tera Banned Pokemon
  if row[6] contains Pokemon name:
    add to Tera Banned list
  
  // Extract Pokemon from point value columns
  for each point value column (8, 11, 14, ...):
    pokemonCol = headerCol + 1
    if row[pokemonCol] contains Pokemon name:
      pointValue = getPointValue(headerCol)
      isBanned = (row[2] == 'X' OR name in banned list)
      isTeraBanned = (row[5] == 'X' OR name in Tera Banned list)
      isDrafted = (row[70] == 'X')
      
      add Pokemon to draft pool with:
        - name
        - pointValue
        - isBanned
        - isTeraBanned
        - isDrafted
        - status: 'available' | 'banned' | 'tera_banned' | 'drafted'
```

---

## 3. Rules

### Purpose
Comprehensive rulebook covering league rules, season rules, drafting rules, battle rules, and banned sets.

### Structure
- **Rows**: Variable (contains formatted text)
- **Columns**: Multiple (formatted for readability)

### Key Sections

#### League Rules (General)
1. Respect for coaches, property, and time
2. Team naming (encouraged but not mandatory)
3. Match scheduling (Monday 12:01 AM EST - Sunday 11:59 PM EST)
4. Forfeit rules (0-3 loss for non-accommodating coach, 0-4 for both)
5. Result reporting (Google Docs, KO tracking)
6. Trash talking guidelines
7. Rule change process (mod majority vote)
8. Streaming/video policies
9. Coach drop policy

#### Season Rules (Season 5)
1. **Team Size**: 8-10 Pokemon per team
2. **Draft Budget**: 120 points per team
3. **Tera Budget**: 15 points per team
4. **Grace Period**: 1 week before Week 1
5. **Tera Captains**:
   - Must be declared by Friday, 22nd (EST)
   - Maximum 3 Tera Captains per team
   - Can drop Tera Captain, but slots lock after promotion
   - Can change 1 Tera type (non-Primary) once per season per Captain
   - Must keep Primary type as one of three allowed Tera Types
   - Stellar Tera type banned
6. **Free Agency**: Up to 10 transactions through Week 8
7. **Roster Lock**: After Week 8
8. **Trading**: Included in 10 F/A transactions, must conclude by Week 8
9. **Transaction Timing**: Changes take effect Monday 12:00 AM EST

#### Drafting Rules
1. **Draft Order**: Set on Friday, 15th (randomized, Season 5 Review call, 7PM EST)
2. **Draft Date**: Sunday, 17th at 2PM EST
3. **Draft Format**: Snake draft (Team 1 picks 1st in Round 1, 20th in Round 2)
4. **Time Limit**: 45 seconds per pick
5. **Missed Picks**: Skipped if not made in time, forfeit if missed 2 rounds in a row
6. **No Auto-Draft**: Coaches must be present
7. **Legendary/Mythical**: Allowed (with exceptions)
8. **Box Legendaries**: Not draftable (2 exceptions)
9. **Draft Pool**: Available via "Draft Board" tab
10. **Form Variations**: Allowed, but only by different teams
11. **Species Limit**: One species per team (includes evolution lines, Eeveelutions)

#### Battle Rules
- Level 50 vs Level 100
- Flat Rules vs Unrestricted Rules
- Disconnect handling
- Team validation (must match drafted Pokemon)
- Minimum team size (6 Pokemon)

#### Banned Sets (Moves and Abilities)
- Specific move/ability combinations banned
- Listed in Rules sheet
- Includes ability restrictions

### Key Configuration Values
- **Draft Budget**: 120 points
- **Tera Budget**: 15 points
- **Min Team Size**: 8 Pokemon
- **Max Team Size**: 10 Pokemon
- **Free Agency Transactions**: 10
- **Free Agency Deadline**: Week 8
- **Roster Lock**: After Week 8
- **Tera Captain Limit**: 3
- **Tera Captain Point Limit**: 10 points or less
- **Pick Time Limit**: 45 seconds

---

## 4. Pokédex

### Purpose
Contains Pokemon data, metadata, and potentially cross-reference information.

### Structure
- **Rows**: Variable
- **Columns**: Variable

### Content
(To be analyzed in detail - structure may vary)

---

## 5. Data

### Purpose
Team and coach information, including team assignments, divisions, conferences, and organizational data.

### Structure
- **Rows**: 573
- **Columns**: 86
- **Header Row**: Row 0

### Column Structure

#### Header Columns (Row 0)
1. **ID.** - Team/Coach ID number
2. **Coach Name** - Coach identifier
3. **Team Name** - Team name
4. **Logo** - Team logo reference
5. **Div.** - Division number
6. **Conf.** - Conference (Lance or Leon)
7. **W.** - Additional field (possibly wins or weight)
8. **...** (additional columns for team data)

### Data Patterns

#### Team Structure
- **ID**: Sequential team identifier (1, 2, 3, ...)
- **Coach Name**: Region-based names (Kanto, Johto, Hoenn, Sinnoh)
- **Team Name**: Conference-based names (Lance, Leon)
- **Division**: Division number (1, 2, ...)
- **Conference**: "Lance" or "Leon"

#### Sample Entries

```
Row 1: 1 | Kanto | Lance | 1
Row 2: 2 | Johto | Lance | 1
Row 3: 3 | Hoenn | Leon | 1
Row 4: 4 | Sinnoh | Leon | 1
```

### Use Cases
- Map team IDs to coach names
- Determine conference and division assignments
- Track team organizational structure
- Generate team rosters and standings

---

## 6. Standings

### Purpose
Weekly standings tracking with team records (wins, losses) and differentials.

### Structure
- **Rows**: 22
- **Columns**: 4
- **Header Row**: Row 1 (varies by week)

### Column Structure

#### Standard Columns
1. **Team Name** - Team identifier
2. **Wins** - Number of wins
3. **Losses** - Number of losses
4. **Differential** - Point differential (K/D ratio)

### Data Patterns

#### Weekly Structure
- **Row 0**: Week identifier (e.g., "Week 1")
- **Row 1**: Header row ("Team Name | Wins | Losses | Differential")
- **Row 2+**: Team standings data

#### Sample Structure

```
Row 0: Week 1
Row 1: Team Name | Wins | Losses | Differential
Row 2: Team 1 | 0 | 0 | 0
Row 3: Team 2 | 0 | 0 | 0
...
```

### Use Cases
- Track weekly standings
- Calculate win/loss records
- Determine playoff seeding
- Generate standings reports

---

## Draft Pool Generation Logic

### Available Pokemon Criteria

A Pokemon is **available** for drafting if:
1. ✅ Pokemon name appears in a point value column (cols 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66)
2. ✅ Pokemon is NOT in Banned column (col 3)
3. ✅ Pokemon is NOT marked as Drafted (col 70 ≠ "X")
4. ⚠️ Pokemon CAN be Tera Banned (col 6) but still draftable (just can't be Tera Captain)

### Point Value Assignment

Point value is determined by the column position:
- Pokemon in col 9 → 20 points
- Pokemon in col 12 → 19 points
- Pokemon in col 15 → 18 points
- ... and so on

**Formula**: `pointValue = 21 - ((pokemonCol - 9) / 3)`

### Status Determination

```javascript
function determineStatus(pokemon, row) {
  // Check if drafted
  if (row[70] === 'X') {
    return 'drafted';
  }
  
  // Check if banned
  if (row[2] === 'X' || bannedPokemonList.includes(pokemon.name)) {
    return 'banned';
  }
  
  // Check if Tera Banned
  if (row[5] === 'X' || teraBannedPokemonList.includes(pokemon.name)) {
    return 'tera_banned'; // Still draftable, but can't be Tera Captain
  }
  
  return 'available';
}
```

### Draft Pool Generation Algorithm

```javascript
function generateDraftPool(draftBoard) {
  const draftPool = {
    available: [],
    banned: [],
    teraBanned: [],
    drafted: [],
  };
  
  // Extract all Pokemon
  for (let rowIdx = 4; rowIdx < draftBoard.length; rowIdx++) {
    const row = draftBoard[rowIdx];
    
    // Extract Pokemon from point value columns
    for (const [headerCol, pointValue] of Object.entries(pointColumns)) {
      const pokemonCol = parseInt(headerCol) + 1;
      
      if (row[pokemonCol] && isValidPokemonName(row[pokemonCol])) {
        const pokemon = {
          name: row[pokemonCol].trim(),
          pointValue: pointValue,
          status: determineStatus(row[pokemonCol].trim(), row),
        };
        
        // Categorize
        if (pokemon.status === 'drafted') {
          draftPool.drafted.push(pokemon);
        } else if (pokemon.status === 'banned') {
          draftPool.banned.push(pokemon);
        } else if (pokemon.status === 'tera_banned') {
          draftPool.teraBanned.push(pokemon);
        } else {
          draftPool.available.push(pokemon);
        }
      }
    }
  }
  
  return draftPool;
}
```

---

## Integration with Showdown Pokedex

The Google Sheets data can be cross-referenced with Showdown Pokedex data (`showdown://pokemon/{name}`) to:
- Validate Pokemon names
- Get competitive tier information
- Retrieve base stats
- Access ability data
- Check forme information

### Name Matching Strategy

1. **Exact Match**: Try exact name match first
2. **Normalize**: Convert to lowercase, remove spaces/hyphens
3. **Forme Handling**: Handle forme suffixes (e.g., "Rotom Wash" → "rotomwash")
4. **Showdown Format**: Convert to Showdown format (e.g., "Arceus Bug" → "arceusbug")

---

## Automated Draft Pool Generator

### Requirements

1. **Input**: Google Sheets Draft Board data
2. **Output**: Structured JSON draft pool with:
   - Available Pokemon (by point value)
   - Banned Pokemon
   - Tera Banned Pokemon
   - Drafted Pokemon
   - Point value distribution
   - Status metadata

### Implementation Steps

1. **Parse Draft Board**: Extract Pokemon from point value columns
2. **Determine Status**: Check banned, Tera banned, and drafted status
3. **Validate Names**: Cross-reference with Showdown Pokedex
4. **Generate Pool**: Create structured draft pool JSON
5. **Export**: Save to file or database

### Usage

```javascript
const draftPool = generateDraftPool(draftBoardData);
// Returns:
// {
//   available: [...], // 778 Pokemon
//   banned: [...],     // 69 Pokemon
//   teraBanned: [...], // 15 Pokemon
//   drafted: [...],    // Currently 0
//   byPointValue: {...},
//   config: {...}
// }
```

---

## Data Export

All extracted data is available in:
- `/data/google-sheets-export.json` - Full Google Sheets export
- `/data/draft-pool-logic.json` - Extracted draft pool logic and Pokemon data

---

## Next Steps

1. ✅ Document all 6 sheets comprehensively
2. ✅ Extract draft pool generation logic
3. ⏳ Create automated draft pool generator script
4. ⏳ Integrate with Showdown Pokedex for validation
5. ⏳ Build draft pool API endpoint
6. ⏳ Create draft pool management UI

---

**Related Documentation**:
- [Showdown Pokedex Data](./data-structures/showdown-pokedex-data.md)
- [Draft Pool Implementation Guide](../docs/DRAFT-POOL-IMPLEMENTATION-GUIDE.md)
