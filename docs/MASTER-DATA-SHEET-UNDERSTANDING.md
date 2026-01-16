# Master Data Sheet Structure & Free Agency Logic

> **Status**: Analysis Complete - Awaiting User Verification

---

## 📊 Master Data Sheet Structure

### Draft Results Blocks (A92:L120)

The Master Data Sheet contains **"Draft Results (20 Team Draft)"** blocks that record actual draft picks:

#### Block 1: Teams 1-11 (Rows 94-103)
- **Row 94**: Headers with team names (Columns B-K)
  - Column B: Arkansas Fighting Hogs
  - Column C: Leicester Lycanrocs
  - Column D: Miami Blazins
  - ... (Teams 1-11)
- **Rows 95-103**: Draft picks by round
  - Row 95 (Round 1): Column B = "Iron Valiant", Column C = "Raging Bolt", etc.
  - Row 96 (Round 2): Column B = "Ting-Lu", Column C = "Urshifu Rapid Strike", etc.
- **Row 105**: Coach names
- **Row 106**: Remaining draft points

#### Block 2: Teams 12-20 (Rows 109-119)
- **Row 109**: Headers with team names (Columns B-K)
  - Column B: Liverpool Lunalas
  - Column C: Manchester Milcerys
  - ... (Teams 12-20)
- **Rows 110-119**: Draft picks by round
  - Row 110 (Round 1): Column B = "Chi-Yu", Column C = "Cinderace", etc.
- **Row 120**: Coach names
- **Row 121**: Remaining draft points

#### Additional Blocks (Rows 551-561+)
- Similar structure for other seasons or data views
- Referenced by Data sheet: `{'Master Data Sheet'!A552:T561}`

### Key Structure Points:
- **Team Assignment = Column Position**
  - If Pokemon is in Column A → Belongs to "Arkansas Fighting Hogs"
  - If Pokemon is in Column B → Belongs to "Leicester Lycanrocs"
  - etc.

- **Draft Order = Row Position**
  - Row 553 = Round 1 picks
  - Row 554 = Round 2 picks
  - etc.

---

## 🔄 Draft Process Flow

1. **Draft happens** → Pokemon are selected in snake draft order
2. **Master Data Sheet is filled** → Each Pokemon is placed in:
   - Appropriate row (round number)
   - Appropriate column (team that drafted it)
3. **Team Pages updated** → D2:E11 shows current roster

**Example:**
- Team 1 drafts "Iron Valiant" in Round 1 → Place in A553
- Team 1 drafts "Ting-Lu" in Round 2 → Place in A554
- Team 2 drafts "Raging Bolt" in Round 1 → Place in B553

---

## 🔄 Free Agency Transaction Process

### Transaction Types:

1. **Replacement** (F has Pokemon, G has "Dropping: [Name]")
   - Remove dropped Pokemon from team roster
   - Add new Pokemon to team roster
   - Update Master Data Sheet for both

2. **Addition** (F has Pokemon, G is blank)
   - Add Pokemon to team roster
   - Update Master Data Sheet

3. **Drop Only** (F is blank, G has "Dropping: [Name]")
   - Remove Pokemon from team roster
   - Update Master Data Sheet

### Master Data Sheet Update Logic:

#### For Dropped Pokemon:
1. **Find Pokemon** in Master Data Sheet draft result blocks
   - Search Block 1 (rows 95-103) and Block 2 (rows 110-119) for Pokemon name
   - Also check rows 551-561+ if needed
   - Identify which column (team) it's in within that block
   - Example: "Ting-Lu" found at B96 → Team = "Arkansas Fighting Hogs" (Column B in Block 1)

2. **Clear team assignment**
   - Clear the cell where Pokemon is found
   - This removes Pokemon from team's roster in Master Data Sheet
   - Example: Clear B96 (remove "Ting-Lu" from Arkansas Fighting Hogs)

#### For Added Pokemon:
1. **Identify team** from Team Page
   - Determine which block contains the team (Block 1 = Teams 1-11, Block 2 = Teams 12-20)
   - Map Team Page name to Master Data Sheet column within appropriate block
   - Example: "Team 1" = Column B in Block 1 = "Arkansas Fighting Hogs"

2. **Find empty cell** in team's column within appropriate block
   - Search team's column in Block 1 (rows 95-103) or Block 2 (rows 110-119)
   - Find first empty cell or add to end of team's roster
   - Example: Find empty cell in Column B (Block 1, rows 95-103), add Pokemon there

3. **Add Pokemon**
   - Place Pokemon name in identified cell
   - Example: Add "Slowking" to empty cell in Column B (Block 1)

---

## 📋 Free Agency Rules (from Rules Sheet)

- **Budget**: 120 points total (must stay within cap)
- **Roster Size**: 8-10 Pokemon
- **Transaction Limit**: Up to 10 F/A transactions through Week 8
- **Timing**: Transactions take effect Monday 12:00AM EST
- **Trading**: Coach-to-coach trades count toward 10 transaction limit

---

## 💻 N8N Workflow Implementation Plan

### Step 1: Detect Transaction
- Monitor F2:F11 (additions) and G2:G11 (drops) on Team Pages
- Detect transaction type (replacement/addition/drop)

### Step 2: Find Pokemon in Master Data Sheet
- **For dropped Pokemon:**
  - Extract name from G ("Dropping: [Name]")
  - Search rows 553+ for Pokemon name
  - Identify column (team assignment)
  - Get cell reference (e.g., A554)

- **For added Pokemon:**
  - Get Pokemon name from F
  - Identify team from Team Page
  - Map team to Master Data Sheet column
  - Find empty cell in that column

### Step 3: Update Master Data Sheet
- **Dropped Pokemon:**
  - Clear cell (set to empty string) in appropriate draft result block
  - Example: Update B96 = "" (remove "Ting-Lu" from Block 1, Column B)

- **Added Pokemon:**
  - Set cell value to Pokemon name in appropriate draft result block
  - Example: Update B104 = "Slowking" (add to Block 1, Column B, first empty row)

### Step 4: Update Team Page
- Update D2:E11 roster
- Clear F2:F11 (transaction processed)
- Clear/Update G2:G11

---

## ❓ Questions Answered

### ✅ Where are individual Pokemon rows with team assignments?
**Answer**: Draft result blocks in Master Data Sheet:
- **Block 1**: Rows 95-103 (Teams 1-11, Columns B-K)
- **Block 2**: Rows 110-119 (Teams 12-20, Columns B-K)
- **Additional blocks**: Rows 551-561+ for other seasons/views
- Each Pokemon appears in a cell where:
  - Row = Draft round
  - Column = Team assignment (within that block)

### ✅ Which column contains team assignments?
**Answer**: The column position within each block IS the team assignment:
- **Block 1**: Column B = Team 1 ("Arkansas Fighting Hogs"), Column C = Team 2, etc.
- **Block 2**: Column B = Team 12 ("Liverpool Lunalas"), Column C = Team 13, etc.
- Row 94 (Block 1) and Row 109 (Block 2) contain the team name headers

### ✅ How to update Master Data Sheet for free agency?
**Answer**: 
- **Dropped Pokemon**: 
  1. Search draft result blocks (rows 95-103, 110-119, 551-561+) for Pokemon name
  2. Identify which block and column it's in
  3. Clear that cell (set to empty string)
- **Added Pokemon**: 
  1. Identify team and determine which block contains it
  2. Find team's column within that block
  3. Find empty cell in that column
  4. Add Pokemon name to that cell

### ✅ How to map Team Page to Master Data Sheet column?
**Answer**: 
- **Block 1** (Teams 1-11): Use Row 94 headers (Columns B-K)
- **Block 2** (Teams 12-20): Use Row 109 headers (Columns B-K)
- Match Team Page name to team name in header row to get column
- Example: "Team 1" → "Arkansas Fighting Hogs" → Column B in Block 1

---

## 🔍 Verification Needed

Please verify:

1. **Dropped Pokemon Update**: When a Pokemon is dropped, should we:
   - Clear the cell completely (set to empty)?
   - OR mark it somehow (e.g., add "DROPPED" prefix)?

2. **Added Pokemon Placement**: When a Pokemon is added, should we:
   - Add to first empty cell in team's column?
   - OR add to end of team's roster (last row with data)?
   - OR maintain draft order somehow?

3. **Team Page Mapping**: How do Team Page names map to Master Data Sheet columns?
   - "Team 1" → Column A?
   - "Team 2" → Column B?
   - OR use team names from Row 552?

4. **Multiple Occurrences**: If a Pokemon appears multiple times (different forms?), how do we handle it?

---

**Status**: Ready for user verification and clarification on implementation details.
