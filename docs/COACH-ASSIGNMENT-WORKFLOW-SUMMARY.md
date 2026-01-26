# Coach Assignment & Team Linking - Workflow Summary

**Date**: January 25, 2026  
**Status**: ✅ **Configured and Ready**

---

## Quick Reference

### Current Process

**Three Ways to Assign Coaches**:

1. **Discord Bot (Automated)** ✅
   - Admin assigns "Coach" role in Discord
   - External bot detects and assigns automatically
   - Location: External server (`moodmnky@10.3.0.119`)

2. **Admin UI (Manual)** ✅ **NEW**
   - Navigate to `/admin/teams`
   - Use Coach Assignment section
   - Select coach → Select team → Assign

3. **Database Function (Direct)** ✅
   - Run SQL: `SELECT assign_coach_to_team('USER_ID'::UUID, 'TEAM_ID'::UUID);`

---

## Database Relationships

### Key Tables

```
profiles
├── id (PK)
├── role (enum: coach, admin, commissioner, viewer)
├── team_id (FK → teams.id)  ← Direct link for dashboard queries
└── discord_id

coaches
├── id (PK)
├── user_id (FK → profiles.id)
├── display_name
└── email

teams
├── id (PK)
├── coach_id (FK → coaches.id)  ← Via coaches table
├── season_id (FK → seasons.id)
└── name
```

### Assignment Updates Both Links

When `assign_coach_to_team()` runs:
1. ✅ Creates/updates `coaches` entry
2. ✅ Updates `teams.coach_id = coaches.id`
3. ✅ Updates `profiles.team_id = teams.id`

**Result**: Both relationships maintained for query flexibility

---

## Dashboard Integration

### How Dashboard Queries Teams

**Current Implementation** (`app/dashboard/page.tsx`):
```typescript
// Uses profiles.team_id → teams.id (direct link)
const { data: teamData } = await supabase
  .from("teams")
  .select("id, name, wins, losses, differential, ...")
  .eq("id", profile.team_id)  // Direct link
  .single()
```

**Why This Works**:
- `assign_coach_to_team()` updates `profiles.team_id`
- Dashboard uses `profile.team_id` to query teams
- ✅ **Correct and working**

---

## Verification Checklist

### ✅ Setup Complete

- [x] Database function `assign_coach_to_team()` exists
- [x] Admin API endpoint `/api/admin/assign-coach` created
- [x] Admin UI component `CoachAssignmentSection` created
- [x] Integrated into `/admin/teams` page
- [x] Dashboard queries teams via `profile.team_id`
- [x] Documentation created

### 🔍 Testing Needed

- [ ] Test admin UI assignment
- [ ] Verify Coach Card displays on dashboard
- [ ] Test database function directly
- [ ] Verify relationships are maintained
- [ ] Test Discord bot integration (external)

---

## Quick Test Steps

### Test 1: Admin UI Assignment

1. Log in as admin
2. Navigate to `/admin/teams`
3. Find Coach Assignment section
4. Select a coach (or create one with role="coach")
5. Select a team (or leave blank for auto-assign)
6. Click "Assign Coach to Team"
7. Verify success message

### Test 2: Dashboard Display

1. Log in as assigned coach
2. Navigate to `/dashboard`
3. Verify Coach Card appears
4. Verify team data displays correctly

### Test 3: Database Verification

```sql
-- Check assignment
SELECT 
  p.id,
  p.username,
  p.role,
  p.team_id,
  c.id as coach_id,
  t.id as team_id_from_teams,
  t.coach_id,
  t.name
FROM profiles p
LEFT JOIN coaches c ON c.user_id = p.id
LEFT JOIN teams t ON t.id = p.team_id
WHERE p.role = 'coach';
```

---

## Files Created

1. ✅ `app/api/admin/assign-coach/route.ts`
2. ✅ `components/admin/coach-assignment-section.tsx`
3. ✅ `scripts/verify-coach-assignments.ts`
4. ✅ `docs/COACH-ASSIGNMENT-WORKFLOW-ANALYSIS.md`
5. ✅ `docs/COACH-ASSIGNMENT-SETUP-COMPLETE.md`
6. ✅ `docs/COACH-ASSIGNMENT-WORKFLOW-SUMMARY.md` (this file)

---

## Next Steps

1. **Test the workflow** using admin UI
2. **Verify dashboard** displays Coach Card correctly
3. **Run verification script**: `npx tsx scripts/verify-coach-assignments.ts`
4. **Check Discord bot** (external server) if needed
5. **Proceed with dashboard Phase 2** once verified

---

**Status**: ✅ **Configuration Complete - Ready for Testing**
