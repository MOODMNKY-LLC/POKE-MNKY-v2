# Admin Pokémon Management Table - Implementation Plan

**Date:** 2026-01-20  
**Goal:** Create Notion-style editable table for Founder to manage Pokémon draft pool availability

---

## Requirements

1. **Notion-style editable data table** with inline editing
2. **Fields:**
   - Pokémon ID (read-only)
   - Pokémon Name (read-only)
   - Pokémon Tier (editable dropdown)
   - Pokémon Generation (read-only, calculated)
   - Available for Draft Pool (checkbox)
3. **Data Source:** PokeNodeTS + PokeAPI
4. **Storage:** `draft_pool` table in Supabase

---

## Architecture Plan

### 1. Page Structure
- **Location:** `/admin/pokemon/page.tsx`
- **Component:** Client component with editable table
- **Authentication:** Admin-only (check in page)

### 2. Data Flow

```
User opens /admin/pokemon
  ↓
Page loads → Fetch Pokémon list from PokeAPI (via API route)
  ↓
API Route → Use PokemonClient.listPokemons() to get all Pokémon
  ↓
Fetch current draft_pool status for each Pokémon
  ↓
Display in editable table
  ↓
User edits tier/availability
  ↓
Save button → POST to /api/admin/pokemon
  ↓
API Route → Batch upsert to draft_pool table
```

### 3. API Routes

#### GET `/api/admin/pokemon`
- Fetch all Pokémon from PokeAPI using PokemonClient
- Load current draft_pool status
- Return combined data

#### POST `/api/admin/pokemon`
- Receive array of Pokémon updates
- Batch upsert to draft_pool table
- Return success/error

### 4. Table Component Structure

```typescript
interface PokemonRow {
  pokemon_id: number
  name: string
  generation: number
  tier: string | null  // Editable
  point_value: number  // Calculated from tier
  available: boolean   // Editable checkbox
  current_status?: 'available' | 'drafted' | 'banned'
}
```

### 5. Tier Mapping

Tier dropdown options (maps to point_value):
- Uber/AG → 20 points
- OU → 19 points
- UUBL/OUBL → 18 points
- UU → 17 points
- RUBL → 16 points
- RU → 15 points
- NUBL → 14 points
- NU → 13 points
- PUBL → 12 points
- PU → 11 points
- ZUBL → 10 points
- ZU → 9 points
- LC → 8 points
- NFE → 7 points
- Untiered → 6 points
- No Tier → 5 points

---

## Implementation Steps

### Step 1: Create API Route
- `/app/api/admin/pokemon/route.ts`
- GET: Fetch Pokémon list + draft_pool status
- POST: Save changes to draft_pool

### Step 2: Create Admin Page
- `/app/admin/pokemon/page.tsx`
- Client component with editable table
- Admin authentication check

### Step 3: Create Editable Table Component
- Inline editing for tier dropdown
- Checkbox for available status
- Save button with batch update
- Loading states and error handling

### Step 4: Integration
- Link from admin dashboard
- Add to admin navigation

---

## Database Schema

### draft_pool table (existing)
- `pokemon_name` (TEXT)
- `point_value` (INTEGER) - mapped from tier
- `status` (ENUM: 'available', 'drafted', 'banned', 'unavailable')
- `season_id` (UUID)
- `pokemon_id` (INTEGER)
- `generation` (INTEGER)

### Update Logic
- If `available = true` → `status = 'available'`
- If `available = false` → `status = 'banned'` or `'unavailable'`
- `point_value` calculated from tier selection

---

## UI/UX Design

### Table Layout
```
| ☑️ | ID | Name | Generation | Tier ▼ | Available ☑️ |
|----|----|------|------------|--------|--------------|
| ☑️ | 1  | Bulbasaur | Gen 1 | [OU ▼] | ☑️ |
| ☑️ | 2  | Ivysaur | Gen 1 | [UU ▼] | ☑️ |
```

### Features
- **Search/Filter:** Filter by name, generation, tier
- **Bulk Actions:** Select all, bulk toggle availability
- **Pagination:** Handle 1000+ Pokémon efficiently
- **Save Button:** Batch save all changes
- **Status Indicators:** Visual feedback for saved changes

---

## Technical Considerations

1. **Performance:**
   - Virtual scrolling for large lists (1000+ Pokémon)
   - Debounced saves
   - Optimistic UI updates

2. **Data Consistency:**
   - Load current season_id
   - Handle concurrent edits
   - Validate tier → point_value mapping

3. **Error Handling:**
   - API failures
   - Network errors
   - Validation errors

4. **User Experience:**
   - Loading states
   - Success/error toasts
   - Unsaved changes warning

---

## Next Steps

1. ✅ Create API route for fetching Pokémon
2. ✅ Create API route for saving changes
3. ✅ Create admin page component
4. ✅ Create editable table component
5. ✅ Add to admin navigation
6. ✅ Test with real data

---

**Status:** Ready for Implementation
