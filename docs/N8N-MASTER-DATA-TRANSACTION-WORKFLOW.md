# N8N Master Data Sheet Transaction Workflow

> **Goal**: Update Master Data Sheet when free agency transactions occur (replacement, addition, drop)

---

## 🎯 Understanding the Flow

### Draft Process:
1. **Draft happens** → Pokemon are selected
2. **Master Data Sheet is filled** → Each Pokemon row gets team assignment
3. **Team Pages updated** → D2:E11 shows roster

### Free Agency Transaction Process:
1. **Coach updates Team Page**:
   - F2:F11: Pokemon being added
   - G2:G11: Pokemon being dropped (format: "Dropping: [Name]")
2. **N8N Workflow processes**:
   - Detects transaction type
   - **Updates Master Data Sheet** for dropped Pokemon (clear team assignment)
   - **Updates Master Data Sheet** for added Pokemon (set team assignment)
   - Updates Team Page roster (D2:E11)
   - Clears F2:F11

---

## 📊 Master Data Sheet Structure Analysis

### Current Understanding:

**Draft Section (Rows ~94-103):**
- Row 94: Header with team names (B-L columns)
- Rows 95-103: Draft picks
  - Column A: Team number (1-9)
  - Column B: First Pokemon
  - Columns C-L: Other Pokemon for that team

**Team Assignment Section (Rows ~200+):**
- Column B: Team Number
- Column C: Team Name
- Column D: Pokemon Name
- Column E: Kills/Stats

**Key Question**: Where is the individual Pokemon → Team assignment table?
- Need to find: Pokemon name column + Team assignment column
- This is what gets updated during free agency

---

## 🔄 Workflow Design: Master Data Sheet Updates

### Step 1: Detect Transaction

For each team page:
1. Read F2:F11 (additions)
2. Read G2:G11 (drops)
3. Detect transaction type:
   - **Replacement**: F has Pokemon AND G has "Dropping: [Name]"
   - **Addition**: F has Pokemon AND G is blank
   - **Drop Only**: F is blank AND G has "Dropping: [Name]"

### Step 2: Find Pokemon in Master Data Sheet

**For Dropped Pokemon:**
1. Extract Pokemon name from G ("Dropping: [Name]")
2. Search Master Data Sheet for Pokemon row
3. Find team assignment column
4. Clear team assignment (set to blank or "Free Agency")

**For Added Pokemon:**
1. Get Pokemon name from F
2. Search Master Data Sheet for Pokemon row
3. Find team assignment column
4. Set team assignment to current team name/number

### Step 3: Update Master Data Sheet

**Update Operations:**
- Use Google Sheets "Update" operation
- Find row by Pokemon name (search column with Pokemon names)
- Update team assignment column
- Handle multiple sections if Pokemon appears in multiple places

---

## 💻 N8N Workflow Structure

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
5. Google Sheets: Read F2:G11 (Team Page)
   ↓
6. Code: Detect Transaction Type
   ├─→ Extract dropped Pokemon from G
   ├─→ Get added Pokemon from F
   └─→ Determine transaction type
   ↓
7. Google Sheets: Read Master Data Sheet (Search for Pokemon)
   ↓
8. Code: Find Pokemon Rows
   ├─→ Search for dropped Pokemon
   ├─→ Search for added Pokemon
   └─→ Identify team assignment column
   ↓
9. IF Replacement Transaction:
   ├─→ Google Sheets: Update Master Data (Clear dropped Pokemon's team)
   ├─→ Google Sheets: Update Master Data (Set added Pokemon's team)
   └─→ Google Sheets: Update Team Page (D2:E11)
   ↓
10. IF Addition Transaction:
    ├─→ Google Sheets: Update Master Data (Set added Pokemon's team)
    └─→ Google Sheets: Update Team Page (D2:E11)
    ↓
11. IF Drop Only Transaction:
    ├─→ Google Sheets: Update Master Data (Clear dropped Pokemon's team)
    └─→ Google Sheets: Update Team Page (D2:E11)
    ↓
12. Google Sheets: Clear F2:F11 (Transaction processed)
13. Google Sheets: Clear/Update G2:G11
```

---

## 🔍 Master Data Sheet Search Logic

### Finding Pokemon Rows:

**Option 1: Search by Pokemon Name**
```javascript
// Search Master Data Sheet for Pokemon name
// Look in column that contains Pokemon names (likely Column B or D)
// Find matching row
// Update team assignment column
```

**Option 2: Search Multiple Sections**
```javascript
// Master Data Sheet may have multiple sections:
// - Draft section (rows 94-103)
// - Team assignment section (rows 200+)
// - Individual Pokemon tracking section (unknown location)
// Need to search all sections and update all occurrences
```

### Team Assignment Column Identification:

**Possible Columns:**
- Column A: Team number
- Column C: Team name
- Unknown column: Current team assignment

**Update Logic:**
- For dropped Pokemon: Clear team assignment (set to blank)
- For added Pokemon: Set to current team name/number

---

## 📝 Code Node: Find and Update Pokemon in Master Data

```javascript
// Find Pokemon in Master Data Sheet and update team assignment
const transaction = $input.first().json;
const masterDataSheet = "Master Data Sheet";

// Get team name from current team page
const teamSheetName = $('Loop Over Items').item.json.title;
const teamName = teamSheetName.replace('Team ', ''); // Extract team number or name

// Read Master Data Sheet to find Pokemon
// This would need to search the entire sheet or specific sections
// For now, placeholder logic:

const updates = [];

// For dropped Pokemon
if (transaction.dropPokemon) {
  updates.push({
    pokemon: transaction.dropPokemon,
    action: 'clear_team',
    teamAssignment: '' // Clear team assignment
  });
}

// For added Pokemon
if (transaction.addPokemon) {
  updates.push({
    pokemon: transaction.addPokemon,
    action: 'set_team',
    teamAssignment: teamName // Set to current team
  });
}

return updates.map(update => ({
  json: {
    ...update,
    masterDataSheet: masterDataSheet,
    needsMasterDataUpdate: true
  }
}));
```

---

## ❓ Questions to Resolve

1. **Master Data Sheet Structure**:
   - Where exactly are individual Pokemon rows with team assignments?
   - Which column contains Pokemon names?
   - Which column contains team assignments?
   - Are there multiple sections that need updating?

2. **Update Strategy**:
   - Update all occurrences of Pokemon in Master Data Sheet?
   - Or only update specific section?
   - How to handle Pokemon that appear in multiple places?

3. **Team Identification**:
   - Use team number (1, 2, 3...) or team name ("Arkansas Fighting Hogs")?
   - How to map team page name to Master Data Sheet format?

---

## 🚀 Next Steps

1. **Confirm Master Data Sheet structure** with user
2. **Identify Pokemon → Team assignment columns**
3. **Test search and update logic** with one Pokemon
4. **Build full workflow** with Master Data Sheet updates
5. **Add validation** (budget, roster size, etc.)
6. **Test end-to-end** transaction flow

---

**Note**: This workflow focuses on Google Sheets updates first. Supabase integration can be added later once the Master Data Sheet update logic is confirmed and working.
