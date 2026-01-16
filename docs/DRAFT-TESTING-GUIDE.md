# Draft & Free Agency Testing Guide

> **Status**: Comprehensive Testing Guide
> **Date**: 2026-01-16

---

## 🎯 Overview

This guide provides step-by-step instructions for testing the complete draft and free agency system we've built. Follow this systematically to verify all functionality works correctly.

---

## 📋 Prerequisites

1. **Supabase Running**: `supabase start`
2. **Next.js Dev Server**: `npm run dev`
3. **Test Environment Setup**: Run the setup script first

---

## 🚀 Step 1: Setup Test Environment

Run the setup script to create all necessary test data:

```bash
pnpm exec tsx --env-file=.env.local scripts/setup-draft-test-environment.ts
```

**What it creates:**
- ✅ Test season (if doesn't exist)
- ✅ 3 test teams (Alpha, Beta, Gamma)
- ✅ Draft budgets (120 points each)
- ✅ Draft session (if doesn't exist)
- ⚠️ Draft pool (checks if populated, provides instructions if empty)

**If draft pool is empty**, run:
```bash
pnpm exec tsx scripts/test-draft-pool-parser.ts
```

---

## 🧪 Step 2: UI Testing

### 2.1 Navigate to Draft Room

1. Open browser: `http://localhost:3000/draft`
2. **Expected**: Should see draft room (not "No active draft session")
3. **Verify**:
   - Draft header shows current round/pick
   - Draft board displays Pokemon
   - Team roster panel shows your team (if logged in)
   - Pick history is visible

### 2.2 Draft Board Testing

**Test Filters:**
1. **Point Tier Filter**: Select different tiers (20, 19, 18, etc.)
   - ✅ Should filter Pokemon by point value
   - ✅ Count should match filtered results

2. **Generation Filter**: Select generation (1-9)
   - ✅ Should filter by generation
   - ✅ Works with tier filter

3. **Search**: Type Pokemon name
   - ✅ Should filter by name
   - ✅ Case-insensitive
   - ✅ Works with other filters

**Test Pokemon Display:**
- ✅ Pokemon cards show name, point value, generation
- ✅ Sprite displays correctly
- ✅ Drafted Pokemon are marked/struck out
- ✅ Available Pokemon are clickable

### 2.3 Making a Pick (UI)

1. **Find Available Pokemon**: Use filters to find a Pokemon
2. **Click Pokemon Card**: Should show pick button/confirmation
3. **Make Pick**: Click confirm
4. **Verify**:
   - ✅ Pokemon disappears from available list
   - ✅ Appears in team roster panel
   - ✅ Budget decreases by correct amount
   - ✅ Pick appears in pick history
   - ✅ Turn advances to next team

### 2.4 Team Roster Panel

**Verify**:
- ✅ Shows all drafted Pokemon for your team
- ✅ Displays point cost for each Pokemon
- ✅ Shows total budget: `120 / X remaining`
- ✅ Updates in real-time when picks are made

### 2.5 Pick History

**Verify**:
- ✅ Shows recent picks (all teams)
- ✅ Displays Pokemon name, team, round, pick number
- ✅ Updates in real-time
- ✅ Shows point values

### 2.6 Draft Header

**Verify**:
- ✅ Shows current round number
- ✅ Shows current pick number
- ✅ Shows whose turn it is
- ✅ Updates when turn changes

---

## 🔌 Step 3: API Testing

### 3.1 Get Draft Status

```bash
curl http://localhost:3000/api/draft/status?season_id=<SEASON_ID>
```

**Expected Response:**
```json
{
  "success": true,
  "session": {
    "id": "...",
    "status": "active",
    "current_round": 1,
    "current_pick_number": 1,
    "current_team_id": "..."
  }
}
```

### 3.2 Get Available Pokemon

```bash
curl "http://localhost:3000/api/draft/available?limit=50&minPoints=18&maxPoints=20"
```

**Expected Response:**
```json
{
  "success": true,
  "pokemon": [
    {
      "pokemon_name": "Pikachu",
      "point_value": 20,
      "generation": 1
    }
  ]
}
```

**Test Filters:**
- `minPoints=18&maxPoints=20` - Point range
- `generation=1` - Generation filter
- `search=pika` - Name search

### 3.3 Get Team Status

```bash
curl "http://localhost:3000/api/draft/team-status?team_id=<TEAM_ID>&season_id=<SEASON_ID>"
```

**Expected Response:**
```json
{
  "success": true,
  "team": {
    "id": "...",
    "name": "Test Team Alpha",
    "budget": {
      "total_points": 120,
      "spent_points": 0,
      "remaining_points": 120
    },
    "picks": []
  }
}
```

### 3.4 Make a Draft Pick

```bash
curl -X POST http://localhost:3000/api/draft/pick \
  -H "Content-Type: application/json" \
  -d '{
    "pokemon_name": "Pikachu",
    "team_id": "<TEAM_ID>",
    "season_id": "<SEASON_ID>"
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "pick": {
    "pokemon_name": "Pikachu",
    "point_value": 20,
    "team_id": "...",
    "pick_number": 1,
    "round": 1
  }
}
```

**Expected Response (Error - Not Your Turn):**
```json
{
  "success": false,
  "error": "It's not your turn to pick"
}
```

**Expected Response (Error - Insufficient Budget):**
```json
{
  "success": false,
  "error": "Insufficient points. Need 20, have 15"
}
```

---

## ⚡ Step 4: Real-Time Testing

### 4.1 Open Multiple Browser Windows

1. Open `http://localhost:3000/draft` in **Window 1**
2. Open `http://localhost:3000/draft` in **Window 2** (or incognito)

### 4.2 Test Real-Time Updates

1. **Make a pick in Window 1**
2. **Verify in Window 2**:
   - ✅ Pokemon disappears from draft board
   - ✅ Pick appears in pick history
   - ✅ Turn indicator updates
   - ✅ Team roster updates (if same team)

### 4.3 Test Turn Changes

1. **Make pick for Team 1** (Window 1)
2. **Verify**:
   - ✅ Turn advances to Team 2
   - ✅ Draft header updates in both windows
   - ✅ Only Team 2 can make next pick

---

## 🎲 Step 5: Draft Flow Testing

### 5.1 Snake Draft Turn Order

**Test Round 1 (Forward Order):**
- Team 1 picks → Team 2 picks → Team 3 picks

**Test Round 2 (Reverse Order - Snake):**
- Team 3 picks → Team 2 picks → Team 1 picks

**Verify**:
- ✅ Turn order reverses on even rounds
- ✅ Pick numbers increment correctly
- ✅ Round number increments after all teams pick

### 5.2 Budget Tracking

**Test Budget Deduction:**
1. Team has 120 points
2. Pick 20-point Pokemon
3. **Verify**: Budget shows 100 remaining
4. Pick 15-point Pokemon
5. **Verify**: Budget shows 85 remaining

**Test Budget Limit:**
1. Team has 15 points remaining
2. Try to pick 20-point Pokemon
3. **Verify**: Error "Insufficient points"

### 5.3 Draft Completion

**Test 11 Rounds:**
- Make picks until all 11 rounds complete
- **Verify**:
  - ✅ Session status changes to "completed"
  - ✅ No more picks can be made
  - ✅ All teams have 11 Pokemon
  - ✅ Budgets are properly spent

---

## 🏃 Step 6: Free Agency Testing

### 6.1 Create Free Agency Transaction

**Via API** (when implemented):
```bash
curl -X POST http://localhost:3000/api/free-agency/add \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "<TEAM_ID>",
    "season_id": "<SEASON_ID>",
    "added_pokemon_name": "Charizard",
    "dropped_pokemon_name": "Pikachu"
  }'
```

**Verify**:
- ✅ Transaction created in `free_agency_transactions`
- ✅ Transaction count incremented in `team_transaction_counts`
- ✅ Pokemon added to team roster
- ✅ Pokemon removed from team roster
- ✅ Source tracked as "free_agency"

### 6.2 Transaction Limits

**Test Transaction Count:**
- Each team has limited transactions per season
- **Verify**: Transaction count increments correctly
- **Verify**: Limits are enforced

---

## ❌ Step 7: Error Case Testing

### 7.1 Invalid Picks

**Test Cases:**
1. **Pick Out of Turn**:
   - Try to pick when it's not your turn
   - **Expected**: Error "It's not your turn to pick"

2. **Pick Already Drafted Pokemon**:
   - Try to pick Pokemon that's already taken
   - **Expected**: Error "Pokemon not available"

3. **Pick Invalid Pokemon Name**:
   - Try to pick "InvalidPokemon123"
   - **Expected**: Error "Pokemon not found in draft pool"

4. **Exceed Budget**:
   - Try to pick Pokemon that exceeds remaining budget
   - **Expected**: Error "Insufficient points"

5. **Pick After Draft Complete**:
   - Complete all rounds
   - Try to make another pick
   - **Expected**: Error "Draft session is completed"

### 7.2 Edge Cases

**Test Empty Draft Pool:**
- What happens if no Pokemon available?
- **Expected**: Empty state message

**Test Session Pause/Resume:**
- Pause draft session
- Try to make pick
- **Expected**: Error "Draft session is paused"

---

## 🔍 Step 8: Database Verification

### 8.1 Verify Draft Picks

```sql
SELECT 
  tr.id,
  t.name as team_name,
  p.name as pokemon_name,
  tr.draft_round,
  tr.draft_order,
  tr.draft_points,
  tr.source
FROM team_rosters tr
JOIN teams t ON t.id = tr.team_id
JOIN pokemon p ON p.id = tr.pokemon_id
WHERE tr.draft_round IS NOT NULL
ORDER BY tr.draft_order;
```

**Verify**:
- ✅ All picks are recorded
- ✅ Round/order numbers are correct
- ✅ Point values match
- ✅ Source is "draft"

### 8.2 Verify Budgets

```sql
SELECT 
  t.name,
  db.total_points,
  db.spent_points,
  (db.total_points - db.spent_points) as remaining_points
FROM draft_budgets db
JOIN teams t ON t.id = db.team_id
WHERE db.season_id = '<SEASON_ID>';
```

**Verify**:
- ✅ All teams have budgets
- ✅ Spent points match picks made
- ✅ Remaining points = total - spent

### 8.3 Verify Draft Pool Availability

```sql
SELECT 
  pokemon_name,
  point_value,
  is_available,
  COUNT(*) FILTER (WHERE is_available = true) as available_count,
  COUNT(*) FILTER (WHERE is_available = false) as drafted_count
FROM draft_pool
GROUP BY pokemon_name, point_value, is_available
ORDER BY point_value DESC, pokemon_name;
```

**Verify**:
- ✅ Drafted Pokemon marked `is_available = false`
- ✅ Available Pokemon still `is_available = true`

---

## 📊 Step 9: Performance Testing

### 9.1 Load Testing

**Test with Many Pokemon:**
- Draft pool with 200+ Pokemon
- **Verify**: Filters/search are fast
- **Verify**: UI doesn't lag

**Test Real-Time Updates:**
- Multiple users making picks simultaneously
- **Verify**: Updates propagate quickly (< 1 second)
- **Verify**: No race conditions

### 9.2 Stress Testing

**Test Rapid Picks:**
- Make picks quickly in succession
- **Verify**: All picks are recorded
- **Verify**: Turn order stays correct
- **Verify**: Budgets update correctly

---

## ✅ Step 10: Checklist

Use this checklist to track testing progress:

### Setup
- [ ] Test environment script runs successfully
- [ ] Season created/retrieved
- [ ] Teams created (3 teams)
- [ ] Draft budgets initialized (120 pts each)
- [ ] Draft pool populated
- [ ] Draft session created

### UI Components
- [ ] Draft room page loads
- [ ] Draft board displays Pokemon
- [ ] Filters work (tier, generation, search)
- [ ] Team roster panel displays correctly
- [ ] Pick history updates
- [ ] Draft header shows current state

### Draft Functionality
- [ ] Can make picks via UI
- [ ] Can make picks via API
- [ ] Turn order works (snake draft)
- [ ] Budget tracking works
- [ ] Pokemon marked as unavailable after pick
- [ ] Real-time updates work

### Error Handling
- [ ] Out-of-turn pick blocked
- [ ] Already-drafted Pokemon blocked
- [ ] Insufficient budget blocked
- [ ] Invalid Pokemon name handled
- [ ] Completed draft blocks new picks

### Free Agency
- [ ] Can create add transaction
- [ ] Can create drop transaction
- [ ] Transaction counts update
- [ ] Ownership history includes free agency

### Database
- [ ] All picks recorded in `team_rosters`
- [ ] Budgets update correctly
- [ ] Draft pool availability updates
- [ ] Source tracking works

---

## 🐛 Troubleshooting

### Issue: "No active draft session found"

**Solution:**
1. Run setup script: `pnpm exec tsx --env-file=.env.local scripts/setup-draft-test-environment.ts`
2. Verify session exists: Check `draft_sessions` table
3. Verify session status is "active"

### Issue: Draft pool is empty

**Solution:**
1. Run draft pool parser: `pnpm exec tsx scripts/test-draft-pool-parser.ts`
2. Verify Pokemon in `draft_pool` table
3. Check `is_available = true` for available Pokemon

### Issue: Can't make picks

**Check:**
1. Is it your turn? (Check `current_team_id` in session)
2. Do you have budget? (Check `draft_budgets` table)
3. Is Pokemon available? (Check `draft_pool.is_available`)
4. Is session active? (Check `draft_sessions.status`)

### Issue: Real-time updates not working

**Check:**
1. Supabase Realtime enabled?
2. WebSocket connection established? (Check browser Network tab)
3. Broadcast triggers working? (Check `broadcast_draft_pick` trigger)

---

## 📝 Testing Notes

**Record your findings here:**

- Date: ___________
- Tester: ___________
- Issues Found: ___________
- Performance Notes: ___________
- Recommendations: ___________

---

**Status**: ✅ Testing Guide Complete - Ready for Comprehensive Testing
