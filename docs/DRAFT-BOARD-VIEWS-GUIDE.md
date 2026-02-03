# Draft Board Views Guide

**Purpose**: Create filtered views in Notion to show only Pokémon where "Added to Draft Board" is checked, enabling season-specific views like "Draft Board Season 7".

---

## Bulk Updating "Added to Draft Board" Checkbox

### Option 1: Notion UI (Manual)

**Select All Visible:**
1. In Table View, click the checkbox in the column header (selects all visible rows)
2. Right-click selected rows → **"Edit property"** → **"Added to Draft Board"** → Check/Uncheck
3. **Limitation**: Only selects visible rows (may need to scroll/paginate)

**Select by Filter:**
1. Create a filtered view (e.g., filter by Point Value, Status, etc.)
2. Select all visible rows in that view
3. Bulk edit "Added to Draft Board" property
4. **Limitation**: Still only affects visible rows

### Option 2: Script (Recommended for Bulk Operations)

Use the bulk update script to update all Pokémon at once:

```bash
# Set ALL Pokémon to checked
pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked

# Set ALL Pokémon to unchecked
pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-unchecked

# Set only Pokémon with Point Value set to checked
pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked --only-with-point-value

# Set only Available Pokémon to checked
pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked --status Available

# Dry run (preview changes without making them)
pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked --dry-run

# Test with first 50 entries
pnpm exec tsx --env-file=.env.local scripts/bulk-update-added-to-draft-board.ts --set-checked --limit 50
```

**Advantages:**
- ✅ Updates ALL Pokémon (not just visible)
- ✅ Can filter by criteria (Point Value, Status, etc.)
- ✅ Dry-run mode to preview changes
- ✅ Progress tracking and error handling

---

## Overview

The Notion API **does not support creating database views programmatically**. Views are UI-only constructs that you must create manually in Notion. However, this guide provides:

1. **Step-by-step instructions** for creating filtered views in Notion UI
2. **Filter structure documentation** for reference
3. **Helper script** to validate which Pokémon are included

---

## Creating Filtered Views in Notion UI

### Step 1: Open Your Draft Board Database

Navigate to your Draft Board database:
- **URL**: https://www.notion.so/5e58ccd73ceb44ed83de826b51cf5c36
- Or find it in your workspace under "POKE MNKY v4"

### Step 2: Create a New View

1. Click the **"+"** button next to existing views (or right-click the database → "Add a view")
2. Choose **"Table"** or **"Gallery"** view type
   - **Table View**: Best for data-focused browsing (point values, stats, types)
   - **Gallery View**: Best for visual browsing (shows covers prominently as cards)
3. Name your view (e.g., **"Draft Board Season 7"**)

### Step 3: Add Filter

1. Click the **"Filter"** button (funnel icon) in the view toolbar
2. Click **"Add a filter"**
3. Select property: **"Added to Draft Board"**
4. Set condition: **"is checked"** (or "equals" → "Checked")
5. Click **"Done"**

### Step 4: Configure View Settings (Optional)

#### For Gallery View:
- **Card preview**: Choose "Cover" (shows artwork prominently)
- **Card size**: Medium or Large (recommended)
- **Visible properties**: Select which properties appear on cards (e.g., Name, Point Value, Type 1)
- **Fit image**: "Cover" (fills card) or "Contain" (shows full artwork)

#### For Table View:
- **Sort by**: Point Value (descending) or Name (ascending)
- **Group by**: Type 1, Point Value, or Generation (optional)
- **Visible columns**: Show/hide columns as needed
- **Column width**: Drag column borders to resize (see "Optimizing Table View Layout" below)

#### For Board View (Kanban):
- **Group by**: Point Value (creates columns for each point tier: 20, 19, 18, etc.)
- **Card preview**: Choose "Cover" (shows artwork) or "Page content"
- **Card size**: Medium or Large
- **Visible properties**: Select which properties appear on cards (e.g., Name, Type 1, Status)
- **Sort within groups**: Name (ascending) or Point Value (descending)

### Step 5: Save and Use

Your filtered view is now saved and appears in the view switcher. Only Pokémon where "Added to Draft Board" is checked will appear.

---

## Optimizing Table View Layout

To reduce excess space and make better use of screen real estate in Table View:

### 1. Resize Columns

- **Hover** over the border between column headers (e.g., between "Name" and "Point Value")
- **Drag** the border left or right to make columns narrower or wider
- **Narrow columns** for properties with short values (Point Value, Type 1, Generation)
- **Wider columns** only for properties that need more space (Name, Abilities, Notes)

### 2. Hide Unnecessary Columns

- **Right-click** on any column header
- Select **"Hide property"** to remove it from the view
- **Show only essential columns** for your workflow:
  - Essential: Name, Point Value, Type 1, Status, Added to Draft Board
  - Optional: Type 2, Generation, Tera Captain Eligible
  - Analysis: Stats (HP, Atk, Def, SpA, SpD, Spe), BST, Speed tiers
  - Hidden by default: Sprite URL, GitHub Sprite URL (use Sprite property instead), Height, Weight, Base Experience

### 3. Reorder Columns

- **Drag** column headers left or right to reorder
- Put most-used columns first (Name, Point Value, Type 1)
- Group related columns together (all stats, all speed tiers)

### 4. Text Wrapping

- **Text properties** (Abilities, Notes, Species Name) wrap automatically in Notion
- **Rich text** properties may show ellipsis (...) if too long—click the cell to see full content
- **Select properties** (Type 1, Type 2, Status) don't wrap but are usually short
- **Number properties** don't wrap (they're single values)

### 5. Recommended Compact Layout

For a space-efficient table view, show only these columns in order:

1. **Sprite** (Files & media) - Visual identifier, narrow column
2. **Name** - Title column (auto-width)
3. **Point Value** - Narrow (2-3 characters)
4. **Type 1** - Narrow (short text)
5. **Type 2** - Narrow (short text or empty)
6. **Status** - Narrow (select dropdown)
7. **Tera Captain Eligible** - Narrow (checkbox)
8. **Added to Draft Board** - Narrow (checkbox)

**Hide these** to save space:
- Sprite URL, GitHub Sprite URL (redundant if Sprite column is visible)
- Height, Weight, Base Experience (rarely needed)
- Speed @ 0 EV, Speed @ 252 EV, Speed @ 252+ (show only if analyzing speed tiers)
- Individual stats (HP, Atk, Def, SpA, SpD, Spe) - show BST instead if you need a summary

### 6. Multiple Views for Different Purposes

Create separate views for different use cases:

- **"Draft Board Season 7 - Compact"**: Only essential columns (Name, Point Value, Type 1, Status)
- **"Draft Board Season 7 - Stats"**: Include stats columns for analysis
- **"Draft Board Season 7 - Full"**: All columns visible

---

## Filter Structure (API Reference)

For programmatic queries (e.g., validating which Pokémon are included), use this filter structure:

```json
{
  "property": "Added to Draft Board",
  "checkbox": {
    "equals": true
  }
}
```

### Example: Query Filtered Pokémon via API

```typescript
import { createNotionClient, queryAllPages } from '@/lib/notion/client'

const notion = createNotionClient()
const DRAFT_BOARD_DATABASE_ID = '5e58ccd73ceb44ed83de826b51cf5c36'

// Query only Pokémon where "Added to Draft Board" is checked
const includedPokemon = await queryAllPages(notion, DRAFT_BOARD_DATABASE_ID, {
  filter: {
    property: "Added to Draft Board",
    checkbox: {
      equals: true
    }
  }
})

console.log(`Found ${includedPokemon.length} Pokémon in draft board`)
```

---

## Creating a Kanban View (Board View) by Point Value

A Kanban view groups Pokémon into columns based on their point values, making it easy to see the distribution of Pokémon across different point tiers.

### ⚠️ Important: Notion Number Grouping Limitation

**Notion groups number properties into ranges/buckets, not individual values.** When you group by "Point Value" (a Number property), Notion creates ranges like "0-10", "11-20", etc., not individual columns for each point value (1, 2, 3...20).

### Solution Options:

#### Option 1: Use Number Ranges (Simplest)

Configure Notion's number grouping to create meaningful ranges:

1. **Create New Board View**
   - Click the **"+"** button next to existing views
   - Select **"Board"** view type
   - Name it (e.g., **"Draft Board Season 7 - By Points"**)

2. **Add Filter (Optional but Recommended)**
   - Click the **"Filter"** button (funnel icon)
   - Add filter: **"Added to Draft Board"** = checked

3. **Group by Point Value with Custom Ranges**
   - Click the **"Group"** button
   - Select **"Group by"** → **"Point Value"**
   - Configure ranges:
     - **Number by**: Set custom ranges (e.g., "1-5", "6-10", "11-15", "16-20")
     - Or use default ranges and adjust as needed
   - **Sort by**: Ascending or Descending
   - **Hide empty groups**: Check this to hide ranges with no Pokémon

4. **Configure Card Display**
   - Click the **"..."** menu → **"Card preview"** → **"Cover"**
   - **"Card size"** → **Medium** or **Large**
   - **"Properties"** → Select: Name, Type 1, Type 2, Status

#### Option 2: Create a "Point Tier" Select Property (❌ Requires Manual Sync)

To get individual columns for each point value (1, 2, 3...20), create a Select property:

1. **Add New Property**
   - In your Draft Board database, add a new property: **"Point Tier"** (type: Select)
   - Create options: "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"

2. **Populate Point Tier from Point Value**
   - Option A: Manually set Point Tier based on Point Value in Notion
   - Option B: Run a script to sync Point Tier from Point Value (see below)
   - **Note**: This does NOT auto-update. You must re-run the sync script when Point Value changes

3. **Group by Point Tier**
   - Create Board View
   - Group by: **"Point Tier"** (not Point Value)
   - This creates individual columns for each point value (1, 2, 3...20)

**Pros**: ✅ Guaranteed to work for Board view grouping  
**Cons**: ❌ Does NOT auto-update when Point Value changes (requires manual sync or script)

#### Option 3: Use a Formula Property (✅ AUTO-UPDATES)

**This is the best option for auto-updating!** Formula properties automatically recalculate when Point Value changes.

1. **Add Formula Property**
   - Property name: **"Point Tier Text"**
   - Formula: `format(prop("Point Value"))` (converts number to text string)
   - This will automatically update whenever Point Value changes

2. **Group by Formula**
   - Create Board View
   - Group by: **"Point Tier Text"**
   - This creates columns for each unique point value (1, 2, 3...20)
   - **Note**: Verify that Notion allows grouping by formula text properties in Board views (this may vary by Notion version)

**Pros**: ✅ Auto-updates when Point Value changes  
**Cons**: ⚠️ May not support grouping in Board views (test first)

### Recommended Approach:

**For auto-updating individual columns (1-20)**: Use **Option 3** (Formula Property) - automatically updates when Point Value changes. Test if grouping works in Board views first.

**For guaranteed Board view grouping**: Use **Option 2** (Select Property) - requires running sync script when Point Value changes, or set up Notion Automation (see below).

**For quick setup with ranges**: Use **Option 1** (Number Ranges) with custom ranges like:
- **1-5 points** (Budget tier)
- **6-10 points** (Mid tier)
- **11-15 points** (High tier)
- **16-20 points** (Premium tier)

### Auto-Update Solutions:

#### Solution A: Formula Property (Best if Supported)
- ✅ Automatically updates when Point Value changes
- ⚠️ May not support Board view grouping (test first)
- Formula: `format(prop("Point Value"))`

#### Solution B: Notion Automation (If Available)
- Set up a Notion Automation that triggers when "Point Value" changes
- Action: Update "Point Tier" Select property based on Point Value
- ✅ Auto-updates without manual intervention
- ⚠️ Requires Notion Automation feature (may be workspace-dependent)

#### Solution C: Periodic Sync Script
- Run `sync-point-tier-from-point-value.ts` periodically (daily/weekly)
- Or trigger via webhook when Point Value changes in your app
- ⚠️ Not real-time, but keeps Point Tier in sync

### Tips for Kanban View:

- **Column Order**: Notion orders columns by the grouping property (ascending/descending)
- **Empty Columns**: Enable "Hide empty groups" to hide ranges/tiers with no Pokémon
- **Drag and Drop**: You can drag Pokémon cards between columns (updates the grouping property)
- **Card Colors**: Cards inherit colors from status or type if configured
- **Compact View**: Use smaller card size to see more Pokémon at once

---

## Multiple Season Views

You can create multiple views for different seasons or purposes:

### Example Views:

1. **"Draft Board Season 7"**
   - Filter: "Added to Draft Board" = checked
   - Sort: Point Value (descending)
   - View: Gallery (visual browsing)

2. **"Draft Board Season 7 - Table"**
   - Filter: "Added to Draft Board" = checked
   - Sort: Point Value (descending)
   - View: Table (data-focused)

3. **"Draft Board Season 7 - By Points (Kanban)"**
   - Filter: "Added to Draft Board" = checked
   - Group by: Point Value
   - Sort within groups: Name (ascending)
   - View: Board (Kanban style)
   - Card preview: Cover (artwork)

4. **"Draft Board Season 7 - By Type"**
   - Filter: "Added to Draft Board" = checked
   - Group by: Type 1
   - Sort: Point Value (descending)
   - View: Board or Table

5. **"Full Catalog (All Pokémon)"**
   - No filter (shows all Gen 1-9)
   - Sort: Pokedex # (ascending)
   - View: Table

---

## Helper Script: Validate Included Pokémon

Run this script to see which Pokémon currently have "Added to Draft Board" checked:

```bash
pnpm exec tsx --env-file=.env.local scripts/validate-draft-board-inclusions.ts
```

**Output**:
- Count of included Pokémon
- List of Pokémon names with their point values
- Summary by type, generation, or point tier

---

## Best Practices

1. **Naming Convention**: Use descriptive names like "Draft Board Season 7" or "Draft Board Season 7 - Gallery"
2. **Season Management**: When starting a new season:
   - Uncheck "Added to Draft Board" for all rows (or create a script to bulk update)
   - Check "Added to Draft Board" for the new season's Pokémon
   - Create a new view named after the season
3. **View Organization**: Keep views organized by purpose:
   - Season-specific views (filtered)
   - Full catalog views (no filter)
   - Analysis views (grouped by type, point tier, etc.)
4. **Gallery vs Table**: Use Gallery View for visual browsing and Table View for data analysis

---

## Limitations

- **Views cannot be created via API**: Must be created manually in Notion UI
- **Filters are per-view**: Each view maintains its own filter settings
- **View sharing**: Views are shared with the database; all users with access see the same views

---

## Related Documentation

- [Draft Board Notion Schema](./DRAFT-BOARD-NOTION-SCHEMA.md) - Full schema reference
- [Draft Board Visual Enhancement](./DRAFT-BOARD-VISUAL-ENHANCEMENT-SUMMARY.md) - Gallery View optimization guide
