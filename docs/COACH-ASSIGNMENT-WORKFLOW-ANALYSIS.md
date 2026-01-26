# Coach Assignment & Team Linking Workflow Analysis

**Date**: January 25, 2026  
**Status**: 🔍 **Analysis Phase - Configuration Needed**

---

## Current State Analysis

### Database Schema Relationships

**Key Tables**:
1. **`profiles`** - User profiles
   - `id` (UUID, PK)
   - `role` (enum: admin, commissioner, coach, viewer)
   - `team_id` (UUID, FK → `teams.id`)
   - `discord_id` (string)

2. **`coaches`** - Coach entries
   - `id` (UUID, PK)
   - `user_id` (UUID, FK → `profiles.id`)
   - `display_name` (text)
   - `email` (text)
   - `team_id` (UUID, FK → `teams.id`) - **NOTE: This column may not exist**

3. **`teams`** - Team data
   - `id` (UUID, PK)
   - `coach_id` (UUID, FK → `coaches.id`)
   - `season_id` (UUID, FK → `seasons.id`)
   - `name` (text)
   - `wins`, `losses`, `differential` (numbers)

### Current Workflow (As Designed)

**Step 1**: Admin assigns "Coach" role in Discord

**Step 2**: Discord Bot detects role change (`guildMemberUpdate` event)

**Step 3**: Bot syncs role to app
- Calls `syncDiscordRoleToApp(discordId)`
- Updates `profiles.role = "coach"`

**Step 4**: Bot checks if coach needs team assignment
- Checks `profiles.team_id`
- If `NULL`, calls `assignCoachToTeam(userId)`

**Step 5**: Database function `assign_coach_to_team()` executes:
1. Gets or creates `coaches` entry
2. Finds available team (or uses provided `team_id`)
3. Updates `teams.coach_id = coach.id`
4. Updates `profiles.team_id = team.id`

**Step 6**: User sees changes
- Dashboard shows Coach Card
- Profile shows team info

---

## Issues Identified

### Issue 1: Discord Bot May Not Be Running

**Problem**: The Discord bot that listens for `guildMemberUpdate` events may not be initialized or running.

**Evidence**:
- Documentation mentions bot initialization via `/admin/discord/bot`
- No clear evidence of bot service file (`lib/discord-bot-service.ts`)
- Bot may need to be manually started

**Solution Needed**:
1. Verify bot initialization endpoint exists
2. Check if bot is running
3. Ensure bot has proper event handlers

### Issue 2: Relationship Mismatch

**Problem**: There's a potential mismatch in how teams are queried:
- Dashboard uses `profile.team_id` → `teams.id`
- Some code uses `teams.coach_id` → `coaches.id` → `coaches.user_id` → `profiles.id`

**Current Dashboard Query**:
```typescript
.eq("id", profile.team_id)  // Direct link via profiles.team_id
```

**Alternative Query Pattern** (used elsewhere):
```typescript
.eq("coach_id", coach.id)  // Via coaches table
```

**Solution Needed**:
- Verify both relationships are maintained correctly
- Ensure `assign_coach_to_team()` updates both `profiles.team_id` AND `teams.coach_id`

### Issue 3: Manual Assignment Process

**Problem**: If Discord bot isn't running, coaches need manual assignment.

**Current Options**:
1. Via database function: `SELECT assign_coach_to_team('user_id', 'team_id')`
2. Via API (if exists): `POST /api/admin/assign-coach`
3. Via admin UI (if exists)

**Solution Needed**:
- Create admin UI for manual coach assignment
- Or verify existing admin tools work correctly

---

## Verification Checklist

### Database Verification

- [ ] Verify `assign_coach_to_team()` function exists and works
- [ ] Verify `profiles.team_id` is set correctly after assignment
- [ ] Verify `teams.coach_id` is set correctly after assignment
- [ ] Verify `coaches` entry is created correctly
- [ ] Test function with sample data

### Bot Verification

- [ ] Verify Discord bot initialization endpoint exists
- [ ] Verify bot has `guildMemberUpdate` event handler
- [ ] Verify bot calls `assignCoachToTeam()` when role changes
- [ ] Test role change detection

### Dashboard Verification

- [ ] Verify dashboard queries teams correctly using `profile.team_id`
- [ ] Verify Coach Card displays when `profile.team_id` exists
- [ ] Test with manually assigned coach
- [ ] Test with bot-assigned coach

---

## Recommended Fixes

### Fix 1: Verify Database Function

**Action**: Test `assign_coach_to_team()` function manually

```sql
-- Test with a user_id
SELECT assign_coach_to_team('USER_UUID_HERE'::UUID);

-- Verify results
SELECT 
  p.id as user_id,
  p.role,
  p.team_id,
  c.id as coach_id,
  t.id as team_id_from_teams,
  t.coach_id as team_coach_id,
  t.name as team_name
FROM profiles p
LEFT JOIN coaches c ON c.user_id = p.id
LEFT JOIN teams t ON t.id = p.team_id
WHERE p.id = 'USER_UUID_HERE';
```

**Expected Result**:
- `profiles.role` = "coach"
- `profiles.team_id` = some team UUID
- `coaches.id` exists
- `teams.coach_id` = `coaches.id`
- `teams.id` = `profiles.team_id`

### Fix 2: Create Admin UI for Manual Assignment

**Action**: Create admin page/component for assigning coaches to teams

**Features Needed**:
- List all coaches (users with role="coach")
- List all teams (with current coach assignment status)
- Assign coach to team (with validation)
- Unassign coach from team
- Show current assignments

### Fix 3: Verify Discord Bot Integration

**Action**: Check if bot service exists and is properly integrated

**Files to Check**:
- `lib/discord-bot-service.ts` (may not exist)
- `app/api/discord/bot/route.ts` (should exist)
- Event handlers for `guildMemberUpdate`

**If Missing**: Create bot service with proper event handlers

---

## Next Steps

1. **Immediate**: Verify database function works correctly
2. **Short-term**: Create admin UI for manual coach assignment
3. **Medium-term**: Verify/fix Discord bot integration
4. **Long-term**: Add automated testing for coach assignment flow

---

## Testing Plan

### Test 1: Manual Database Function Test

```sql
-- 1. Find a test user
SELECT id, username, role, team_id FROM profiles WHERE role = 'coach' LIMIT 1;

-- 2. Clear their assignment (if exists)
UPDATE profiles SET team_id = NULL WHERE id = 'USER_ID';
UPDATE teams SET coach_id = NULL WHERE coach_id IN (SELECT id FROM coaches WHERE user_id = 'USER_ID');

-- 3. Run assignment function
SELECT assign_coach_to_team('USER_ID'::UUID);

-- 4. Verify results
SELECT 
  p.id,
  p.role,
  p.team_id,
  c.id as coach_id,
  t.id as team_id_from_teams,
  t.coach_id,
  t.name
FROM profiles p
LEFT JOIN coaches c ON c.user_id = p.id
LEFT JOIN teams t ON t.id = p.team_id
WHERE p.id = 'USER_ID';
```

### Test 2: Dashboard Display Test

1. Assign coach to team (via function or admin UI)
2. Log in as that coach
3. Navigate to `/dashboard`
4. Verify Coach Card appears
5. Verify team data displays correctly

### Test 3: Discord Bot Test (If Bot Exists)

1. Initialize bot via `/admin/discord/bot`
2. Assign "Coach" role to test user in Discord
3. Wait for bot to process
4. Verify `profiles.role` = "coach"
5. Verify `profiles.team_id` is set
6. Verify `teams.coach_id` is set

---

## Questions to Answer

1. **Does the Discord bot service exist?** (`lib/discord-bot-service.ts`)
2. **Is the bot currently running?** (Check `/admin/discord/bot` status)
3. **Are there unassigned teams available?** (`SELECT COUNT(*) FROM teams WHERE coach_id IS NULL`)
4. **Is there a current season?** (`SELECT * FROM seasons WHERE is_current = true`)
5. **Do coaches have `team_id` set?** (`SELECT COUNT(*) FROM profiles WHERE role = 'coach' AND team_id IS NULL`)

---

**Status**: 🔍 **Analysis Complete - Ready for Implementation**
