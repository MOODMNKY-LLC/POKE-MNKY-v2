# Next Steps - Draft System Implementation

## 🎯 Current Status

### ✅ Completed
- Draft Pool Parser created (`lib/google-sheets-parsers/draft-pool-parser.ts`)
- Database migrations created (`draft_pool`, `draft_sessions` tables)
- Draft System core logic (`lib/draft-system.ts`)
- Discord bot commands added (`lib/discord-bot.ts`)
- API endpoints created (`app/api/draft/*`)
- Test script created (`scripts/test-draft-pool-parser.ts`)

### ⚠️ Issues to Fix
1. **Spreadsheet ID Access**: Parser needs consistent access pattern
2. **Schema Cache**: May need refresh after migrations
3. **Column Mapping**: Needs verification with actual sheet data
4. **Migration Application**: Verify migrations are applied

---

## 🔧 Immediate Fixes

### 1. Fix Spreadsheet ID Access Pattern

**Issue**: Parser can't consistently access spreadsheet ID

**Solution**: Use same pattern as `DraftParser`:
\`\`\`typescript
// Ensure sheet info is loaded first
await this.sheet.loadInfo()

// Then access via parent spreadsheet
const spreadsheetId = (this.sheet as any)._spreadsheet?.spreadsheetId
\`\`\`

**Status**: ✅ Fixed in latest code

---

### 2. Verify Migrations Applied

**Check**:
\`\`\`sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('draft_pool', 'draft_sessions');
\`\`\`

**If missing**, apply migrations:
\`\`\`bash
supabase migration up
\`\`\`

**Or manually apply**:
\`\`\`bash
# Apply draft_pool migration
psql -h localhost -U postgres -d postgres -f supabase/migrations/20260112000000_create_draft_pool.sql

# Apply draft_sessions migration  
psql -h localhost -U postgres -d postgres -f supabase/migrations/20260112000001_create_draft_sessions.sql
\`\`\`

---

### 3. Test Draft Pool Extraction

**Run test script**:
\`\`\`bash
npx tsx scripts/test-draft-pool-parser.ts
\`\`\`

**Expected Results**:
- ✅ Extracts Pokemon from all point value columns
- ✅ Stores in `draft_pool` table
- ✅ Shows breakdown by point value
- ✅ Enriches with generation data

**If fails**, check:
- Google Sheets API credentials
- Spreadsheet sharing permissions
- Column mapping logic (row 3 headers)

---

## 📋 Testing Checklist

### Phase 1: Parser Testing
- [ ] Run `test-draft-pool-parser.ts`
- [ ] Verify Pokemon extracted (should be ~200-400 Pokemon)
- [ ] Check point value distribution (12-20 points)
- [ ] Verify generation data enrichment
- [ ] Confirm availability status correct

### Phase 2: Database Verification
- [ ] Check `draft_pool` table exists
- [ ] Verify RLS policies applied
- [ ] Test queries:
  \`\`\`sql
  -- Count available Pokemon
  SELECT COUNT(*) FROM draft_pool WHERE is_available = true;
  
  -- Breakdown by point value
  SELECT point_value, COUNT(*) 
  FROM draft_pool 
  WHERE is_available = true
  GROUP BY point_value 
  ORDER BY point_value DESC;
  
  -- Check generation data
  SELECT generation, COUNT(*) 
  FROM draft_pool 
  WHERE generation IS NOT NULL
  GROUP BY generation;
  \`\`\`

### Phase 3: Draft System Testing
- [ ] Create test draft session
- [ ] Verify turn order calculation
- [ ] Test pick validation (budget, availability)
- [ ] Test snake draft logic
- [ ] Verify budget updates

### Phase 4: Discord Integration Testing
- [ ] Register Discord commands
- [ ] Test `/draft` command
- [ ] Test `/draft-status` command
- [ ] Test `/draft-available` command
- [ ] Test `/draft-my-team` command

---

## 🚀 Integration Steps

### Step 1: Extract Draft Pool
\`\`\`bash
# Run parser to extract all available Pokemon
npx tsx scripts/test-draft-pool-parser.ts
\`\`\`

**Verify**:
- Pokemon stored in database
- Point values correct
- Availability status accurate

---

### Step 2: Create Draft Session

**Via API** (when UI is ready):
\`\`\`typescript
POST /api/draft/create-session
{
  "season_id": "uuid",
  "team_ids": ["uuid1", "uuid2", ...],
  "draft_type": "snake",
  "pick_time_limit": 45
}
\`\`\`

**Or directly**:
\`\`\`typescript
import { DraftSystem } from "@/lib/draft-system"

const draftSystem = new DraftSystem()
const session = await draftSystem.createSession(seasonId, teamIds, {
  draftType: "snake",
  pickTimeLimit: 45,
})
\`\`\`

---

### Step 3: Register Discord Commands

**Update Discord bot**:
\`\`\`bash
# Register new commands
npm run register-discord-commands
\`\`\`

**Or manually**:
\`\`\`typescript
import { registerDiscordCommands } from "@/lib/discord-bot"
await registerDiscordCommands()
\`\`\`

---

### Step 4: Test End-to-End Flow

1. **Start Draft Session**
   - Create session via API or admin panel
   - Verify turn order set correctly

2. **Make First Pick**
   - Use Discord: `/draft Pikachu`
   - Verify pick recorded
   - Check budget updated
   - Confirm Pokemon marked unavailable

3. **Continue Draft**
   - Test snake draft logic (reverse order)
   - Verify turn tracking
   - Check validation (budget limits, availability)

4. **Complete Draft**
   - Finish all rounds
   - Verify session status = "completed"
   - Check all picks recorded

---

## 🎨 UI Development (Next Phase)

### Admin Panel Features
1. **Draft Pool Management**
   - View available Pokemon
   - Filter by point value/generation
   - Manually mark unavailable

2. **Draft Session Control**
   - Create new session
   - Start/pause/resume draft
   - View current status
   - Manual pick override (admin)

3. **Draft Board View**
   - Real-time draft progress
   - Team rosters
   - Remaining budgets
   - Pick history

### User Features
1. **Draft Interface**
   - Available Pokemon list
   - Your team's picks
   - Budget tracker
   - Pick timer (if enabled)

2. **Team Management**
   - View roster
   - Check budget
   - Draft history

---

## 🔍 Debugging Guide

### Issue: Parser Can't Access Spreadsheet

**Symptoms**:
- Error: "Could not get spreadsheet ID"
- No Pokemon extracted

**Solutions**:
1. Ensure `sheet.loadInfo()` called before parsing
2. Check Google Sheets API credentials
3. Verify spreadsheet shared with service account
4. Check spreadsheet ID in config

---

### Issue: No Pokemon Extracted

**Symptoms**:
- Parser runs but 0 records processed
- Column mapping fails

**Solutions**:
1. Verify row 3 contains "X Points" headers
2. Check column pattern (I, L, O every 3 columns)
3. Verify Pokemon start at row 5
4. Check for empty/struck-out cells

---

### Issue: Database Errors

**Symptoms**:
- "Table not found" errors
- Schema cache issues

**Solutions**:
1. Apply migrations: `supabase migration up`
2. Refresh schema cache: Restart Supabase CLI
3. Verify table exists: `SELECT * FROM information_schema.tables WHERE table_name = 'draft_pool'`
4. Check RLS policies

---

### Issue: Discord Commands Not Working

**Symptoms**:
- Commands not registered
- "Unknown command" errors

**Solutions**:
1. Register commands: `registerDiscordCommands()`
2. Check Discord bot token/permissions
3. Verify command handlers added to switch statement
4. Check API endpoints accessible

---

## 📊 Success Metrics

### Parser Success
- ✅ Extracts 200+ Pokemon
- ✅ All point values represented (12-20)
- ✅ Generation data enriched
- ✅ Availability status accurate

### Draft System Success
- ✅ Sessions create successfully
- ✅ Turn order correct (snake draft)
- ✅ Pick validation works
- ✅ Budget tracking accurate

### Integration Success
- ✅ Discord commands functional
- ✅ API endpoints respond correctly
- ✅ Real-time updates work
- ✅ End-to-end flow complete

---

## 🎯 Priority Order

1. **Fix Parser** (CRITICAL)
   - Spreadsheet ID access
   - Column mapping verification
   - Test extraction

2. **Apply Migrations** (CRITICAL)
   - Verify tables exist
   - Check RLS policies
   - Test database queries

3. **Test Draft System** (HIGH)
   - Create session
   - Make picks
   - Verify logic

4. **Discord Integration** (MEDIUM)
   - Register commands
   - Test handlers
   - Verify API calls

5. **UI Development** (LOW)
   - Admin panel
   - User interface
   - Real-time updates

---

## 📝 Notes

- **Generation Filtering**: Currently relies on `pokemon_cache` generation field. If not populated, filtering won't work.
- **Point Values**: Hardcoded range 12-20 points. Update if league changes.
- **Draft Type**: Currently supports snake draft. Linear/auction need additional logic.
- **Turn Timer**: 45 seconds default. Configurable per session.
- **Auto-draft**: Not yet implemented. Manual picks only.

---

**Last Updated**: 2026-01-12
**Status**: Ready for testing and debugging
