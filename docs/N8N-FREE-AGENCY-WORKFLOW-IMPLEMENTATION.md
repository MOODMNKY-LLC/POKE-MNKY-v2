# N8N Free Agency Workflow - Complete Implementation

> **Workflow**: Average At Best Google Sheet (ID: 3xBWFOUOUXFd6jH2UZopz)
> **Status**: Ready for Implementation

---

## 🎯 Workflow Overview

This workflow automates free agency transactions by:
1. Monitoring Team Pages for transaction requests (F2:F11 additions, G2:G11 drops)
2. Detecting transaction types (replacement, addition, drop)
3. Finding Pokemon in Master Data Sheet draft blocks
4. Updating Master Data Sheet (clear dropped Pokemon, add new Pokemon)
5. Updating Team Page roster (D2:E11)
6. Validating transactions (budget, roster size, limits)

---

## 📋 Workflow Structure

### Node Flow:

```
1. Schedule Trigger (every 5 minutes OR Monday 12AM EST)
   ↓
2. Google Sheets: Get All Sheets
   ↓
3. Code: Filter Team Pages (Team 1-20)
   ↓
4. Split In Batches (or Loop): Process each team
   ↓
5. Google Sheets: Read F2:G11 (Team Page - Transactions)
   ↓
6. Google Sheets: Read D2:E11 (Team Page - Current Roster)
   ↓
7. Code: Detect Transaction Type
   ├─→ Extract dropped Pokemon from G ("Dropping: [Name]")
   ├─→ Get added Pokemon from F
   └─→ Determine type: replacement/addition/drop_only
   ↓
8. IF Transaction Detected:
   ├─→ Google Sheets: Read Master Data Sheet Block 1 (Rows 95-103)
   ├─→ Google Sheets: Read Master Data Sheet Block 2 (Rows 110-119)
   ├─→ Code: Find Pokemon in Blocks
   │   ├─→ For dropped Pokemon: Find cell location
   │   └─→ For added Pokemon: Find team column + empty cell
   ├─→ Code: Validate Transaction
   │   ├─→ Check point budget (120pts)
   │   ├─→ Check roster size (8-10 Pokemon)
   │   ├─→ Check transaction limit (10 F/A moves)
   │   └─→ Check timing (Monday 12AM EST)
   ↓
9. IF Validation Passes:
   ├─→ Google Sheets: Update Master Data Sheet
   │   ├─→ Clear dropped Pokemon cell (set to empty)
   │   └─→ Add new Pokemon to team column
   ├─→ Google Sheets: Update Team Page D2:E11 (Roster)
   ├─→ Google Sheets: Clear F2:F11 (Transaction processed)
   └─→ Google Sheets: Clear/Update G2:G11
   ↓
10. IF Validation Fails:
    └─→ Log Error (don't process)
```

---

## 💻 Node Configurations

### Node 1: Schedule Trigger

**Type**: `nodes-base.scheduleTrigger` OR `nodes-base.cron`

**Configuration**:
- **Option A**: Schedule Trigger
  - Trigger Times: Every 5 minutes
- **Option B**: Cron Trigger
  - Cron Expression: `0 0 * * 1` (Monday 12:00AM EST)

**Purpose**: Monitor Team Pages periodically or process transactions at designated time

---

### Node 2: Google Sheets - Get All Sheets

**Type**: `nodes-base.googleSheets`
**Operation**: Get All Sheets (or use Document operation to list sheets)

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Operation: List sheets or use Get All Sheets

**Output**: Array of all sheets in the spreadsheet

---

### Node 3: Code - Filter Team Pages

**Type**: `nodes-base.code`
**Mode**: Run Once for All Items

**Code**:
```javascript
// Filter to only Team Pages (Team 1, Team 2, ..., Team 20)
const sheets = $input.all();
const teamSheets = [];

for (const sheet of sheets) {
  const sheetTitle = sheet.json.properties?.title || sheet.json.title || '';
  const normalizedTitle = sheetTitle.toLowerCase().trim();
  
  // Match team pages: "Team 1", "Team 2", etc.
  const teamMatch = normalizedTitle.match(/^team\s*(\d+)$/i);
  
  if (teamMatch) {
    const teamNumber = parseInt(teamMatch[1], 10);
    if (teamNumber >= 1 && teamNumber <= 20) {
      teamSheets.push({
        json: {
          teamNumber: teamNumber,
          sheetName: sheetTitle,
          sheetId: sheet.json.properties?.sheetId || sheet.json.sheetId
        }
      });
    }
  }
}

return teamSheets;
```

**Output**: Filtered list of Team Pages (Team 1-20)

---

### Node 4: Split In Batches (or Process Each Team)

**Type**: `nodes-base.splitInBatches`
**Batch Size**: 1

**Purpose**: Process each team page individually

---

### Node 5: Google Sheets - Read F2:G11

**Type**: `nodes-base.googleSheets`
**Operation**: Get Row(s) (Read)

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `={{ $json.sheetName }}` (from previous node)
- Range: `F2:G11`
- Operation: `read`

**Output**: Transaction data (additions in F, drops in G)

---

### Node 6: Google Sheets - Read D2:E11

**Type**: `nodes-base.googleSheets`
**Operation**: Get Row(s) (Read)

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `={{ $json.sheetName }}`
- Range: `D2:E11`
- Operation: `read`

**Output**: Current roster (Pokemon names + point values)

---

### Node 7: Code - Detect Transaction Type

**Type**: `nodes-base.code`
**Mode**: Run Once for All Items

**Code**:
```javascript
// Detect transaction type from F2:G11 data
const fgData = $('Read F2:G11').first().json.values || [];
const transactions = [];

for (let i = 0; i < Math.min(10, fgData.length); i++) {
  const row = fgData[i] || [];
  const fValue = String(row[0] || '').trim(); // Column F (Additions)
  const gValue = String(row[1] || '').trim(); // Column G (Drops)
  
  // Skip if both are blank
  if (!fValue && !gValue) continue;
  
  // Extract dropped Pokemon from G ("Dropping: [Name]")
  let droppedPokemon = null;
  if (gValue && gValue.toLowerCase().includes('dropping:')) {
    droppedPokemon = gValue.replace(/^.*dropping:\s*/i, '').trim();
  }
  
  // Determine transaction type
  let transactionType = null;
  if (fValue && droppedPokemon) {
    transactionType = 'replacement';
  } else if (fValue && !droppedPokemon) {
    transactionType = 'addition';
  } else if (!fValue && droppedPokemon) {
    transactionType = 'drop_only';
  }
  
  if (transactionType) {
    transactions.push({
      row: i + 2, // Actual row number (2-11)
      type: transactionType,
      addPokemon: fValue || null,
      dropPokemon: droppedPokemon || null,
      needsProcessing: true
    });
  }
}

// Return transactions if any found
if (transactions.length === 0) {
  return [{ json: { hasTransactions: false } }];
}

return transactions.map(t => ({ 
  json: {
    ...t,
    hasTransactions: true,
    teamNumber: $('Filter Team Pages').first().json.teamNumber,
    sheetName: $('Filter Team Pages').first().json.sheetName
  }
}));
```

**Output**: Array of detected transactions with type and Pokemon names

---

### Node 8: IF - Check for Transactions

**Type**: `nodes-base.if`

**Condition**: `{{ $json.hasTransactions === true }}`

**True Path**: Process transactions
**False Path**: Skip (no transactions)

---

### Node 9: Google Sheets - Read Master Data Sheet Block 1

**Type**: `nodes-base.googleSheets`
**Operation**: Get Row(s) (Read)

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `Master Data Sheet`
- Range: `B94:K103` (Block 1: Teams 1-11, includes header row 94)
- Operation: `read`

**Output**: Draft picks for Teams 1-11

---

### Node 10: Google Sheets - Read Master Data Sheet Block 2

**Type**: `nodes-base.googleSheets`
**Operation**: Get Row(s) (Read)

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `Master Data Sheet`
- Range: `B109:K119` (Block 2: Teams 12-20, includes header row 109)
- Operation: `read`

**Output**: Draft picks for Teams 12-20

---

### Node 11: Code - Find Pokemon in Master Data Sheet

**Type**: `nodes-base.code`
**Mode**: Run Once for Each Item

**Code**:
```javascript
// Find Pokemon in Master Data Sheet blocks
const transaction = $input.first().json;
const block1Data = $('Read Master Data Block 1').first().json.values || [];
const block2Data = $('Read Master Data Block 2').first().json.values || [];

const teamNumber = transaction.teamNumber;
const teamBlock = teamNumber <= 11 ? 1 : 2;
const blockData = teamNumber <= 11 ? block1Data : block2Data;

// Get team column mapping
// Block 1: Teams 1-11 = Columns B-K (index 0-9)
// Block 2: Teams 12-20 = Columns B-K (index 0-9)
const teamColumnIndex = teamNumber <= 11 
  ? teamNumber - 1  // Team 1 = Column B (index 0), Team 2 = Column C (index 1)
  : teamNumber - 12; // Team 12 = Column B (index 0), Team 13 = Column C (index 1)

const teamColumnLetter = String.fromCharCode(66 + teamColumnIndex); // B=66, C=67, etc.
const blockStartRow = teamNumber <= 11 ? 95 : 110; // Block 1 starts at 95, Block 2 at 110

const updates = [];

// For dropped Pokemon: Find and mark for clearing
if (transaction.dropPokemon) {
  let found = false;
  for (let rowIdx = 1; rowIdx < blockData.length; rowIdx++) { // Skip header row
    const row = blockData[rowIdx] || [];
    const cellValue = String(row[teamColumnIndex] || '').trim();
    
    if (cellValue.toLowerCase() === transaction.dropPokemon.toLowerCase()) {
      const actualRow = blockStartRow + rowIdx - 1; // Adjust for header
      updates.push({
        action: 'clear',
        pokemon: transaction.dropPokemon,
        cell: `${teamColumnLetter}${actualRow}`,
        block: teamBlock,
        teamColumn: teamColumnLetter,
        teamColumnIndex: teamColumnIndex
      });
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Pokemon not found - log warning but continue
    updates.push({
      action: 'clear',
      pokemon: transaction.dropPokemon,
      cell: null,
      error: `Pokemon "${transaction.dropPokemon}" not found in Master Data Sheet`,
      block: teamBlock
    });
  }
}

// For added Pokemon: Find empty cell in team's column
if (transaction.addPokemon) {
  let emptyCellFound = false;
  
  // Search for first empty cell in team's column
  for (let rowIdx = 1; rowIdx < blockData.length; rowIdx++) {
    const row = blockData[rowIdx] || [];
    const cellValue = String(row[teamColumnIndex] || '').trim();
    
    if (!cellValue || cellValue === '') {
      const actualRow = blockStartRow + rowIdx - 1;
      updates.push({
        action: 'add',
        pokemon: transaction.addPokemon,
        cell: `${teamColumnLetter}${actualRow}`,
        block: teamBlock,
        teamColumn: teamColumnLetter,
        teamColumnIndex: teamColumnIndex
      });
      emptyCellFound = true;
      break;
    }
  }
  
  // If no empty cell found, add to end
  if (!emptyCellFound) {
    const nextRow = blockStartRow + blockData.length - 1;
    updates.push({
      action: 'add',
      pokemon: transaction.addPokemon,
      cell: `${teamColumnLetter}${nextRow}`,
      block: teamBlock,
      teamColumn: teamColumnLetter,
      teamColumnIndex: teamColumnIndex,
      note: 'Added to end of roster'
    });
  }
}

return updates.map(update => ({
  json: {
    ...transaction,
    ...update
  }
}));
```

**Output**: Array of update operations (clear/add) with cell references

---

### Node 12: Code - Validate Transaction

**Type**: `nodes-base.code`
**Mode**: Run Once for Each Item

**Code**:
```javascript
// Validate transaction: budget, roster size, transaction limit, timing
const transaction = $input.first().json;
const rosterData = $('Read D2:E11').first().json.values || [];

// Calculate current roster stats
let currentRosterSize = 0;
let currentPointTotal = 0;

for (const row of rosterData) {
  const pokemon = String(row[0] || '').trim();
  const points = parseInt(String(row[1] || '0'), 10);
  
  if (pokemon) {
    currentRosterSize++;
    currentPointTotal += points;
  }
}

// Get new Pokemon point value (would need to read from Draft Board)
// For now, assume we'll get this from Draft Board lookup
const newPokemonPoints = transaction.addPokemon ? 15 : 0; // Placeholder - need Draft Board lookup
const droppedPokemonPoints = transaction.dropPokemon ? 10 : 0; // Placeholder - need from roster

// Calculate new totals
const newRosterSize = transaction.type === 'replacement' 
  ? currentRosterSize  // Same size
  : transaction.type === 'addition'
  ? currentRosterSize + 1  // Add one
  : currentRosterSize - 1; // Drop one

const newPointTotal = currentPointTotal - droppedPokemonPoints + newPokemonPoints;

// Validation checks
const validations = {
  budget: {
    valid: newPointTotal <= 120,
    message: newPointTotal > 120 
      ? `Budget exceeded: ${newPointTotal}pts > 120pts` 
      : null
  },
  rosterSize: {
    valid: newRosterSize >= 8 && newRosterSize <= 10,
    message: newRosterSize < 8 
      ? `Roster too small: ${newRosterSize} < 8`
      : newRosterSize > 10
      ? `Roster too large: ${newRosterSize} > 10`
      : null
  },
  transactionLimit: {
    valid: true, // Would need to track transaction count
    message: null
  },
  timing: {
    valid: true, // Would check if Monday 12AM EST
    message: null
  }
};

const isValid = Object.values(validations).every(v => v.valid);
const errors = Object.values(validations)
  .filter(v => v.message)
  .map(v => v.message);

return [{
  json: {
    ...transaction,
    validation: {
      isValid: isValid,
      errors: errors,
      currentRosterSize: currentRosterSize,
      currentPointTotal: currentPointTotal,
      newRosterSize: newRosterSize,
      newPointTotal: newPointTotal
    }
  }
}];
```

**Output**: Transaction with validation results

---

### Node 13: IF - Check Validation

**Type**: `nodes-base.if`

**Condition**: `{{ $json.validation.isValid === true }}`

**True Path**: Process transaction
**False Path**: Log error (skip processing)

---

### Node 14: Google Sheets - Update Master Data Sheet (Clear Dropped Pokemon)

**Type**: `nodes-base.googleSheets`
**Operation**: Update Row (or Clear specific cell)

**Configuration** (for cleared cells):
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `Master Data Sheet`
- Range: `={{ $json.cell }}` (e.g., "B96")
- Operation: `update` OR use `clear` operation with specific range
- Values: Empty string `""`

**Note**: Google Sheets "Update Row" may require full row. May need to use batch update or clear operation.

---

### Node 15: Google Sheets - Update Master Data Sheet (Add Pokemon)

**Type**: `nodes-base.googleSheets`
**Operation**: Update Row

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `Master Data Sheet`
- Range: `={{ $json.cell }}` (e.g., "B104")
- Operation: `update`
- Values: `={{ $json.pokemon }}`

---

### Node 16: Google Sheets - Update Team Page Roster

**Type**: `nodes-base.googleSheets`
**Operation**: Update Row

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `={{ $json.sheetName }}`
- Range: `D2:E11`
- Operation: `update`
- Values: Updated roster array (remove dropped Pokemon, add new Pokemon)

---

### Node 17: Google Sheets - Clear F2:F11

**Type**: `nodes-base.googleSheets`
**Operation**: Clear

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `={{ $json.sheetName }}`
- Range: `F2:F11`
- Operation: `clear`

---

### Node 18: Google Sheets - Clear G2:G11

**Type**: `nodes-base.googleSheets`
**Operation**: Clear

**Configuration**:
- Document ID: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`
- Sheet: `={{ $json.sheetName }}`
- Range: `G2:G11`
- Operation: `clear`

---

## 🔧 Implementation Notes

### Google Sheets Update Operations

**Challenge**: Google Sheets "Update Row" operation expects full row data, but we need to update individual cells.

**Solutions**:
1. **Use Batch Update API** (via HTTP Request node):
   - `POST https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}:batchUpdate`
   - Allows updating multiple ranges in one call

2. **Use Clear + Append**:
   - Clear the cell first
   - Then append/update with new value

3. **Use Update with Full Row**:
   - Read full row
   - Modify specific cell
   - Update entire row

**Recommended**: Use HTTP Request node with Google Sheets API batchUpdate for efficient cell updates.

---

### Team-to-Column Mapping

**Block 1 (Teams 1-11)**:
- Row 94: Headers (Column B = Team 1, Column C = Team 2, ...)
- Team N → Column index = N - 1 (Team 1 = index 0 = Column B)

**Block 2 (Teams 12-20)**:
- Row 109: Headers (Column B = Team 12, Column C = Team 13, ...)
- Team N → Column index = N - 12 (Team 12 = index 0 = Column B)

---

### Point Value Lookup

**Need**: Get Pokemon point values from Draft Board for validation.

**Options**:
1. Read Draft Board sheet and search for Pokemon
2. Use existing database (if Supabase integration exists)
3. Hardcode common point values (not recommended)

**Recommended**: Read Draft Board sheet to get point values dynamically.

---

## 📝 Next Steps

1. **Implement workflow nodes** in N8N
2. **Test with one team** (Team 1) first
3. **Handle Google Sheets cell updates** (may need HTTP Request with batchUpdate)
4. **Add Draft Board point lookup** for validation
5. **Add transaction tracking** (count F/A moves)
6. **Add error handling** and logging
7. **Test end-to-end** with sample transactions

---

**Status**: Ready for N8N workflow implementation.
