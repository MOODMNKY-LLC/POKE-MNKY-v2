# N8N Free Agency Management Workflow Design

> **Goal**: Automate free agency transactions (drops and pickups) with validation and roster management

---

## 🎯 Business Logic Summary

### Free Agency Rules (from League Rules):
- **Budget**: 120 points total (must stay within cap)
- **Roster Size**: 8-10 Pokemon
- **Transaction Limit**: Up to 10 F/A transactions through Week 8
- **Timing**: Transactions take effect Monday 12:00AM EST
- **Trading**: Coach-to-coach trades count toward 10 transaction limit

### Team Page Structure:
- **D2:E11**: Current roster (Pokemon names + point values)
- **F2:F11**: Pokemon being **ADDED** (picked up from free agency)
- **G2:G11**: Pokemon being **DROPPED** (format: "Dropping: [Pokemon Name]")

### Transaction Types:
1. **Replacement**: F has Pokemon AND G has "Dropping: [Name]"
   - Remove dropped Pokemon, add new Pokemon
   - Point budget: (current total - dropped points + new points) ≤ 120
   
2. **Addition**: F has Pokemon AND G is blank
   - Add Pokemon to roster
   - Point budget: (current total + new points) ≤ 120
   - Roster size: Must stay ≤ 10 Pokemon
   
3. **Drop Only**: F is blank AND G has "Dropping: [Name]"
   - Remove Pokemon from roster
   - Free up point budget
   - Roster size: Must stay ≥ 8 Pokemon

---

## 🔄 Workflow Logic Flow

### Step 1: Monitor & Detect Changes

**Trigger Options:**
- **Option A**: Cron trigger (every 5 minutes)
- **Option B**: Google Apps Script webhook (real-time on edit)
- **Option C**: Scheduled trigger (Monday 12:00AM EST for transaction processing)

**Detection:**
- Monitor all team pages (Team 1, Team 2, etc.)
- Check F2:F11 and G2:G11 for changes
- Detect transaction type based on F and G values

### Step 2: Read Current State

For each team page:
1. Read **D2:E11** (current roster with points)
2. Read **F2:F11** (additions)
3. Read **G2:G11** (drops)
4. Calculate current point total
5. Count current roster size
6. Count transaction history

### Step 3: Process F→G Copy (User's Request)

**Logic:**
```
FOR each row in F2:F11:
  IF F[row] has text AND G[row] is updated:
    THEN copy F[row] to G[row]
  ELSE IF F[row] is blank:
    THEN leave G[row] unchanged
```

This facilitates the transaction by auto-filling G with the addition when coach types "Dropping: [Name]" in G.

### Step 4: Validate Transaction

**Validation Checks:**

1. **Pokemon Availability**
   - Check if Pokemon in F exists in Draft Board
   - Check if Pokemon is already drafted by another team
   - Check if Pokemon is banned/tera banned

2. **Point Budget**
   - Calculate: `current_total - dropped_points + new_points`
   - Must be ≤ 120 points
   - If over budget, reject transaction

3. **Roster Size**
   - After transaction: Must be 8-10 Pokemon
   - If addition: Current size + 1 ≤ 10
   - If drop: Current size - 1 ≥ 8

4. **Transaction Limit**
   - Count transactions this season
   - Must be < 10 transactions
   - Check if Week 8 has passed (roster lock)

5. **Transaction Timing**
   - Check current day/time
   - If before Monday 12AM EST: Queue for processing
   - If after Monday 12AM EST: Process immediately

### Step 5: Process Transaction

**For Replacement (F has Pokemon, G has drop):**

1. Extract dropped Pokemon name from G ("Dropping: [Name]")
2. Find dropped Pokemon in D2:E11
3. Get dropped Pokemon's point value
4. Get new Pokemon's point value from Draft Board
5. Calculate new total: `current_total - dropped_points + new_points`
6. Validate: new_total ≤ 120
7. Update D2:E11: Replace dropped Pokemon with new Pokemon
8. Update Draft Board: Mark dropped Pokemon as available, new Pokemon as drafted
9. Clear F2:F11 cell (transaction processed)
10. Update G2:G11: Clear or mark as processed
11. Log transaction

**For Addition (F has Pokemon, G is blank):**

1. Get new Pokemon's point value from Draft Board
2. Calculate new total: `current_total + new_points`
3. Validate: new_total ≤ 120 AND roster_size + 1 ≤ 10
4. Update D2:E11: Add new Pokemon to roster
5. Update Draft Board: Mark new Pokemon as drafted
6. Clear F2:F11 cell
7. Log transaction

**For Drop Only (F is blank, G has drop):**

1. Extract dropped Pokemon name from G
2. Find dropped Pokemon in D2:E11
3. Get dropped Pokemon's point value
4. Validate: roster_size - 1 ≥ 8
5. Update D2:E11: Remove dropped Pokemon
6. Update Draft Board: Mark dropped Pokemon as available
7. Clear G2:G11 cell
8. Log transaction

### Step 6: Error Handling

**If Validation Fails:**
- Don't process transaction
- Leave F2:F11 and G2:G11 unchanged
- Log error reason
- Optionally: Notify coach via Discord/email

**Error Types:**
- Budget exceeded
- Roster size violation
- Transaction limit reached
- Pokemon not available
- Invalid Pokemon name
- Week 8 passed (roster locked)

---

## 📊 N8N Workflow Structure

### Node Flow:

```
1. Cron Trigger (every 5 min OR Monday 12AM EST)
   ↓
2. Google Sheets: Get All Sheets
   ↓
3. Code: Filter Team Pages
   ↓
4. Loop Over Items (each team)
   ↓
5. Google Sheets: Read Range (F2:G11)
   ↓
6. Google Sheets: Read Range (D2:E11) - Current Roster
   ↓
7. Code: Detect Transaction Type (IF-THEN Logic)
   ├─→ IF F has text AND G has drop → Replacement
   ├─→ IF F has text AND G is blank → Addition
   └─→ IF F is blank AND G has drop → Drop Only
   ↓
8. Code: Process F→G Copy (User's Request)
   ↓
9. Code: Validate Transaction
   ├─→ Check Pokemon availability
   ├─→ Check point budget
   ├─→ Check roster size
   ├─→ Check transaction limit
   └─→ Check timing
   ↓
10. IF Validation Passes:
    ├─→ Google Sheets: Update D2:E11 (Roster)
    ├─→ Google Sheets: Update Draft Board
    ├─→ Google Sheets: Clear F2:F11
    ├─→ Google Sheets: Clear/Update G2:G11
    └─→ Log Transaction
    ↓
11. IF Validation Fails:
    └─→ Log Error (don't process)
```

---

## 💻 Code Node Implementations

### Code Node 1: Filter Team Pages

```javascript
// Filter to only team pages
const sheets = $input.all();
const teamSheets = [];

for (const sheet of sheets) {
  const sheetTitle = sheet.json.properties?.title || sheet.json.title || '';
  const normalizedTitle = sheetTitle.toLowerCase();
  
  // Match team pages (Team 1, Team 2, etc.)
  if (normalizedTitle.includes('team') && /team\s*\d+/i.test(sheetTitle)) {
    teamSheets.push({
      title: sheetTitle,
      sheetId: sheet.json.properties?.sheetId || sheet.json.sheetId
    });
  }
}

return teamSheets.map(sheet => ({ json: sheet }));
```

### Code Node 2: Detect Transaction Type

```javascript
// Read F2:G11 and D2:E11 data
const fgData = $('Read F2:G11').first().json.values || [];
const deData = $('Read D2:E11').first().json.values || [];

const transactions = [];

for (let i = 0; i < Math.min(10, fgData.length); i++) {
  const row = fgData[i] || [];
  const fValue = String(row[0] || '').trim(); // Column F
  const gValue = String(row[1] || '').trim(); // Column G
  
  // Skip if both are blank
  if (!fValue && !gValue) continue;
  
  // Extract dropped Pokemon from G ("Dropping: [Name]")
  let droppedPokemon = null;
  if (gValue.includes('Dropping:')) {
    droppedPokemon = gValue.replace('Dropping:', '').trim();
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

return transactions.map(t => ({ json: t }));
```

### Code Node 3: Process F→G Copy

```javascript
// Copy non-blank F values to G (user's request)
const fgData = $('Read F2:G11').first().json.values || [];
const updates = [];

for (let i = 0; i < Math.min(10, fgData.length); i++) {
  const row = fgData[i] || [];
  const fValue = String(row[0] || '').trim();
  const gValue = String(row[1] || '').trim();
  
  // If F has text, copy to G (overwrite G)
  if (fValue !== '') {
    updates.push([fValue]); // New G value
  } else {
    // Keep existing G value if F is blank
    updates.push([gValue]);
  }
}

return [{
  json: {
    range: `G2:G11`,
    values: updates.map(u => [u[0] || ''])
  }
}];
```

### Code Node 4: Validate Transaction

```javascript
// Validate transaction before processing
const transaction = $input.first().json;
const rosterData = $('Read D2:E11').first().json.values || [];
const draftBoardData = $('Read Draft Board').first().json.values || [];

// Calculate current point total
let currentTotal = 0;
let rosterSize = 0;
for (const row of rosterData) {
  const pokemon = String(row[0] || '').trim();
  const points = parseInt(row[1] || 0);
  if (pokemon) {
    currentTotal += points;
    rosterSize++;
  }
}

// Get new Pokemon point value (if addition/replacement)
let newPoints = 0;
if (transaction.addPokemon) {
  // Look up in draft board
  // This would need to search draft board for point value
  // For now, assume we have it from previous node
  newPoints = transaction.addPokemonPoints || 0;
}

// Get dropped Pokemon point value (if drop/replacement)
let droppedPoints = 0;
if (transaction.dropPokemon) {
  // Find in current roster
  for (const row of rosterData) {
    const pokemon = String(row[0] || '').trim();
    if (pokemon.toLowerCase() === transaction.dropPokemon.toLowerCase()) {
      droppedPoints = parseInt(row[1] || 0);
      break;
    }
  }
}

// Calculate new total
let newTotal = currentTotal;
if (transaction.type === 'replacement') {
  newTotal = currentTotal - droppedPoints + newPoints;
} else if (transaction.type === 'addition') {
  newTotal = currentTotal + newPoints;
} else if (transaction.type === 'drop_only') {
  newTotal = currentTotal - droppedPoints;
}

// Validate
const validation = {
  valid: true,
  errors: [],
  newTotal: newTotal,
  newRosterSize: transaction.type === 'addition' ? rosterSize + 1 : 
                 transaction.type === 'drop_only' ? rosterSize - 1 : rosterSize
};

// Check point budget
if (newTotal > 120) {
  validation.valid = false;
  validation.errors.push(`Point budget exceeded: ${newTotal} > 120`);
}

// Check roster size
if (validation.newRosterSize < 8 || validation.newRosterSize > 10) {
  validation.valid = false;
  validation.errors.push(`Roster size violation: ${validation.newRosterSize} (must be 8-10)`);
}

// Check transaction limit (would need transaction history)
// Check Pokemon availability (would need draft board lookup)
// Check timing (would need current date/time)

return [{
  json: {
    ...transaction,
    validation: validation,
    currentTotal: currentTotal,
    newTotal: newTotal,
    currentRosterSize: rosterSize,
    newRosterSize: validation.newRosterSize
  }
}];
```

---

## 🔧 Implementation Steps

### Phase 1: Basic F→G Copy (User's Request)

1. ✅ Cron trigger
2. ✅ Get all sheets
3. ✅ Filter team pages
4. ✅ Loop through teams
5. ✅ Read F2:G11
6. ✅ Code: Copy non-blank F to G
7. ✅ Update G2:G11

### Phase 2: Transaction Detection

8. ✅ Code: Detect transaction type
9. ✅ Read D2:E11 (current roster)
10. ✅ Code: Extract transaction details

### Phase 3: Validation

11. ✅ Code: Validate point budget
12. ✅ Code: Validate roster size
13. ✅ Code: Check Pokemon availability
14. ✅ Code: Check transaction limit
15. ✅ Code: Check timing

### Phase 4: Processing

16. ✅ Code: Calculate roster updates
17. ✅ Google Sheets: Update D2:E11
18. ✅ Google Sheets: Update Draft Board
19. ✅ Google Sheets: Clear F2:F11
20. ✅ Log transaction

### Phase 5: Error Handling

21. ✅ IF node: Validation pass/fail
22. ✅ Error logging
23. ✅ Notification (optional)

---

## 📝 Key Considerations

### Transaction Timing:
- Transactions take effect **Monday 12:00AM EST**
- Workflow should process transactions at this time
- Or queue transactions and process on Monday

### Draft Board Updates:
- When Pokemon is dropped → Mark as available in Draft Board
- When Pokemon is added → Mark as drafted in Draft Board
- Need to find Pokemon in correct point value column

### Point Value Lookup:
- Need to search Draft Board for Pokemon point value
- Point values are in columns: I (20pts), L (19pts), O (18pts), R (17pts), U (16pts), X (15pts), etc.
- Pokemon names are in rows starting at row 5

### Roster Updates:
- D2:E11 contains current roster
- Need to add/remove/replace Pokemon
- Maintain point values in E column

---

## 🚀 Next Steps

1. **Confirm workflow logic** with user
2. **Implement Phase 1** (basic F→G copy)
3. **Test with one team** (Team 1)
4. **Add validation** (Phase 2-3)
5. **Add processing** (Phase 4)
6. **Add error handling** (Phase 5)
7. **Deploy and monitor**

---

**Note**: This workflow integrates with Google Sheets directly. For database integration (Supabase), additional API calls would be needed to sync roster changes to `team_rosters` table.
