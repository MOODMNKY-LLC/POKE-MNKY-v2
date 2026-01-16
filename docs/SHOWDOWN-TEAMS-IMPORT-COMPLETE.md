# Showdown Teams Import - Complete ✅

**Date**: January 15, 2026  
**Status**: 52 teams imported and ready for use

---

## ✅ Import Summary

- **Total Teams Imported**: 52
- **Stock Teams**: 52 (available to all users)
- **User Teams**: 0
- **Errors**: 0

### By Format:
- **OU (OverUsed)**: 35 teams
- **VGC (Video Game Championships)**: 16 teams
- **UU (UnderUsed)**: 1 team

---

## 📊 Database Structure

### Table: `showdown_teams`

**Purpose**: Stores Pokemon Showdown team exports with parsed data and metadata

**Key Columns**:
- `id` - UUID primary key
- `team_name` - Team name from header
- `generation` - Generation number (e.g., 2, 4, 6, 7, 8, 9)
- `format` - Battle format (ou, uu, vgc, etc.)
- `folder_path` - Folder organization path
- `team_text` - Original team export text
- `canonical_text` - Cleaned/prettified version
- `pokemon_data` - JSONB array of parsed Pokemon
- `pokemon_count` - Auto-calculated count
- `team_id` - **Links to league `teams` table** (nullable)
- `coach_id` - Links to `coaches` table (nullable)
- `season_id` - Links to `seasons` table (nullable)
- `is_stock` - Whether this is a stock/pre-loaded team
- `source` - Import source ('github_import', 'upload', etc.)

---

## 🔗 Relationship Structure

### How Showdown Teams Link to League Teams

```
┌─────────────────┐         ┌──────────────────┐
│   teams (league)│         │ showdown_teams   │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │◄────────│ team_id (FK)     │
│ name            │         │ team_name        │
│ coach_id        │         │ pokemon_data      │
│ season_id       │         │ format           │
│ ...             │         │ is_stock         │
└─────────────────┘         └──────────────────┘
```

**Relationship**:
- `showdown_teams.team_id` → `teams.id` (Foreign Key)
- **Nullable**: Stock teams have `team_id = null` (available to all)
- **When Linked**: League teams can link to specific showdown teams for battles

### Current State:
- ✅ All 52 teams are **stock teams** (`is_stock = true`)
- ✅ All have `team_id = null` (not yet linked to league teams)
- ✅ All have `coach_id = null` (stock teams don't belong to coaches)
- ✅ Ready to be linked when league teams are created

---

## 🎯 How Teams Are Linked

### Option 1: When Creating a League Team
When a league team is created, coaches can:
1. Select a stock showdown team
2. Link it via `team_id` field
3. Use it for battles

### Option 2: When Creating a Battle
When creating a match:
1. Coach selects their league team
2. System finds linked showdown team via `team_id`
3. Uses showdown team for battle validation

### Option 3: Manual Linking
Coaches can manually link a showdown team to their league team:
```sql
UPDATE showdown_teams 
SET team_id = '<league-team-id>'
WHERE id = '<showdown-team-id>';
```

---

## 📋 Database Alignment

### ✅ Tables Are Properly Aligned

1. **`showdown_teams` table** ✅
   - Has `team_id` foreign key to `teams.id`
   - Has `coach_id` foreign key to `coaches.id`
   - Has `season_id` foreign key to `seasons.id`
   - Proper indexes for efficient queries

2. **`teams` table** ✅
   - Has `coach_id` linking to coaches
   - Has `season_id` linking to seasons
   - Ready to link to showdown teams

3. **Relationships** ✅
   - Foreign keys properly defined
   - Cascade deletes configured
   - Nullable where appropriate (stock teams)

---

## 🔍 Verification Queries

### Check All Stock Teams
```sql
SELECT 
  id,
  team_name,
  format,
  generation,
  pokemon_count,
  is_stock
FROM showdown_teams
WHERE is_stock = true
  AND deleted_at IS NULL
ORDER BY format, team_name;
```

### Check Teams Linked to League Teams
```sql
SELECT 
  st.id,
  st.team_name,
  st.format,
  t.name AS league_team_name,
  t.coach_name
FROM showdown_teams st
LEFT JOIN teams t ON st.team_id = t.id
WHERE st.deleted_at IS NULL
ORDER BY st.format, st.team_name;
```

### Count Teams by Format
```sql
SELECT 
  format,
  COUNT(*) AS team_count
FROM showdown_teams
WHERE deleted_at IS NULL
GROUP BY format
ORDER BY team_count DESC;
```

---

## 🚀 Next Steps

### For Testing Integration Worker:
1. **Create League Teams** (if not exist):
   ```sql
   -- Get two team IDs for test match
   SELECT id, name FROM teams LIMIT 2;
   ```

2. **Link Showdown Teams** (optional):
   ```sql
   -- Link a showdown team to a league team
   UPDATE showdown_teams 
   SET team_id = '<league-team-id>'
   WHERE id = '<showdown-team-id>';
   ```

3. **Create Test Match**:
   ```sql
   INSERT INTO matches (
     team1_id,
     team2_id,
     week,
     status,
     showdown_room_id,
     showdown_room_url
   ) VALUES (
     '<team1-id>',
     '<team2-id>',
     1,
     'in_progress',
     'battle-gen9avgatbest-test123',
     'https://aab-play.moodmnky.com/battle-gen9avgatbest-test123'
   );
   ```

---

## 📝 Notes

### Stock Teams
- Stock teams (`is_stock = true`) are available to all authenticated users
- They don't belong to any specific coach or league team
- They can be used as templates or linked to league teams

### Team Validation
- Teams can be validated against league rosters
- Validation checks:
  - Pokemon are in team's draft roster
  - Team follows league rules
  - Format matches league format

### Import Source
- All teams imported from: `https://github.com/Vaporjawn/Pokemon-Showdown-Teams`
- Source marked as: `github_import`
- Original filenames preserved in `original_filename`

---

## ✅ Status

**Database Structure**: ✅ Properly aligned  
**Teams Imported**: ✅ 52 teams ready  
**Relationships**: ✅ Foreign keys configured  
**Ready for Testing**: ✅ Yes

---

**All Showdown teams are now in Supabase and ready to be linked to league teams!**
