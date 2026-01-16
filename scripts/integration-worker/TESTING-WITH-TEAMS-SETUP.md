# Integration Worker Testing - Teams Setup Guide

**Date**: January 15, 2026  
**Status**: Showdown Teams Imported ✅ | League Teams Needed

---

## ✅ Current Status

### Showdown Teams
- ✅ **52 teams imported** into `showdown_teams` table
- ✅ All marked as stock teams (`is_stock = true`)
- ✅ Ready to be linked to league teams

### League Teams
- ❌ **No league teams** in `teams` table
- ⚠️ **Need to create** before testing Integration Worker

---

## 🚀 Quick Setup for Testing

### Step 1: Create Test League Teams

**Run this SQL in Supabase SQL Editor**:

```sql
-- Create test season (if not exists)
INSERT INTO seasons (name, start_date, is_current)
VALUES ('Test Season 2026', '2026-01-01', true)
ON CONFLICT (name) DO NOTHING;

-- Get season ID
DO $$
DECLARE
  season_uuid UUID;
BEGIN
  SELECT id INTO season_uuid FROM seasons WHERE is_current = true LIMIT 1;
  
  -- Create test teams
  INSERT INTO teams (
    name,
    coach_name,
    division,
    conference,
    season_id
  ) VALUES
    ('Test Team Alpha', 'Test Coach 1', 'Kanto', 'Lance Conference', season_uuid),
    ('Test Team Beta', 'Test Coach 2', 'Johto', 'Leon Conference', season_uuid)
  ON CONFLICT (name) DO NOTHING;
END $$;

-- Verify teams created
SELECT id, name, coach_name FROM teams ORDER BY created_at DESC LIMIT 5;
```

**Save the two team IDs** for Step 2.

---

### Step 2: Create Test Match

**Use the team IDs from Step 1**:

```sql
INSERT INTO matches (
  team1_id,
  team2_id,
  week,
  status,
  showdown_room_id,
  showdown_room_url
) VALUES (
  '<team1-id>',  -- Replace with Test Team Alpha ID
  '<team2-id>',  -- Replace with Test Team Beta ID
  1,
  'in_progress',
  'battle-gen9avgatbest-test123',
  'https://aab-play.moodmnky.com/battle-gen9avgatbest-test123'
)
RETURNING id, showdown_room_id, status;
```

---

### Step 3: Continue with Integration Worker Testing

Follow the steps in `STEP-BY-STEP-TESTING.md`:
1. ✅ Phase 1: Basic Connectivity (already complete)
2. ⏳ Phase 2: Room Polling Test (create match above)
3. ⏳ Phase 3: Battle Completion Test
4. ⏳ Phase 4: Database Verification

---

## 📋 Alternative: Use Existing Teams

If you have teams from Google Sheets sync:

```sql
-- Get existing teams
SELECT id, name, coach_name FROM teams LIMIT 2;
```

Use these IDs instead of creating new test teams.

---

## 🔗 Linking Showdown Teams (Optional)

If you want to link a showdown team to a league team:

```sql
-- Link a showdown team to a league team
UPDATE showdown_teams 
SET team_id = '<league-team-id>'
WHERE id = '<showdown-team-id>'
  AND is_stock = true;
```

**Note**: This is optional - the Integration Worker doesn't require showdown teams to be linked for testing.

---

## ✅ Ready to Test

Once you have:
- ✅ 2 league teams created
- ✅ 1 test match created with `status='in_progress'` and `showdown_room_id`

You can proceed with Phase 2 of the Integration Worker testing!
