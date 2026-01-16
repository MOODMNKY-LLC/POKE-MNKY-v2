# Draft & Free Agency Logic - Verified Understanding

> **Status**: ✅ Verified by User

---

## 📊 Data Sources & Flow

### Draft Pool & Point Values
- **Source**: Draft Board sheet
- **Origin**: Draft Board pulls from Pokédex (columns J/M/P/S/... pointing to 'Pokédex'!$P:$N:$O)
- **Purpose**: Defines available Pokemon and their point values (20pts, 19pts, ... 12pts)
- **Tracking**: Draft Board!BS5:BS tracks drafted Pokemon and uses BT/BU to flag as drafted and track points left

### Draft Results (Actual Picks)
- **Source**: Master Data Sheet - "Draft Results (20 Team Draft)" blocks
- **Location**: 
  - **Block 1**: Rows 94-103 (Teams 1-11, Columns B-K)
  - **Block 2**: Rows 110-119 (Teams 12-20, Columns B-K)
  - **Additional**: Rows 551-561+ (referenced by Data sheet)
- **Structure**:
  - Row 94/109: Team name headers
  - Rows 95-103/110-119: Draft picks by round
  - Row 105/120: Coach names
  - Row 106/121: Remaining draft points

### Data References
- **Draft Board**: Pulls drafted list from Master Data Sheet ranges:
  - `{'Master Data Sheet'!B93:B103; ... ; 'Master Data Sheet'!K108:K118}`
- **Data Sheet**: References `{'Master Data Sheet'!A552:T561}`

---

## 🔄 Free Agency Transaction Logic

### For Replacement Transactions (Type 1)

**When a Pokemon is dropped:**
1. Extract Pokemon name from G2:G11 ("Dropping: [Name]")
2. Search Master Data Sheet draft result blocks:
   - Block 1: Rows 95-103
   - Block 2: Rows 110-119
   - Additional blocks: Rows 551-561+ if needed
3. Find Pokemon in appropriate block
4. Identify column (team assignment)
5. **Clear the cell** (set to empty string)
   - This removes Pokemon from team's roster
   - Example: "Ting-Lu" at B96 → Clear B96 = ""

**When a Pokemon is added:**
1. Get Pokemon name from F2:F11
2. Identify team from Team Page
3. Determine which block contains the team:
   - Teams 1-11 → Block 1 (Rows 95-103)
   - Teams 12-20 → Block 2 (Rows 110-119)
4. Map team to column using header row (Row 94 or Row 109)
5. Find empty cell in team's column within that block
6. **Add Pokemon name** to that cell
   - Example: Add "Slowking" to first empty cell in Column B (Block 1)

---

## ✅ Verified Understanding

### Master Data Sheet Structure
- ✅ Draft results stored in blocks (A92:L120)
- ✅ Block 1: Teams 1-11 (Rows 94-103)
- ✅ Block 2: Teams 12-20 (Rows 110-119)
- ✅ Column position = Team assignment within block
- ✅ Row position = Draft round

### Free Agency Updates
- ✅ **Dropped Pokemon**: Find in draft blocks, clear cell
- ✅ **Added Pokemon**: Find team's block/column, add to empty cell
- ✅ Updates affect Master Data Sheet draft result blocks
- ✅ Draft Board automatically reflects changes via formulas

### Data Flow Confirmation
- ✅ Draft Board = Draftable pool + point values (from Pokédex)
- ✅ Master Data Sheet = Actual draft picks (who picked what)
- ✅ Draft Board references Master Data Sheet for drafted status
- ✅ Free agency updates Master Data Sheet → Draft Board reflects changes

---

## 🚀 Ready for Implementation

The N8N workflow can now be implemented with:
1. Search logic for draft result blocks
2. Team-to-block/column mapping
3. Cell update logic (clear for drops, add for additions)
4. Validation (budget, roster size, transaction limits)

**Next Step**: Implement N8N workflow with Master Data Sheet update logic.
