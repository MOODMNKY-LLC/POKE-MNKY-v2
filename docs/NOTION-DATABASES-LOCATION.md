# Notion Databases Location Guide

**Date**: 2026-01-26  
**Workspace**: MOODMNKY LLC

---

## POKE MNKY Notion Databases

All POKE MNKY databases are in the **MOODMNKY LLC** workspace. Here's where to find them:

---

### 1. Moves Database

**Database ID**: `fbfc9ef5-0114-4938-bd22-5ffe3328e9db`  
**Direct URL**: https://www.notion.so/fbfc9ef501144938bd225ffe3328e9db

**What it contains**:
- All Pokémon moves with properties (Type, Category, Power, Accuracy, PP, Priority, Tags)
- Foundation database for role tags and Pokémon

**How to find it**:
1. Open Notion
2. Search for "Moves" database
3. Or use the direct URL above

---

### 2. Role Tags Database

**Database ID**: `a4d3b4c2-e885-4a35-b83c-49882726c03d`  
**Direct URL**: https://www.notion.so/a4d3b4c2e8854a35b83c49882726c03d

**What it contains**:
- Role tags (Hazard Setter, Hazard Remover, Cleric, Pivot, etc.)
- Relations to Moves and Pokemon Catalog
- Used for filtering and organizing Pokémon by role

**How to find it**:
1. Open Notion
2. Search for "Role Tags" database
3. Or use the direct URL above

---

### 3. Pokemon Catalog Database

**Database ID**: `6ecead11-a275-45e9-b2ed-10aa4ac76b5a`  
**Direct URL**: https://www.notion.so/6ecead11a27545e9b2ed10aa4ac76b5a

**What it contains**:
- Complete Pokémon catalog with all properties
- Draft points, types, eligibility
- Relations to Role Tags and Moves
- This is the main Pokémon database synced from Google Sheets

**How to find it**:
1. Open Notion
2. Search for "Pokemon Catalog" or "Pokémon Catalog"
3. Or use the direct URL above

---

## Finding Databases in Notion

### Method 1: Direct URLs
Click the URLs above to go directly to each database.

### Method 2: Search in Notion
1. Open Notion
2. Press `Ctrl+P` (or `Cmd+P` on Mac) to open Quick Find
3. Type the database name:
   - "Moves"
   - "Role Tags"
   - "Pokemon Catalog" or "Pokémon Catalog"

### Method 3: Workspace Navigation
1. Open Notion
2. Look in the sidebar for "MOODMNKY LLC" workspace
3. Browse databases in the workspace

---

## Database Relationships

These three databases are interconnected:

```
Moves Database
    ↓ (Relation)
Role Tags Database
    ↓ (Dual Property Synced)
Pokemon Catalog Database
```

**Flow**:
- Moves → Role Tags (single property)
- Role Tags ↔ Pokemon Catalog (dual property synced)

---

## Sync Status

These databases are synced from:
- **Google Sheets** → Notion (via sync scripts)
- **Notion** → Supabase (via sync API endpoints)

**Sync Endpoints**:
- `/api/sync/notion/pull` - Full sync
- `/api/sync/notion/pull/incremental` - Incremental sync
- `/api/sync/notion/status` - Check sync job status

---

## Quick Access Links

- **Moves**: https://www.notion.so/fbfc9ef501144938bd225ffe3328e9db
- **Role Tags**: https://www.notion.so/a4d3b4c2e8854a35b83c49882726c03d
- **Pokemon Catalog**: https://www.notion.so/6ecead11a27545e9b2ed10aa4ac76b5a

---

**Note**: If you can't access these databases, make sure you're logged into the correct Notion workspace (MOODMNKY LLC).
