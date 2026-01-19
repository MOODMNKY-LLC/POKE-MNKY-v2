# Draft System Code Changes - Quick Reference

**Quick lookup guide for implementing schema migration**

---

## 🔄 Schema Migration: Old → New

### Query Pattern Changes

#### OLD Pattern:
```typescript
.eq("is_available", true)
```

#### NEW Pattern:
```typescript
.eq("status", "available")
.eq("season_id", seasonId) // ADD THIS
```

---

## 📝 File-by-File Changes

### 1. `lib/draft-system.ts`

#### Change 1: `getAvailablePokemon` method

**OLD** (line ~300):
```typescript
async getAvailablePokemon(filters?: {...}): Promise<...> {
  let query = this.supabase
    .from("draft_pool")
    .select("pokemon_name, point_value, generation, pokemon_id")
    .eq("is_available", true)  // ❌ OLD
    .order("point_value", { ascending: false })
```

**NEW**:
```typescript
async getAvailablePokemon(
  seasonId: string,  // ADD THIS
  filters?: {...}
): Promise<...> {
  let query = this.supabase
    .from("draft_pool")
    .select("pokemon_name, point_value, generation, pokemon_id, status")  // ADD status
    .eq("status", "available")  // ✅ NEW
    .eq("season_id", seasonId)  // ✅ ADD THIS
    .order("point_value", { ascending: false })
```

#### Change 2: `makePick` method

**OLD** (line ~162):
```typescript
const { data: pokemon } = await this.supabase
  .from("draft_pool")
  .select("pokemon_name, point_value, generation")
  .eq("pokemon_name", pokemonName)
  .eq("is_available", true)  // ❌ OLD
  .single()
```

**NEW**:
```typescript
const { data: pokemon } = await this.supabase
  .from("draft_pool")
  .select("pokemon_name, point_value, generation, status")
  .eq("pokemon_name", pokemonName)
  .eq("status", "available")  // ✅ NEW
  .eq("season_id", session.season_id)  // ✅ ADD THIS
  .single()
```

**OLD** (line ~256):
```typescript
await this.supabase
  .from("draft_pool")
  .update({ is_available: false })  // ❌ OLD
  .eq("pokemon_name", pokemon.pokemon_name)
  .eq("sheet_name", "Draft Board")
```

**NEW**:
```typescript
await this.supabase
  .from("draft_pool")
  .update({
    status: "drafted",  // ✅ NEW
    drafted_by_team_id: teamId,  // ✅ ADD THIS
    drafted_at: new Date().toISOString(),  // ✅ ADD THIS
    draft_round: session.current_round,  // ✅ ADD THIS
    draft_pick_number: session.current_pick_number,  // ✅ ADD THIS
  })
  .eq("pokemon_name", pokemon.pokemon_name)
  .eq("season_id", session.season_id)  // ✅ ADD THIS
```

#### Change 3: `getTeamStatus` method

**OLD** (line ~337):
```typescript
const { data: picks } = await this.supabase
  .from("team_rosters")
  .select("draft_round, draft_points, pokemon_id")
  .eq("team_id", teamId)
  .order("draft_round", { ascending: true })

// Then JOIN with pokemon_cache to get names
```

**NEW** (Use denormalized fields):
```typescript
const { data: picks } = await this.supabase
  .from("draft_pool")
  .select("pokemon_name, point_value, draft_round, draft_pick_number")
  .eq("drafted_by_team_id", teamId)  // ✅ Use denormalized field
  .eq("season_id", seasonId)  // ✅ ADD THIS
  .eq("status", "drafted")  // ✅ NEW
  .order("draft_round", { ascending: true })
  .order("draft_pick_number", { ascending: true })

// No JOIN needed! Faster query.
```

---

### 2. `app/api/draft/available/route.ts`

**OLD**:
```typescript
const { data: pokemon } = await draftSystem.getAvailablePokemon({
  minPoints: parseInt(minPoints),
  maxPoints: parseInt(maxPoints),
  generation: generation ? parseInt(generation) : undefined,
  search: search,
})
```

**NEW**:
```typescript
// Get season_id from query or use current season
const seasonId = searchParams.get("season_id") || await getCurrentSeasonId()

const { data: pokemon } = await draftSystem.getAvailablePokemon(seasonId, {  // ✅ ADD seasonId
  minPoints: parseInt(minPoints),
  maxPoints: parseInt(maxPoints),
  generation: generation ? parseInt(generation) : undefined,
  search: search,
})

// Response should include status field
return NextResponse.json({
  success: true,
  pokemon: pokemon.map(p => ({
    ...p,
    status: p.status || "available",  // ✅ Ensure status included
  })),
})
```

---

### 3. `app/api/draft/pick/route.ts`

**OLD**:
```typescript
const result = await draftSystem.makePick(
  sessionId,
  teamId,
  pokemonName
)
```

**NEW**:
```typescript
// Ensure season_id is validated
const { season_id } = await request.json()
if (!season_id) {
  return NextResponse.json(
    { success: false, error: "season_id required" },
    { status: 400 }
  )
}

const result = await draftSystem.makePick(
  sessionId,
  teamId,
  pokemonName
)

// Response should reflect new schema
```

---

### 4. `components/draft/draft-board.tsx`

**OLD** (line ~41):
```typescript
const response = await fetch(`/api/draft/available?limit=500`)
```

**NEW**:
```typescript
const response = await fetch(`/api/draft/available?limit=500&season_id=${seasonId}`)  // ✅ ADD season_id
```

**OLD** (line ~84):
```typescript
const draftedNames = data
  .map(r => (r.pokemon as any)?.name)
  .filter(Boolean)
  .map((name: string) => name.toLowerCase())
```

**NEW** (Use status field):
```typescript
// Query draft_pool directly with status filter
const { data: draftedData } = await supabase
  .from("draft_pool")
  .select("pokemon_name")
  .eq("season_id", seasonId)
  .eq("status", "drafted")  // ✅ Use status field

const draftedNames = draftedData?.map(p => p.pokemon_name.toLowerCase()) || []
```

**OLD** (line ~50):
```typescript
isDrafted={draftedPokemon.includes(p.name.toLowerCase())}
```

**NEW**:
```typescript
status={p.status || "available"}  // ✅ Use status field
isDrafted={p.status === "drafted"}  // ✅ Check status
```

---

### 5. `components/draft/draft-pokemon-card.tsx`

**OLD**:
```typescript
interface DraftPokemonCardProps {
  pokemon: {
    name: string
    point_value: number
    generation: number
    pokemon_id?: number | null
  }
  isDrafted: boolean
  ...
}
```

**NEW**:
```typescript
interface DraftPokemonCardProps {
  pokemon: {
    name: string
    point_value: number
    generation: number
    pokemon_id?: number | null
    status?: "available" | "drafted" | "banned" | "unavailable"  // ✅ ADD THIS
  }
  isDrafted: boolean  // Keep for backward compatibility
  ...
}

// In component:
const isDrafted = pokemon.status === "drafted" || props.isDrafted  // ✅ Check status
const isBanned = pokemon.status === "banned"  // ✅ NEW
const isAvailable = pokemon.status === "available"  // ✅ NEW
```

---

## 🔍 Helper Functions to Add

### Get Current Season ID

**File**: `lib/draft-system.ts` or `lib/seasons.ts`

```typescript
export async function getCurrentSeasonId(): Promise<string> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single()
  
  if (error || !data) {
    throw new Error("No current season found")
  }
  
  return data.id
}
```

---

## ✅ Testing Checklist

### Schema Migration Tests

- [ ] `getAvailablePokemon` filters by `season_id`
- [ ] `getAvailablePokemon` uses `status = 'available'`
- [ ] `makePick` updates `status` to 'drafted'
- [ ] `makePick` populates denormalized fields
- [ ] `getTeamStatus` uses denormalized fields
- [ ] API routes return `status` field
- [ ] Frontend components use `status` field
- [ ] Real-time updates work with new schema

### Integration Tests

- [ ] Draft flow works end-to-end
- [ ] Budget updates correctly
- [ ] Pokemon marked as drafted
- [ ] Turn advances correctly
- [ ] Multiple clients see updates

---

## 🚨 Common Pitfalls

### Pitfall 1: Forgetting season_id

**Problem**: Queries fail or return wrong data.

**Solution**: Always add `season_id` parameter and filter.

### Pitfall 2: Using is_available

**Problem**: Code breaks when column removed.

**Solution**: Search codebase for all `is_available` references and replace.

### Pitfall 3: Not Updating Frontend

**Problem**: UI shows wrong status.

**Solution**: Update all components to use `status` field.

### Pitfall 4: Missing Denormalized Fields

**Problem**: Slower queries, unnecessary JOINs.

**Solution**: Use `drafted_by_team_id` for team picks queries.

---

## 📚 Reference

- **Full Plan**: `docs/DRAFT-SYSTEM-UPDATE-IMPLEMENTATION-PLAN.md`
- **Executive Summary**: `docs/DRAFT-SYSTEM-UPDATE-EXECUTIVE-SUMMARY.md`
- **DRAFTBOARD Spec**: `DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md`

---

**Last Updated**: January 19, 2026  
**Status**: Ready for Implementation
