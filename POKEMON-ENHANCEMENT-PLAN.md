# Pokémon Visual Enhancement & Google Sheets Sync Integration Plan

## Executive Summary

This document outlines the comprehensive plan to enhance the Average at Best Draft League app with:
- **Rich Pokémon visuals** (sprites, abilities, move details) via Pokenode-TS
- **Optimized caching system** in Supabase to minimize PokeAPI costs
- **Live Google Sheets synchronization** replacing all mock/dummy data
- **Database schema deployment** and data consistency strategies

---

## Current State Analysis

### ✅ What's Already Built

1. **Pokemon API Integration (`/lib/pokemon-api.ts`)**
   - Full Pokenode-TS implementation
   - Caching system designed for Supabase
   - Draft cost calculation based on base stats
   - Tier determination (Uber/OU/UU/RU/NU/PU)
   - Search and batch caching functions

2. **Google Sheets Sync (`/lib/google-sheets-sync.ts`)**
   - Complete sync implementation for:
     - Teams (name, coach, wins/losses, differential, SoS)
     - Draft Results (roster assignments, draft order, points)
     - Match Results (weekly schedule, scores, status)
   - Flexible column mapping
   - Per-row error handling
   - Sync logging

3. **Database Schema (`/scripts/002_enhanced_schema.sql`)**
   - Comprehensive schema with:
     - `pokemon_cache` table (ready for sprites, abilities, moves)
     - `teams`, `team_rosters`, `matches` tables
     - `battle_sessions`, `trade_listings`, `stat_events`
     - Full RLS policies

### ❌ What's Missing/Needs Work

1. **Database is empty** - Schema SQL hasn't been executed
2. **Sprite enhancements** - Only `front_default` sprite cached, need:
   - Shiny sprites
   - Back sprites
   - Regional forms
   - Gender differences
3. **Ability details** - Names cached but no descriptions/effects
4. **Move details** - Move pool cached but no:
   - Move descriptions
   - Power/accuracy/PP
   - Move categories (physical/special/status)
   - Learn methods
5. **Generation filtering** - No gen-specific move/ability filtering
6. **Mock data everywhere** - All pages use `USE_MOCK_DATA = true`
7. **Stats sync incomplete** - MVP/Top Performers sync is stubbed out

---

## Phase 1: Database Deployment

### Step 1: Run Schema Migrations

**Execute in Supabase SQL Editor:**
\`\`\`sql
-- From scripts/002_enhanced_schema.sql
-- Creates all tables, indexes, RLS policies
\`\`\`

**Verification Checklist:**
- [ ] All tables created successfully
- [ ] RLS policies applied
- [ ] Indexes created
- [ ] Foreign key constraints working
- [ ] Test data inserts work

### Step 2: Create Sync Log Table

\`\`\`sql
CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT NOT NULL, -- 'full', 'teams', 'draft', 'matches', 'stats'
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sync_log" ON public.sync_log FOR SELECT USING (true);
\`\`\`

---

## Phase 2: Enhanced Pokemon Caching System

### Goal
Minimize PokeAPI calls and costs by caching all visual and gameplay data.

### Enhanced `pokemon_cache` Schema

**Additional fields to add:**

\`\`\`sql
ALTER TABLE public.pokemon_cache 
  ADD COLUMN IF NOT EXISTS sprites JSONB, -- All sprite URLs
  ADD COLUMN IF NOT EXISTS ability_details JSONB[], -- Ability descriptions
  ADD COLUMN IF NOT EXISTS move_details JSONB[], -- Top moves with power/accuracy
  ADD COLUMN IF NOT EXISTS evolution_chain JSONB, -- Evolution data
  ADD COLUMN IF NOT EXISTS regional_forms TEXT[], -- Alolan, Galarian, etc.
  ADD COLUMN IF NOT EXISTS hidden_ability TEXT,
  ADD COLUMN IF NOT EXISTS gender_rate INTEGER, -- -1 = genderless, 0-8 = ratio
  ADD COLUMN IF NOT EXISTS generation INTEGER;
\`\`\`

### Sprite Structure

\`\`\`typescript
interface PokemonSprites {
  front_default: string | null
  front_shiny: string | null
  back_default: string | null
  back_shiny: string | null
  front_female: string | null
  front_shiny_female: string | null
  // High-resolution sprites
  official_artwork: string | null
  dream_world: string | null
  home: string | null
}
\`\`\`

### Ability Details Structure

\`\`\`typescript
interface AbilityDetail {
  name: string
  is_hidden: boolean
  effect: string // Short effect description
  effect_verbose: string // Long effect description
}
\`\`\`

### Move Details Structure (Top 20 moves only to save space)

\`\`\`typescript
interface MoveDetail {
  name: string
  type: string
  category: 'physical' | 'special' | 'status'
  power: number | null
  accuracy: number | null
  pp: number
  priority: number
  learn_method: 'level-up' | 'tm' | 'egg' | 'tutor'
  level_learned_at: number | null
}
\`\`\`

### Cache Strategy

**Tier 1: Essential Data (Immediate Cache)**
- Basic stats, types, abilities (names only)
- `front_default` sprite
- Draft cost & tier
- Total cache size: ~5KB per Pokemon

**Tier 2: Extended Data (On-Demand Cache)**
- All sprites (shiny, back, female variants)
- Ability descriptions
- Top 20 competitive moves with details
- Total additional size: ~15KB per Pokemon

**Tier 3: Rare Data (Lazy Load)**
- Full move pool with details
- Evolution chains
- Regional forms
- Only cached when specifically requested

**Implementation:**

\`\`\`typescript
// lib/pokemon-api.ts enhancements

export async function getPokemonDataExtended(
  nameOrId: string | number,
  includeMoveDetails = false
): Promise<CachedPokemonExtended | null> {
  // Check cache first
  const cached = await checkCache(nameOrId)
  
  if (cached && (!includeMoveDetails || cached.move_details)) {
    return cached
  }
  
  // Fetch from PokéAPI
  const pokemon = await pokemonClient.getPokemonById(id)
  const species = await pokemonClient.getPokemonSpeciesById(id)
  
  // Fetch ability details (parallel requests)
  const abilityDetails = await Promise.all(
    pokemon.abilities.map(async (a) => {
      const ability = await pokemonClient.getAbilityByName(a.ability.name)
      return {
        name: ability.name,
        is_hidden: a.is_hidden,
        effect: ability.effect_entries.find(e => e.language.name === 'en')?.short_effect || '',
        effect_verbose: ability.effect_entries.find(e => e.language.name === 'en')?.effect || ''
      }
    })
  )
  
  // Cache and return
  return cacheExtendedData(pokemon, species, abilityDetails)
}
\`\`\`

### Cost Optimization

**Current API Limits:**
- PokéAPI: 100 requests/minute (enforced)
- Our app: Burst protection with 100ms delays

**Caching Impact:**
- Without cache: ~3 API calls per page load (Pokemon + Species + Abilities)
- With cache: 0 API calls after initial load
- Cache expiry: 30 days default (Pokemon data rarely changes)

**Batch Pre-Caching Strategy:**

\`\`\`typescript
// scripts/pre-cache-pokemon.ts

const COMPETITIVE_POKEMON = [
  // Top 100 most-used competitive Pokemon IDs
  1, 3, 6, 9, 12, 18, 25, 94, 130, 131, // Gen 1
  // ... etc
]

async function preCacheCompetitivePokemon() {
  for (const id of COMPETITIVE_POKEMON) {
    await getPokemonDataExtended(id, true)
    await new Promise(resolve => setTimeout(resolve, 200)) // Rate limit
  }
}
\`\`\`

---

## Phase 3: Google Sheets Integration

### Current Setup

**Google Sheet Structure (from your "Average at Best Draft League"):**
- **Master Data Sheet / Standings**: Teams, records, differentials
- **Draft Results / Draft Board**: Pokemon selections per team
- **Week Battles / Schedule**: Weekly matchups and results
- **MVP / Top Performers**: Player/Pokemon statistics

### Enable Real Sync

**Step 1: Update Environment Variables**

Add to Vercel project settings:
\`\`\`bash
GOOGLE_SHEETS_ID=1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
\`\`\`

**Step 2: Share Sheet with Service Account**

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create Service Account
3. Generate JSON key
4. In your Google Sheet, click "Share"
5. Add service account email with "Viewer" access

**Step 3: Remove Mock Data Flags**

Update all pages:

\`\`\`typescript
// Before
const USE_MOCK_DATA = true

// After
const USE_MOCK_DATA = false // Now uses real Supabase data
\`\`\`

**Files to update:**
- `app/page.tsx`
- `app/standings/page.tsx`
- `app/teams/page.tsx`
- `app/matches/page.tsx`
- `app/pokedex/page.tsx`
- `app/teams/builder/page.tsx`

### Sync Schedule

**Manual Sync:**
- Triggered by admin via `/admin` page "Sync Now" button
- Calls `POST /api/sync/google-sheets`

**Automatic Sync (Future):**
- Vercel Cron Job: Every 6 hours
- Edge Function with schedule trigger
- Webhook from Google Apps Script on sheet edit

### Data Validation

Before upsert to Supabase, validate:

\`\`\`typescript
function validateTeamData(team: any): boolean {
  // Required fields
  if (!team.name || team.name.trim() === '') return false
  
  // Sensible ranges
  if (team.wins < 0 || team.wins > 50) return false
  if (team.losses < 0 || team.losses > 50) return false
  if (Math.abs(team.differential) > 200) return false
  
  return true
}
\`\`\`

### Conflict Resolution

**Scenario: Data edited in both Sheets and App**

**Strategy: Last Write Wins with Audit Trail**

\`\`\`sql
-- Add to all synced tables
ALTER TABLE teams 
  ADD COLUMN last_synced_at TIMESTAMPTZ,
  ADD COLUMN last_modified_source TEXT; -- 'sheets' or 'app'
  
-- On sync from sheets
UPDATE teams SET 
  last_synced_at = NOW(),
  last_modified_source = 'sheets'
WHERE name = 'Team Name';

-- On manual edit in app
UPDATE teams SET 
  last_modified_source = 'app',
  last_synced_at = NULL
WHERE id = 'uuid';
\`\`\`

**Conflict Detection:**

\`\`\`typescript
async function detectConflicts(sheetData: any[], dbData: any[]) {
  const conflicts = []
  
  for (const sheetRow of sheetData) {
    const dbRow = dbData.find(d => d.name === sheetRow.name)
    
    if (dbRow && dbRow.last_modified_source === 'app') {
      // Check if values differ
      if (dbRow.wins !== sheetRow.wins || dbRow.losses !== sheetRow.losses) {
        conflicts.push({
          entity: 'team',
          name: sheetRow.name,
          field_conflicts: ['wins', 'losses'],
          sheet_values: { wins: sheetRow.wins, losses: sheetRow.losses },
          app_values: { wins: dbRow.wins, losses: dbRow.losses }
        })
      }
    }
  }
  
  return conflicts
}
\`\`\`

---

## Phase 4: Pokemon Visual Enhancements

### Enhanced Pokedex UI

**Current:** Basic stat bars, type badges, AI assistant

**Enhanced:**
1. **Sprite Gallery**
   - Front/Back/Shiny toggle
   - Gender variants
   - Regional form selector (Alolan Pikachu, Galarian Weezing, etc.)
   - Official artwork display (high-res)

2. **Ability Details Panel**
   - Ability name + description
   - Hidden ability indicator (special badge)
   - Competitive usage notes (from AI)

3. **Move Pool Browser**
   - Filterable by:
     - Move type
     - Category (physical/special/status)
     - Learn method (level/TM/egg/tutor)
     - Generation
   - Sort by power, accuracy, usage rate
   - "Best Moveset" AI recommendations

4. **Evolution Chain Visualization**
   - Tree diagram showing evolution paths
   - Evolution conditions (level, stone, trade, etc.)
   - Sprite for each evolution stage

5. **Type Effectiveness Calculator**
   - Visual chart showing:
     - 2x/4x weaknesses (red)
     - 0.5x/0.25x resistances (green)
     - Immunities (gray)
   - Ability interactions (e.g., Levitate removing Ground weakness)

### Team Builder Enhancements

**Current:** Draft budget tracking, type coverage

**Enhanced:**
1. **Visual Roster Grid**
   - 6 slots with Pokemon sprites
   - Drag-and-drop reordering
   - Hover for quick stats
   - Right-click for "Replace Pokemon"

2. **Type Coverage Matrix**
   \`\`\`
   Fighting | 3 counters | ✅ Covered
   Water    | 1 counter  | ⚠️ Weak
   Electric | 0 counters | ❌ Vulnerable
   \`\`\`

3. **Role Balance Meter**
   - Physical Attacker: ███░░ 3/6
   - Special Attacker: ██░░░ 2/6
   - Tank/Wall: █░░░░ 1/6
   - Support: ░░░░░ 0/6
   - Speed Control: ██░░░ 2/6

4. **Draft Budget Visualizer**
   - Circular progress: 87/120 points used
   - Points remaining
   - Color-coded by spending efficiency

5. **AI Team Analysis**
   - "Your team is weak to Fighting types. Consider adding a Psychic or Fairy Pokemon."
   - "No hazard control detected. Recommend: Rapid Spin or Defog user."
   - "Excellent speed tier coverage."

### Match Visualization

**Battle Log Viewer:**
- Turn-by-turn replay
- Sprite animations (switch, attack, faint)
- HP bars that update in real-time
- Commentary from AI

**Post-Battle Stats:**
- MVP Pokemon (most KOs)
- Damage dealt breakdown
- Switch frequency
- Most effective move

---

## Phase 5: Implementation Roadmap

### Week 1: Database & Core Sync

**Day 1-2: Database Setup**
- [ ] Run `002_enhanced_schema.sql` in Supabase
- [ ] Create `sync_log` table
- [ ] Verify all RLS policies
- [ ] Test insert/update permissions

**Day 3-4: Google Sheets Sync**
- [ ] Set up Google Cloud Service Account
- [ ] Add environment variables to Vercel
- [ ] Test sync with staging database
- [ ] Deploy to production
- [ ] Run initial full sync
- [ ] Verify data integrity

**Day 5: Remove Mock Data**
- [ ] Update all pages: `USE_MOCK_DATA = false`
- [ ] Test all pages with real data
- [ ] Fix any edge cases

### Week 2: Pokemon Enhancements

**Day 1-2: Enhanced Caching**
- [ ] Modify `pokemon_cache` schema (add sprite/ability columns)
- [ ] Update `lib/pokemon-api.ts` with extended functions
- [ ] Implement ability detail fetching
- [ ] Add move detail caching (top 20 only)

**Day 3: Pre-Cache Competitive Pokemon**
- [ ] Create `scripts/pre-cache-pokemon.ts`
- [ ] Run batch cache for top 100 competitive Pokemon
- [ ] Verify cache hit rates

**Day 4-5: Pokedex UI**
- [ ] Build sprite gallery component
- [ ] Add ability details panel
- [ ] Implement move pool browser
- [ ] Create evolution chain visualizer

### Week 3: Team Builder & Visuals

**Day 1-2: Team Builder UI**
- [ ] Visual roster grid with sprites
- [ ] Type coverage matrix
- [ ] Role balance meter
- [ ] Draft budget visualizer

**Day 3-4: AI Integrations**
- [ ] Team analysis endpoint (`/api/ai/team-analysis`)
- [ ] Moveset recommendations
- [ ] Type coverage suggestions

**Day 5: Testing & Polish**
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Cache preloading on app load

### Week 4: Advanced Features

**Day 1-2: Battle Visualizations**
- [ ] Battle log viewer component
- [ ] Turn-by-turn replay
- [ ] Post-battle stats dashboard

**Day 3-4: Stats Sync Completion**
- [ ] Implement `syncStats()` function
- [ ] MVP tracking system
- [ ] Top performers leaderboard

**Day 5: Documentation & Deployment**
- [ ] Update README with new features
- [ ] Create user guide
- [ ] Deploy final version
- [ ] Monitor sync logs for errors

---

## Performance & Cost Estimates

### API Call Reduction

**Before Caching:**
- Page load: 3-5 API calls
- Team builder: 6-10 API calls (one per Pokemon)
- Daily usage (50 users): ~500-1000 calls

**After Caching:**
- Initial cache population: ~300 calls (one-time)
- Subsequent page loads: 0 calls (cache hits)
- Cache refresh (30 days): ~10 calls/day
- Daily usage: ~10 calls

**Savings: 98% reduction in API calls**

### Database Storage

**Per Pokemon:**
- Basic cache: ~5KB
- Extended cache: ~20KB
- 100 competitive Pokemon: ~2MB total

**Total estimated storage:**
- Pokemon cache: ~2MB
- Teams: ~100KB
- Matches: ~500KB
- Battle logs: ~5MB (over time)
- **Total: ~8MB** (well within Supabase free tier)

### Response Times

**Before:**
- Page load: 500-800ms (API fetch + render)
- Team builder: 1-2s (multiple API calls)

**After:**
- Page load: 100-200ms (cache read + render)
- Team builder: 150-300ms (all cached)

**Improvement: 70-80% faster**

---

## Risk Mitigation

### Risk 1: Google Sheets Data Loss During Migration

**Mitigation:**
1. Export Google Sheet as CSV backup before first sync
2. Run sync in "dry-run" mode first (preview changes)
3. Manual verification of first 10 records
4. Gradual rollout (Teams → Draft → Matches → Stats)

### Risk 2: PokéAPI Rate Limiting

**Mitigation:**
1. Implement exponential backoff on 429 errors
2. Batch operations with 100ms delays
3. Pre-cache competitive Pokemon during off-peak hours
4. Monitor cache hit rates

### Risk 3: Cache Staleness

**Mitigation:**
1. 30-day expiry (Pokemon data rarely changes)
2. Manual cache invalidation endpoint: `POST /api/cache/invalidate`
3. Version tracking (cache schema version field)
4. Partial refresh capability

### Risk 4: Supabase Storage Limits

**Mitigation:**
1. Store only essential data (no full move pools)
2. Compress JSONB payloads
3. Implement LRU cache eviction for rarely-used Pokemon
4. Monitor storage usage dashboard

---

## Success Metrics

### Phase 1 (Database & Sync)
- [ ] All tables created without errors
- [ ] Initial sync completes < 5 minutes
- [ ] 0 data integrity errors
- [ ] Sync success rate > 99%

### Phase 2 (Pokemon Caching)
- [ ] Cache hit rate > 95%
- [ ] Average API calls/day < 20
- [ ] Pokemon detail page load < 200ms
- [ ] 100% sprite coverage for competitive Pokemon

### Phase 3 (UI Enhancements)
- [ ] Team builder usable on mobile
- [ ] AI response time < 3s
- [ ] User engagement (time on Pokedex page) +50%
- [ ] Draft budget errors reduced to 0

### Phase 4 (Production Readiness)
- [ ] Zero mock data flags remaining
- [ ] All pages load from Supabase
- [ ] Sync runs automatically every 6 hours
- [ ] Admin dashboard shows real-time status

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Confirm Google Sheets structure** matches expectations
3. **Set up Google Cloud Service Account** and get credentials
4. **Run database migrations** in Supabase
5. **Execute Week 1 tasks** (Database & Sync)
6. **Monitor first sync** for errors
7. **Iterate based on feedback**

---

## Appendix: Code Snippets

### A. Enhanced Pokemon Cache Schema

\`\`\`sql
-- Add to 002_enhanced_schema.sql

CREATE TABLE IF NOT EXISTS public.pokemon_cache (
  pokemon_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  types TEXT[] NOT NULL,
  base_stats JSONB NOT NULL,
  abilities TEXT[] NOT NULL,
  moves TEXT[] NOT NULL,
  
  -- NEW: Enhanced visual & gameplay data
  sprites JSONB, -- All sprite URLs (front, back, shiny, official art)
  ability_details JSONB[], -- [{name, is_hidden, effect, effect_verbose}]
  move_details JSONB[], -- Top 20 moves with power/accuracy/category
  evolution_chain JSONB, -- Evolution stages and conditions
  regional_forms TEXT[], -- ['alolan', 'galarian', 'hisuian', 'paldean']
  hidden_ability TEXT,
  gender_rate INTEGER, -- -1 = genderless, 0-8 = male-female ratio
  generation INTEGER,
  
  sprite_url TEXT, -- Kept for backward compatibility
  draft_cost INTEGER DEFAULT 10,
  tier TEXT,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);
\`\`\`

### B. Sprite Fetching Function

\`\`\`typescript
// lib/pokemon-api.ts

async function getAllSprites(pokemon: Pokemon): Promise<PokemonSprites> {
  return {
    front_default: pokemon.sprites.front_default,
    front_shiny: pokemon.sprites.front_shiny,
    back_default: pokemon.sprites.back_default,
    back_shiny: pokemon.sprites.back_shiny,
    front_female: pokemon.sprites.front_female,
    front_shiny_female: pokemon.sprites.front_shiny_female,
    official_artwork: pokemon.sprites.other?.['official-artwork']?.front_default || null,
    dream_world: pokemon.sprites.other?.dream_world?.front_default || null,
    home: pokemon.sprites.other?.home?.front_default || null,
  }
}
\`\`\`

### C. Dry-Run Sync Mode

\`\`\`typescript
// lib/google-sheets-sync.ts

export async function syncLeagueData(dryRun = false): Promise<SyncResult> {
  // ... existing code
  
  if (dryRun) {
    console.log("[v0] DRY RUN - No data will be written")
    // Return preview of changes
    return {
      success: true,
      recordsProcessed: 0,
      errors: [],
      preview: {
        teams_to_create: [],
        teams_to_update: [],
        conflicts: []
      }
    }
  }
  
  // ... actual sync logic
}
\`\`\`

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-12  
**Author:** v0 AI Assistant  
**Status:** Ready for Implementation
\`\`\`

Now let me create a script to run the database migrations:
