# Team Builder Comparison & Recommendation

**Date**: January 15, 2026  
**Status**: Analysis of two team builder implementations

---

## Two Team Builder Implementations

### 1. **Draft Team Builder** (`/teams/builder`)
**Location**: `app/teams/builder/page.tsx`  
**Purpose**: Draft league team building with point budget

**Features**:
- ✅ Select Pokemon from available pool
- ✅ Track draft budget (120 points default)
- ✅ Type coverage analysis
- ✅ Pokemon search/filtering
- ✅ Budget tracking (spent/remaining)
- ✅ Generate Showdown format export
- ✅ Save to database
- ✅ Download as .txt file
- ✅ Generation/Format selectors

**Use Case**: 
- Building teams for draft league
- Tracking point costs
- Analyzing type coverage
- Creating initial team compositions

**Strengths**:
- Integrated with draft system
- Budget tracking
- Type analysis
- Visual Pokemon selection

**Limitations**:
- Doesn't edit detailed Pokemon sets (moves, EVs, IVs, items)
- Generates basic template only
- No validation against roster

---

### 2. **Team Validator** (`/showdown` → Team Validator tab)
**Location**: `components/showdown/team-validator.tsx`  
**Purpose**: Validate and edit Showdown format teams

**Features**:
- ✅ Upload/paste Showdown team export
- ✅ Parse and validate team format
- ✅ Extract metadata (generation, format, folder, name)
- ✅ Display canonical/prettified text
- ✅ Save validated teams to database
- ✅ File upload (.txt, .team)
- ✅ Copy to clipboard

**Use Case**:
- Validating teams from Showdown
- Editing existing teams
- Checking team format correctness
- Adding detailed Pokemon sets

**Strengths**:
- Full Showdown format support
- Validation and parsing
- File upload
- Metadata extraction

**Limitations**:
- No visual Pokemon selection
- No budget tracking
- No type coverage analysis
- Requires manual team text input

---

## Recommendation: **Keep Both** ✅

### Why Both Are Needed

1. **Different Workflows**:
   - **Draft Builder**: For initial team composition and planning
   - **Team Validator**: For detailed editing and validation

2. **Complementary Features**:
   - Draft Builder → Creates basic team structure
   - Team Validator → Adds detailed sets, validates, saves

3. **User Journey**:
   ```
   User → Draft Builder
     ↓
   Select Pokemon (budget tracking)
     ↓
   Generate Showdown format
     ↓
   Download or Save
     ↓
   Open in Team Validator
     ↓
   Add items, EVs, IVs, moves
     ↓
   Validate and Save
   ```

---

## Suggested Improvements

### Draft Team Builder (`/teams/builder`)
- ✅ Already generates Showdown format
- ✅ Already saves to database
- ✅ Already downloads files
- **Could add**: Link to Team Validator after save

### Team Validator (`/showdown`)
- ✅ Already validates teams
- ✅ Already saves to database
- **Could add**: 
  - Load teams from Team Library
  - Quick edit mode
  - Link to Draft Builder for new teams

### Team Library (`/showdown` → Team Library tab)
- ✅ Already shows saved teams
- ✅ Already supports export
- **Should add**:
  - Filter by stock vs user teams
  - User tagging UI
  - "Edit in Validator" button
  - "Create New in Builder" button

---

## Final Recommendation

**Keep both implementations** - they serve different purposes:

1. **Draft Team Builder** (`/teams/builder`):
   - Primary tool for draft league team building
   - Keep in navbar as "Team Builder"
   - Focus: Budget, type coverage, Pokemon selection

2. **Team Validator** (`/showdown` → Team Validator):
   - Tool for validating and editing Showdown teams
   - Keep in Showdown section
   - Focus: Validation, detailed editing, format correctness

3. **Team Library** (`/showdown` → Team Library):
   - Central hub for all teams (stock + user)
   - Add links to both builders
   - Add user tagging UI

---

## Next Steps

1. ✅ Add stock team flag to database
2. ✅ Update API to return stock teams
3. ✅ Update import script to mark teams as stock
4. ⏳ Add user tagging UI to Team Library
5. ⏳ Add "Stock" badge to Team Library
6. ⏳ Add links between builders (Draft → Validator → Library)

---

**Conclusion**: Both implementations are valuable and serve different purposes. Keep both and enhance integration between them.
