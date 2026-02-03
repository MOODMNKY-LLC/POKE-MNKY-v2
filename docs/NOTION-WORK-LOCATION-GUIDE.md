# Notion Work Location Guide - POKE MNKY

**Date**: 2026-01-26  
**Workspace**: MOODMNKY LLC

---

## Where to Find POKE MNKY Work in Notion

All POKE MNKY databases are in the **MOODMNKY LLC** workspace. Here are direct links and how to find them:

---

## Core Databases (Used for Sync)

### 1. **Moves Database** 📋
**Direct Link**: https://www.notion.so/fbfc9ef501144938bd225ffe3328e9db

**What it is**: Foundation database containing all Pokémon moves  
**Contains**: Move names, types, categories, power, accuracy, PP, priority, tags  
**Used for**: Role tags and Pokémon move references

**How to find**:
- Click the link above, OR
- In Notion: Press `Ctrl+P` → Search "Moves" → Select "Moves" database

---

### 2. **Role Tags Database** 🏷️
**Direct Link**: https://www.notion.so/a4d3b4c2e8854a35b83c49882726c03d

**What it is**: Role categorization system (Hazard Setter, Cleric, Pivot, etc.)  
**Contains**: Role tags with categories, related moves, and Pokémon  
**Used for**: Filtering Pokémon by role and team building

**How to find**:
- Click the link above, OR
- In Notion: Press `Ctrl+P` → Search "Role Tags" → Select database

---

### 3. **Pokemon Catalog Database** 🎮
**Direct Link**: https://www.notion.so/6ecead11a27545e9b2ed10aa4ac76b5a

**What it is**: Main Pokémon database (synced from Google Sheets)  
**Contains**: All Pokémon with stats, types, draft points, role tags, moves  
**Used for**: Draft pool, team building, Pokémon search

**How to find**:
- Click the link above, OR
- In Notion: Press `Ctrl+P` → Search "Pokemon Catalog" or "Pokémon Catalog"

---

## League Management Databases

### 4. **Coaches Database** 👥
**Direct Link**: https://www.notion.so/c068081f4a3a43d1b33e3471825746f9

**What it is**: Coach/manager information  
**Contains**: Coach names, Discord IDs, team assignments

---

### 5. **Teams Database** 🏆
**Direct Link**: https://www.notion.so/7721b2dc5fbd4288ad1cf501d69d1b4b

**What it is**: Team information  
**Contains**: Team names, coaches, divisions, conferences

---

### 6. **Seasons Database** 📅
**Direct Link**: https://www.notion.so/2ec8e71938e24da38041cff3d7277b8c

**What it is**: Season configuration  
**Contains**: Season names, draft budgets, roster sizes, dates

---

### 7. **Draft Pools Database** 🎲
**Direct Link**: https://www.notion.so/dd31c18ecd824e04a93597d629b067b9

**What it is**: Draft pool configurations per season (one row per pool/season)  
**Contains**: Pool name, Season relation, Pokemon Included/Banned relations

---

### 8. **Draft Board Database** 📊 (Gen 9 draft board – sync source)
**Direct Link**: https://www.notion.so/5e58ccd73ceb44ed83de826b51cf5c36

**What it is**: One row per Pokémon entry for the league draft board (point value, status, Tera eligibility)  
**Contains**: Name, Point Value (1–20), Status (Available/Banned/Unavailable/Drafted), Tera Captain Eligible, Season, Pokemon ID (PokeAPI), Generation, Notes  
**Used for**: Admin source of truth; syncs to Supabase `draft_pool`. See [DRAFT-BOARD-NOTION-SCHEMA.md](./DRAFT-BOARD-NOTION-SCHEMA.md) for schema and sync rules.

---

### 9. **Draft Picks Database** ✏️
**Direct Link**: https://www.notion.so/23d9a9973ce946d5927495b1d2ceeb35

**What it is**: All draft picks made  
**Contains**: Which Pokémon were drafted, by which team, in which round

---

### 9. **Matches Database** ⚔️
**Direct Link**: https://www.notion.so/93446d08e7df4b1591fae36bd454c1a3

**What it is**: Match results and scheduling  
**Contains**: Weekly matches, results, MVPs, kills/deaths

---

## Quick Access - All Databases

| Database | Direct Link |
|----------|-------------|
| **Moves** | https://www.notion.so/fbfc9ef501144938bd225ffe3328e9db |
| **Role Tags** | https://www.notion.so/a4d3b4c2e8854a35b83c49882726c03d |
| **Pokemon Catalog** | https://www.notion.so/6ecead11a27545e9b2ed10aa4ac76b5a |
| **Coaches** | https://www.notion.so/c068081f4a3a43d1b33e3471825746f9 |
| **Teams** | https://www.notion.so/7721b2dc5fbd4288ad1cf501d69d1b4b |
| **Seasons** | https://www.notion.so/2ec8e71938e24da38041cff3d7277b8c |
| **Draft Pools** | https://www.notion.so/dd31c18ecd824e04a93597d629b067b9 |
| **Draft Board** | https://www.notion.so/5e58ccd73ceb44ed83de826b51cf5c36 |
| **Draft Picks** | https://www.notion.so/23d9a9973ce946d5927495b1d2ceeb35 |
| **Matches** | https://www.notion.so/93446d08e7df4b1591fae36bd454c1a3 |

---

## Finding Databases in Notion

### Method 1: Direct Links (Fastest)
Click any link above to go directly to that database.

### Method 2: Quick Find
1. Open Notion
2. Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
3. Type the database name (e.g., "Moves", "Pokemon Catalog")
4. Select the database from results

### Method 3: Workspace Sidebar
1. Open Notion
2. Look for **MOODMNKY LLC** workspace in sidebar
3. Browse databases listed there

### Method 4: Search by Database ID
If you have the database ID, you can construct the URL:
```
https://www.notion.so/{database-id-without-dashes}
```

Example: Database ID `fbfc9ef5-0114-4938-bd22-5ffe3328e9db`  
URL: `https://www.notion.so/fbfc9ef501144938bd225ffe3328e9db`

---

## Most Important for Review

**For sync work review, check these three databases**:

1. **Pokemon Catalog** - Main database synced from Google Sheets
   - https://www.notion.so/6ecead11a27545e9b2ed10aa4ac76b5a

2. **Role Tags** - Role categorization system
   - https://www.notion.so/a4d3b4c2e8854a35b83c49882726c03d

3. **Moves** - Moves database
   - https://www.notion.so/fbfc9ef501144938bd225ffe3328e9db

These are the three databases used by the sync endpoints (`/api/sync/notion/pull`, etc.)

---

## Verification

To verify these databases exist and are accessible:

1. Open Notion
2. Make sure you're in the **MOODMNKY LLC** workspace
3. Click any of the direct links above
4. You should see the database with all its entries

If you can't access them, you may need to:
- Check you're logged into the correct Notion account
- Verify you have access to the MOODMNKY LLC workspace
- Contact workspace admin for access

---

---

## Draft Board Sync (Notion ↔ Supabase)

- **Notion → Supabase**: Run sync with `scope: ["draft_board"]` (or include `draft_board` in scope). Uses current season (`is_current = true`). Preserves `status = 'drafted'` and `drafted_by_team_id` in Supabase; Notion wins for point value, Tera eligibility, and non-drafted status.
- **Supabase → Notion**: When a pick is recorded via `DraftSystem.makePick()`, the app optionally updates the corresponding Notion Draft Board page to Status = "Drafted" (see `lib/sync/push-draft-state-to-notion.ts`). Requires `NOTION_API_KEY` and `notion_mappings` populated by a prior Notion → Supabase draft board sync.
- **Env**: `NOTION_API_KEY`, `NOTION_SYNC_SECRET` (for pull API). Share the Draft Board database with your Notion integration.

---

**Status**: ✅ **All 10 databases documented with direct links; Draft Board sync documented**
