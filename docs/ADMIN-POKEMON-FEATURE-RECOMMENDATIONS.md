# Admin Pokémon Draft Pool Management - Feature Recommendations

**Date:** 2026-01-20  
**Purpose:** Enhancements to streamline the Commissioner's manual draft pool selection process

---

## Executive Summary

The Commissioner currently manually manages ~778 Pokémon each season, assigning point values, marking banned Pokémon, and ensuring balanced distribution. The following features are prioritized by **time savings** and **workflow efficiency**.

---

## 🔥 HIGH PRIORITY (Maximum Time Savings)

### 1. **Bulk Operations & Multi-Select**
**Impact:** ⭐⭐⭐⭐⭐ (Saves hours of repetitive clicking)

**Features:**
- **Multi-select checkboxes** for individual Pokémon rows
- **Bulk actions toolbar** appears when Pokémon are selected:
  - "Bulk Assign Tier" → Apply tier to all selected
  - "Bulk Assign Point Value" → Set point value for all selected
  - "Bulk Toggle Availability" → Mark all selected as available/banned
  - "Bulk Mark as Tera Banned" → Mark all selected as Tera banned (still draftable)
- **Select all visible** checkbox (already exists, enhance with bulk actions)
- **Select by filter** → "Select all OU Pokémon", "Select all Gen 1", etc.

**UI Example:**
```
[☑️ Select All] [Bulk Actions ▼] [Assign Tier: OU ▼] [Set Points: 19 ▼] [Mark Available] [Mark Banned]
```

**Implementation:**
- Add `selectedPokemonIds: Set<number>` state
- Bulk action buttons disabled when no selection
- Show count: "5 Pokémon selected"
- Confirmation dialog for bulk operations

---

### 2. **Preset Banned Lists (One-Click Actions)**
**Impact:** ⭐⭐⭐⭐⭐ (Eliminates manual lookup and marking)

**Features:**
- **Quick Action Buttons** in toolbar:
  - "Ban All Box Legendaries" → Auto-marks Arceus, Dialga, Palkia, etc.
  - "Ban All Pokémon of Ruin" → Auto-marks Chi-Yu, Chien-Pao, Ting-Lu, Wo-Chien
  - "Ban All Urshifu Forms" → Auto-marks Urshifu Single/Rapid Strike
  - "Ban All Paradox Pokémon" → Auto-marks Gouging Fire, Raging Bolt, Flutter Mane, etc.
  - "Ban All Terapagos Forms" → Auto-marks Terapagos
- **Custom Preset Builder** → Save custom banned lists for reuse
- **Preset Library** → "Season 5 Standard", "High-Power Meta", "Balanced Pool"

**UI Example:**
```
[Quick Actions ▼] [Ban Box Legendaries] [Ban Pokémon of Ruin] [Ban Paradox] [Custom Preset ▼]
```

**Data Source:**
- Use existing banned lists from `draft-pool-logic.json`
- Store presets in database or config file
- Apply instantly with batch update

---

### 3. **Copy from Previous Season**
**Impact:** ⭐⭐⭐⭐⭐ (Starts with 90% done, only modify differences)

**Features:**
- **"New Season from Template"** button
- **Season selector** → Choose previous season to copy from
- **Copy options:**
  - ✅ Copy all Pokémon with point values
  - ✅ Copy availability status
  - ✅ Copy banned/Tera banned status
  - ⚠️ Copy tier assignments (may need updates)
- **Diff view** → Show what changed between seasons
- **Smart updates** → Auto-update tiers if Showdown data changed

**UI Example:**
```
[New Season] → Select: "Season 5" → [Copy All] [Copy with Updates] [Preview Changes]
```

**Implementation:**
- Query `draft_pool` for previous season
- Batch insert into new season
- Show comparison table: "Added 12 Pokémon, Removed 8, Changed 45 point values"

---

### 4. **Point Distribution Analytics & Validation**
**Impact:** ⭐⭐⭐⭐ (Prevents manual counting and balance issues)

**Features:**
- **Real-time Statistics Dashboard** (sidebar or top bar):
  - Total available Pokémon count
  - Point value distribution (bar chart)
  - Type coverage (pie chart)
  - Generation distribution
  - Tier distribution
- **Validation Warnings:**
  - ⚠️ "Too many high-tier Pokémon (20+ pts): 50 available (recommended: 20-30)"
  - ⚠️ "Not enough low-tier Pokémon (1-5 pts): 100 available (recommended: 200+)"
  - ⚠️ "Missing type coverage: No Dark-type Pokémon available"
  - ⚠️ "Unbalanced distribution: 60% of pool is Gen 1"
- **Balance Recommendations** → "Add 20 more 1-pt Pokémon for balance"

**UI Example:**
```
Statistics:
├─ Total Available: 764
├─ Point Distribution:
│  ├─ 20 pts: 7 ⚠️ (low)
│  ├─ 19 pts: 11 ✅
│  ├─ 1 pt: 225 ✅
├─ Type Coverage: 18/18 ✅
└─ Generation Balance: Gen 1-9 ✅
```

**Implementation:**
- Use `useMemo` to calculate stats from filtered Pokémon
- Chart library: `recharts` or `chart.js`
- Validation rules as constants

---

### 5. **Smart Tier Assignment**
**Impact:** ⭐⭐⭐⭐ (Auto-assigns 80% of point values correctly)

**Features:**
- **"Auto-Assign Points from Tiers"** button
- Reads `pokemon_showdown.tier` for each Pokémon
- Maps tier → point value automatically
- **Override mode:** Only assign if Pokémon doesn't have a point value yet
- **Preview changes** before applying
- **Manual override** still available (editable dropdowns)

**UI Example:**
```
[Auto-Assign from Tiers] → Preview: "Will assign 650 Pokémon" → [Apply] [Cancel]
```

**Implementation:**
- Batch query `pokemon_showdown` for all Pokémon
- Use existing `mapTierToPointValue()` function
- Show preview table: "Pokémon X: No Tier → 5 pts", "Pokémon Y: OU → 19 pts"

---

## 🟡 MEDIUM PRIORITY (Significant Improvements)

### 6. **Season Comparison View**
**Impact:** ⭐⭐⭐ (Helps understand changes and maintain consistency)

**Features:**
- **"Compare with Previous Season"** toggle
- **Side-by-side view:**
  - Left: Current season (editable)
  - Right: Previous season (read-only)
- **Diff indicators:**
  - 🟢 Green: Added in current season
  - 🔴 Red: Removed from previous season
  - 🟡 Yellow: Point value changed
  - ⚪ Gray: Unchanged
- **Filter by change type** → "Show only changed Pokémon"

**UI Example:**
```
[Compare with Season 5] → Split view with diff highlighting
```

---

### 7. **Export/Import Functionality**
**Impact:** ⭐⭐⭐ (Enables backup, sharing, and Google Sheets compatibility)

**Features:**
- **Export options:**
  - CSV (for Excel/Google Sheets)
  - JSON (for backup/API)
  - Google Sheets format (direct upload)
- **Import options:**
  - CSV import (map columns)
  - JSON import (from previous export)
  - Google Sheets import (read from URL)
- **Export filters** → Export only available Pokémon, only banned, etc.

**UI Example:**
```
[Export ▼] [CSV] [JSON] [Google Sheets] | [Import ▼] [From File] [From Google Sheets]
```

---

### 8. **Advanced Filtering & Search**
**Impact:** ⭐⭐⭐ (Faster navigation in 778 Pokémon)

**Features:**
- **Multi-criteria filters:**
  - By type (multi-select: Fire, Water, Grass)
  - By ability (search by ability name)
  - By base stat range (HP > 100, Speed < 50)
  - By competitive usage % (from Showdown stats)
- **Saved filter presets** → "High-Tier OU+", "Low-Tier Budget Options"
- **Search enhancements:**
  - Autocomplete suggestions
  - Search by ID, name, or nickname
  - Fuzzy search (typo tolerance)

**UI Example:**
```
Search: [Pikachu          🔍]
Filters: [Type: Fire ▼] [Tier: OU+ ▼] [Points: 15-20 ▼] [Save Filter]
```

---

### 9. **Undo/Redo & Change History**
**Impact:** ⭐⭐⭐ (Prevents mistakes and enables experimentation)

**Features:**
- **Undo/Redo stack** (last 50 actions)
- **Keyboard shortcuts:** Ctrl+Z (undo), Ctrl+Y (redo)
- **Change history panel** → "Changed 15 Pokémon in last 5 minutes"
- **Revert to saved** → Discard all unsaved changes
- **Session recovery** → Restore unsaved changes if page reloads

**UI Example:**
```
[Undo] [Redo] | Last saved: 2 minutes ago | [Revert All Changes]
```

---

## 🟢 LOW PRIORITY (Nice-to-Have)

### 10. **Competitive Data Integration**
**Impact:** ⭐⭐ (Provides context for decisions)

**Features:**
- **Showdown usage stats** → Display usage % next to tier
- **Base stats display** → Show HP/Atk/Def/SpA/SpD/Spe in tooltip
- **Ability list** → Show all abilities in tooltip
- **Move pool preview** → Show key moves in tooltip
- **Competitive analysis** → "This Pokémon is OU but rarely used (2% usage)"

**UI Example:**
```
Hover over Pokémon → Tooltip shows:
├─ Base Stats: 78/84/78/109/85/100
├─ Abilities: Overgrow, Chlorophyll (H)
├─ Usage: OU (5.2% usage)
└─ Key Moves: Solar Beam, Weather Ball, Earth Power
```

---

### 11. **Visual Enhancements**
**Impact:** ⭐⭐ (Improves UX and reduces eye strain)

**Features:**
- **Color coding:**
  - 🔴 Red background: Banned
  - 🟡 Yellow background: Tera Banned
  - 🟢 Green border: Available
  - ⚪ Gray: Unavailable/Drafted
- **Row highlighting** on hover
- **Sticky header** (table header stays visible when scrolling)
- **Compact/Dense view** toggle (show more rows per page)
- **Dark mode** support

---

### 12. **Collaboration Features**
**Impact:** ⭐ (If multiple commissioners)

**Features:**
- **Comments/Notes** per Pokémon → "Banned due to Season 5 meta"
- **Change tracking** → "User X changed point value from 15 to 19"
- **Approval workflow** → Draft → Review → Publish
- **Activity log** → "Last modified by User X 2 hours ago"

---

## 📊 Implementation Priority Matrix

| Feature | Time Saved | Complexity | Priority | Estimated Effort |
|---------|------------|------------|----------|------------------|
| Bulk Operations | 5+ hours | Medium | 🔥 HIGH | 2-3 days |
| Preset Banned Lists | 2+ hours | Low | 🔥 HIGH | 1 day |
| Copy from Previous Season | 3+ hours | Medium | 🔥 HIGH | 2 days |
| Point Distribution Analytics | 1+ hour | Medium | 🔥 HIGH | 2 days |
| Smart Tier Assignment | 2+ hours | Low | 🔥 HIGH | 1 day |
| Season Comparison | 1 hour | Medium | 🟡 MEDIUM | 2 days |
| Export/Import | 1 hour | Medium | 🟡 MEDIUM | 2 days |
| Advanced Filtering | 30 min | Medium | 🟡 MEDIUM | 1-2 days |
| Undo/Redo | 30 min | Medium | 🟡 MEDIUM | 1 day |
| Competitive Data | 15 min | High | 🟢 LOW | 3+ days |
| Visual Enhancements | 15 min | Low | 🟢 LOW | 1 day |
| Collaboration | N/A | High | 🟢 LOW | 5+ days |

---

## 🎯 Recommended Implementation Order

### Phase 1 (Week 1): Maximum Impact
1. ✅ Bulk Operations & Multi-Select
2. ✅ Preset Banned Lists
3. ✅ Copy from Previous Season

### Phase 2 (Week 2): Quality of Life
4. ✅ Point Distribution Analytics
5. ✅ Smart Tier Assignment
6. ✅ Export/Import

### Phase 3 (Week 3+): Polish
7. ✅ Season Comparison
8. ✅ Advanced Filtering
9. ✅ Undo/Redo

---

## 💡 Additional Property Types to Consider

### Data Properties (Already Available):
- ✅ Pokémon ID, Name, Generation, Types, Tier, Point Value, Availability

### Additional Properties to Add:
- **Base Stats** (HP, Attack, Defense, SpA, SpD, Speed) → For competitive analysis
- **Abilities** (Primary, Secondary, Hidden) → For filtering/searching
- **Competitive Usage %** → From Showdown stats (if available)
- **Previous Season Status** → Was it available/banned last season?
- **Draft History** → How many times drafted across seasons?
- **Tera Captain Eligible** → Can it be a Tera Captain? (boolean)
- **Form Variants** → Track different forms separately (e.g., Rotom forms)
- **Banned Reason** → Text field explaining why banned
- **Notes/Comments** → Free-text field for Commissioner notes

---

## 🔧 Technical Considerations

### Database Changes Needed:
- Add `base_stats JSONB` column to `draft_pool` (or join with `pokepedia_pokemon`)
- Add `abilities JSONB` column (or join)
- Add `notes TEXT` column for Commissioner comments
- Add `banned_reason TEXT` column (may already exist)
- Add `previous_season_status TEXT` (computed or stored)

### API Enhancements:
- Bulk update endpoint: `POST /api/admin/pokemon/bulk` with array of updates
- Preset application endpoint: `POST /api/admin/pokemon/apply-preset`
- Season copy endpoint: `POST /api/admin/pokemon/copy-season`
- Statistics endpoint: `GET /api/admin/pokemon/stats`

### UI Components Needed:
- Multi-select checkbox component
- Bulk actions toolbar
- Statistics dashboard component
- Chart components (bar, pie)
- Comparison view component
- Export/import modals

---

## 📝 Next Steps

1. **Review with Commissioner** → Prioritize features based on actual workflow
2. **Create implementation plan** → Break down into tasks
3. **Start with Phase 1** → Maximum time savings first
4. **Iterate based on feedback** → Adjust priorities as needed

---

**Status:** 📋 Recommendations Ready for Review
