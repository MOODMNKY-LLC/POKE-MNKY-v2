# Draft System User Guide

> **Status**: ✅ Fully Operational  
> **Last Updated**: 2026-01-16

---

## 🎯 Overview

The draft system is a **fully independent, Supabase-based drafting platform** that allows teams to draft Pokemon in a structured, turn-based format. It replaces the Google Sheets draft process with a real-time, interactive web interface.

---

## 🏗️ How It Works

### **Architecture**

```
┌─────────────────┐
│  Draft Pool     │  ← 749 Pokemon available (from Google Sheets initially)
│  (Supabase)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Draft Session   │  ← Active session tracks current pick, round, team
│  (Supabase)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Draft UI        │  ← Real-time web interface
│  (/draft)        │
└─────────────────┘
```

### **Key Components**

1. **Draft Pool** (`draft_pool` table)
   - 749 Pokemon available for drafting
   - Each Pokemon has a point value (12-20 points)
   - Tracks availability status (drafted = unavailable)

2. **Draft Session** (`draft_sessions` table)
   - Manages active draft state
   - Tracks current pick number, round, and whose turn it is
   - Stores turn order (snake draft: forward, backward, forward...)

3. **Team Rosters** (`team_rosters` table)
   - Stores all draft picks
   - Links Pokemon to teams
   - Tracks draft round and order

4. **Draft Budgets** (`draft_budgets` table)
   - Each team starts with 120 points
   - Tracks spent points as picks are made
   - Calculates remaining budget

---

## 🎮 Draft Flow

### **1. Snake Draft Logic**

**How turns work:**
- **Round 1**: Teams pick in order (Team 1 → Team 2 → ... → Team 20)
- **Round 2**: Teams pick in reverse (Team 20 → Team 19 → ... → Team 1)
- **Round 3**: Teams pick in order again (Team 1 → Team 2 → ...)
- And so on...

**Example:**
- Pick #1: Round 1, Team 1
- Pick #20: Round 1, Team 20
- Pick #21: Round 2, Team 20 (reversed!)
- Pick #40: Round 2, Team 1
- Pick #41: Round 3, Team 1 (forward again)

### **2. Making a Pick**

When it's your turn:

1. **Browse Available Pokemon**
   - Filter by point tier (12-20 points)
   - Filter by generation (1-9)
   - Search by name

2. **Select a Pokemon**
   - Click the "Draft" button on any available Pokemon
   - System validates:
     - ✅ Is it your turn?
     - ✅ Is Pokemon available?
     - ✅ Do you have enough budget?

3. **Pick is Processed**
   - Pokemon added to your roster (`team_rosters`)
   - Budget updated (`draft_budgets` - spent_points increases)
   - Pokemon marked unavailable (`draft_pool` - is_available = false)
   - Turn advances to next team
   - Real-time update broadcast to all users

### **3. Budget System**

- **Starting Budget**: 120 points per team
- **Point Values**: Pokemon cost 12-20 points
- **Validation**: Cannot exceed 120 points total
- **Tracking**: Budget displayed in Team Roster Panel

---

## 🧪 How to Test

### **Quick Start (Recommended)**

Run the setup script to create test users and assign them to teams:

```bash
npx tsx scripts/setup-draft-testing.ts
```

This will:
- Create 3 test user accounts
- Assign them to existing teams
- Verify draft session and budgets are ready

Then log in with one of the test accounts and navigate to `/draft`.

### **Prerequisites**

1. **Active Draft Session**
   - ✅ You have one! (Session ID: `57bb8322-1173-4c32-9b56-7886c3c7e935`)
   - Check: `/api/draft/status`
   - Current state: Pick #1, Round 1, Snake draft

2. **Teams Created**
   - ✅ You have 3 test teams
   - ⚠️ Teams need `coach_id` assigned (run setup script above)

3. **User Authentication**
   - Must be logged in
   - Your user ID must match a team's `coach_id`

### **Step 1: Check Current State**

```bash
# Check if active session exists
curl http://localhost:3000/api/draft/status

# Expected response:
{
  "success": true,
  "session": {
    "id": "...",
    "status": "active",
    "current_pick_number": 1,
    "current_round": 1,
    "current_team_id": "..."
  }
}
```

### **Step 2: Access Draft Page**

1. Navigate to: `http://localhost:3000/draft`
2. You should see:
   - **Draft Header**: Current pick number, round, whose turn
   - **Draft Board**: All available Pokemon organized by point tier
   - **Team Roster Panel**: Your picks and budget
   - **Pick History**: All picks made so far
   - **Draft Chat**: Real-time chat (if implemented)

### **Step 3: Make a Test Pick**

**If it's your turn:**

1. Find an available Pokemon (not grayed out)
2. Click the "Draft" button
3. Pick should be processed:
   - Pokemon appears in your roster
   - Budget decreases
   - Pokemon disappears from available list
   - Turn advances

**If it's NOT your turn:**

- "Draft" button shows "Not Your Turn"
- You can browse but cannot pick

### **Step 4: Verify Pick**

Check your team roster:
- Pokemon should appear in Team Roster Panel
- Budget should show updated spent/remaining points
- Pick should appear in Pick History

---

## 🔧 Creating a Test Draft Session

If no active session exists, create one:

### **Option 1: Via API (Recommended)**

Create a script or use curl:

```typescript
// scripts/create-test-draft-session.ts
import { createServiceRoleClient } from "@/lib/supabase/service"
import { DraftSystem } from "@/lib/draft-system"

async function createTestSession() {
  const supabase = createServiceRoleClient()
  const draftSystem = new DraftSystem()
  
  // Get or create current season
  let { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single()
  
  if (!season) {
    const { data: newSeason } = await supabase
      .from("seasons")
      .insert({
        name: "Season 5",
        is_current: true,
        start_date: new Date().toISOString(),
      })
      .select()
      .single()
    season = newSeason
  }
  
  // Get all teams for this season
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("season_id", season.id)
    .limit(20)
  
  if (!teams || teams.length < 2) {
    console.error("Need at least 2 teams to create draft session")
    return
  }
  
  const teamIds = teams.map(t => t.id)
  
  // Create draft session
  const session = await draftSystem.createSession(season.id, teamIds, {
    draftType: "snake",
    pickTimeLimit: 45,
    autoDraftEnabled: false,
  })
  
  console.log("✅ Draft session created:", session.id)
  
  // Initialize budgets for all teams
  for (const teamId of teamIds) {
    await supabase.from("draft_budgets").upsert({
      team_id: teamId,
      season_id: season.id,
      total_points: 120,
      spent_points: 0,
      remaining_points: 120,
    })
  }
  
  console.log("✅ Budgets initialized")
}

createTestSession()
```

### **Option 2: Direct SQL**

```sql
-- 1. Get season ID
SELECT id FROM seasons WHERE is_current = true LIMIT 1;

-- 2. Get team IDs
SELECT id FROM teams WHERE season_id = '<season_id>' LIMIT 20;

-- 3. Create draft session (replace with actual IDs)
INSERT INTO draft_sessions (
  season_id,
  status,
  draft_type,
  total_teams,
  total_rounds,
  current_pick_number,
  current_round,
  current_team_id,
  turn_order,
  started_at
) VALUES (
  '<season_id>',
  'active',
  'snake',
  20,
  11,
  1,
  1,
  '<first_team_id>',
  '["<team1_id>", "<team2_id>", ...]'::jsonb,
  NOW()
);

-- 4. Initialize budgets
INSERT INTO draft_budgets (team_id, season_id, total_points, spent_points, remaining_points)
SELECT id, '<season_id>', 120, 0, 120
FROM teams
WHERE season_id = '<season_id>';
```

---

## 📊 Testing Scenarios

### **Scenario 1: Basic Pick**

1. Log in as Team 1 coach
2. Navigate to `/draft`
3. Wait for your turn (or if you're first, pick immediately)
4. Select a Pokemon (e.g., "Flutter Mane" - 20pts)
5. Click "Draft"
6. **Expected**: Pokemon added, budget = 100/120, turn advances

### **Scenario 2: Budget Validation**

1. Log in and make picks totaling 115 points
2. Try to pick a 10-point Pokemon
3. **Expected**: ✅ Allowed (115 + 10 = 125, but validation might allow)
4. Try to pick a 20-point Pokemon
5. **Expected**: ❌ Should fail (115 + 20 = 135 > 120)

### **Scenario 3: Turn Order**

1. Log in as Team 1
2. Make Pick #1
3. **Expected**: Turn advances to Team 2
4. Log in as Team 2
5. Make Pick #2
6. **Expected**: Turn advances to Team 3
7. Continue until Round 1 complete (20 picks)
8. **Expected**: Round 2 starts, order reverses (Team 20 → Team 19 → ...)

### **Scenario 4: Real-time Updates**

1. Open `/draft` in two browser windows
2. Log in as different teams
3. Make a pick in Window 1
4. **Expected**: Window 2 updates automatically (Pokemon disappears, turn advances)

---

## 🐛 Troubleshooting

### **Issue: "No active draft session found"**

**Solution:**
- Create a draft session (see above)
- Or check if session status is "paused" instead of "active"

### **Issue: "Not Your Turn" but you think it should be**

**Solution:**
- Check `current_team_id` in draft session
- Verify your user ID matches team's `coach_id`
- Check turn order: `SELECT turn_order FROM draft_sessions WHERE status = 'active'`

### **Issue: Pokemon sprites not showing**

**Solution:**
- Sprites fetch `pokemon_id` from PokeAPI automatically
- Check browser console for API errors
- Verify network connectivity

### **Issue: Budget not updating**

**Solution:**
- Check `draft_budgets` table directly
- Verify `spent_points` is updating
- Check for database errors in console

---

## 📋 Current System Status

### **✅ What's Working**

- ✅ Draft session management
- ✅ Turn tracking (snake draft)
- ✅ Pick validation (budget, availability)
- ✅ Real-time updates via Supabase Realtime
- ✅ Pokemon artwork display
- ✅ Budget tracking
- ✅ Pick history

### **⚠️ What Needs Testing**

- [ ] Multi-user real-time updates
- [ ] Budget validation edge cases
- [ ] Draft completion (all 220 picks)
- [ ] Error handling (network failures, etc.)
- [ ] Mobile responsiveness

---

## 🎯 Next Steps

1. **Test with Multiple Users**
   - Open multiple browser windows
   - Log in as different teams
   - Verify real-time updates work

2. **Test Edge Cases**
   - Try to pick when not your turn
   - Try to exceed budget
   - Try to pick unavailable Pokemon

3. **Complete a Full Draft**
   - Make all 220 picks (20 teams × 11 rounds)
   - Verify session completes correctly
   - Check all rosters are correct

---

## 📚 Related Documentation

- `docs/DRAFT-SYSTEM-STATUS-ASSESSMENT.md` - Technical architecture
- `docs/DRAFT-TESTING-GUIDE.md` - Comprehensive testing checklist
- `lib/draft-system.ts` - Core draft logic
- `app/api/draft/` - API routes

---

**Ready to test!** Navigate to `/draft` and start making picks! 🎮
