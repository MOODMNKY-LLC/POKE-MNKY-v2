# Comprehensive Next Steps - Draft System

## 🎯 Current Status Summary

### ✅ Completed & Working
1. **Draft Pool Parser**: Successfully extracts 98+ Pokemon from draft board
2. **Column Mapping**: Correctly identifies 6 point value columns (15-20 points)
3. **Database Schema**: Migrations created and tables exist
4. **Draft System Logic**: Core functionality implemented
5. **Discord Commands**: Commands added to bot
6. **API Endpoints**: All routes created

### ⚠️ Needs Attention
1. **Schema Cache**: Supabase needs refresh to recognize `draft_pool` table
2. **Generation Data**: `pokemon_cache` may need generation field populated
3. **Testing**: End-to-end testing needed after schema refresh

---

## 🚀 Immediate Actions (Priority Order)

### 1. Refresh Supabase Schema Cache 🔴 CRITICAL

**Problem**: PostgREST can't see `draft_pool` table

**Solution**:
\`\`\`bash
# Stop and restart Supabase
supabase stop
supabase start

# Wait for services to start (30-60 seconds)
# Then verify table is accessible
\`\`\`

**Verify**:
\`\`\`sql
SELECT COUNT(*) FROM draft_pool;
\`\`\`

---

### 2. Re-run Draft Pool Parser 🔴 CRITICAL

**After schema refresh**:
\`\`\`bash
npx tsx scripts/test-draft-pool-parser.ts
\`\`\`

**Expected**:
- ✅ Extracts 98+ Pokemon
- ✅ Stores in `draft_pool` table
- ✅ Shows breakdown by point value
- ✅ No schema errors

---

### 3. Verify Data Quality 🟡 HIGH

**Check extracted data**:
\`\`\`sql
-- Total Pokemon
SELECT COUNT(*) FROM draft_pool;

-- By point value
SELECT point_value, COUNT(*) as count
FROM draft_pool
WHERE is_available = true
GROUP BY point_value
ORDER BY point_value DESC;

-- Sample entries
SELECT pokemon_name, point_value, is_available, generation
FROM draft_pool
ORDER BY point_value DESC, pokemon_name
LIMIT 30;
\`\`\`

**Expected Results**:
- ~98-200 Pokemon entries
- Distribution across 15-20 point values
- All marked as `is_available = true` initially
- Generation data (if available)

---

### 4. Test Draft System Core 🟡 HIGH

**Create test session**:
\`\`\`typescript
import { DraftSystem } from "@/lib/draft-system"
import { createServiceRoleClient } from "@/lib/supabase/service"

const supabase = createServiceRoleClient()
const draftSystem = new DraftSystem()

// Get or create season
const { data: season } = await supabase
  .from("seasons")
  .select("id")
  .eq("is_current", true)
  .single()

if (!season) {
  // Create test season
  const { data: newSeason } = await supabase
    .from("seasons")
    .insert({ name: "Season 1", is_current: true })
    .select()
    .single()
}

// Get teams (or create test teams)
const { data: teams } = await supabase
  .from("teams")
  .select("id")
  .limit(20)

if (teams && teams.length > 0) {
  const teamIds = teams.map(t => t.id)
  
  // Create draft session
  const session = await draftSystem.createSession(season.id, teamIds, {
    draftType: "snake",
    pickTimeLimit: 45,
  })
  
  console.log("Draft session created:", session.id)
}
\`\`\`

---

### 5. Test Pick Validation 🟡 HIGH

**Make a test pick**:
\`\`\`typescript
// Get available Pokemon
const available = await draftSystem.getAvailablePokemon({ minPoints: 15 })

// Make a pick (if session exists)
const result = await draftSystem.makePick(sessionId, teamId, "Flutter Mane")

if (result.success) {
  console.log("Pick successful:", result.pick)
} else {
  console.error("Pick failed:", result.error)
}
\`\`\`

**Verify**:
- ✅ Pick recorded in `team_rosters`
- ✅ Budget updated in `draft_budgets`
- ✅ Pokemon marked unavailable in `draft_pool`
- ✅ Session advanced to next pick

---

### 6. Register Discord Commands 🟢 MEDIUM

**Update Discord bot**:
\`\`\`typescript
import { registerDiscordCommands } from "@/lib/discord-bot"

await registerDiscordCommands()
\`\`\`

**Or via script**:
\`\`\`bash
# Create scripts/register-discord-commands.ts
npx tsx scripts/register-discord-commands.ts
\`\`\`

**Verify**:
- Commands appear in Discord
- `/draft`, `/draft-status`, `/draft-available`, `/draft-my-team` work

---

### 7. Test Discord Integration 🟢 MEDIUM

**Test commands**:
1. `/draft-status` - Should show current draft session
2. `/draft-available` - Should list available Pokemon
3. `/draft Pikachu` - Should make a pick (if your turn)
4. `/draft-my-team` - Should show your team's picks

---

## 📋 Testing Checklist

### Phase 1: Parser & Data ✅ (Almost Complete)
- [x] Parser extracts Pokemon
- [x] Column mapping works
- [ ] Data stored in database (pending schema refresh)
- [ ] Data quality verified

### Phase 2: Draft System
- [ ] Create draft session
- [ ] Verify turn order (snake draft)
- [ ] Test pick validation
- [ ] Test budget tracking
- [ ] Test Pokemon availability updates

### Phase 3: Discord Integration
- [ ] Register commands
- [ ] Test `/draft` command
- [ ] Test `/draft-status` command
- [ ] Test `/draft-available` command
- [ ] Test `/draft-my-team` command

### Phase 4: End-to-End
- [ ] Complete draft session
- [ ] Verify all picks recorded
- [ ] Check budgets accurate
- [ ] Verify Pokemon marked unavailable

---

## 🔧 Troubleshooting

### Issue: Schema Cache Not Refreshing

**Symptoms**: `PGRST205` errors persist after restart

**Solutions**:
1. **Full Reset**:
   \`\`\`bash
   supabase db reset
   \`\`\`

2. **Manual Refresh**:
   \`\`\`sql
   -- Connect via psql
   NOTIFY pgrst, 'reload schema';
   \`\`\`

3. **Check Table Exists**:
   \`\`\`sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'draft_pool';
   \`\`\`

---

### Issue: No Pokemon Extracted

**Symptoms**: Parser runs but finds 0 Pokemon

**Check**:
1. Verify row 3 has "X Points" headers
2. Check Pokemon start at row 5
3. Verify columns J, M, P, S, V, Y have data
4. Check for empty/struck-out cells

---

### Issue: Generation Data Missing

**Symptoms**: "No generation data found in pokemon_cache"

**Solutions**:
1. **Populate Cache**:
   \`\`\`typescript
   // Update pokemon_cache with generation data
   // Or fetch from PokeAPI and update
   \`\`\`

2. **Skip Generation** (acceptable):
   - Parser works without generation data
   - Filtering by generation won't work
   - Can add later

---

## 📊 Success Metrics

### Parser Success ✅
- ✅ Extracts 98+ Pokemon
- ✅ Identifies 6 point value columns
- ✅ Reads from correct columns
- ⏳ Stores in database (pending schema refresh)

### Draft System Success (To Test)
- [ ] Sessions create successfully
- [ ] Turn order correct
- [ ] Pick validation works
- [ ] Budget tracking accurate

### Integration Success (To Test)
- [ ] Discord commands work
- [ ] API endpoints respond
- [ ] Real-time updates function
- [ ] End-to-end flow complete

---

## 🎯 Priority Actions

1. **🔴 CRITICAL**: Refresh Supabase schema cache
2. **🔴 CRITICAL**: Re-run parser and verify data storage
3. **🟡 HIGH**: Test draft system core functionality
4. **🟡 HIGH**: Verify pick validation and budget tracking
5. **🟢 MEDIUM**: Test Discord commands
6. **🟢 MEDIUM**: End-to-end testing

---

## 📝 Notes

- **Parser Status**: ✅ **WORKING** - Successfully extracts Pokemon
- **Database Status**: ⚠️ **NEEDS SCHEMA REFRESH** - Tables exist but cache outdated
- **Next Milestone**: Get data stored in database, then test draft system

---

**Last Updated**: 2026-01-12
**Status**: Parser functional, awaiting schema cache refresh for full testing
