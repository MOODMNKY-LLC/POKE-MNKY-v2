# n8n Workflow - Final Fixes

## Issues Found

1. **Get Current Season**: Active version has `operation: "select"` (wrong) - needs `getAll` with filters
2. **Upsert to Supabase**: Active version has `operation: "upsert"` but missing field mappings - causing "Empty or invalid json" error
3. **Season ID**: Still showing placeholder because "Get Current Season" isn't returning data

---

## Fix 1: Get Current Season Node

**Current Problem**: 
- Operation is `select` (doesn't exist) or not configured
- **OR** Multiple seasons have `is_current = true`, causing the query to return multiple results

**Important**: The query must return only ONE season. If multiple seasons are marked as current, it will pick the first one (which might be the wrong one).

**Step 1: Fix Database First** (if multiple current seasons exist)

Run this script to ensure only one season is marked as current:

```bash
npx tsx scripts/fix-current-season.ts
```

This will:
- Find all seasons with `is_current = true`
- Keep the most recent one (by `created_at DESC`)
- Set all others to `is_current = false`

**Step 2: Fix n8n Node**

1. Open workflow: https://aab-n8n.moodmnky.com/workflow/AeazX7cYBLeNmRBJ
2. Click **"Get Current Season"** node
3. Configure:
   - **Resource**: `row`
   - **Operation**: `Get Many` (this is `getAll`)
   - **Table Name or ID**: `seasons`
   - **Return All**: `false`
   - **Limit**: `1`
   - **Filter**: `Build Manually`
   - **Must Match**: `All Filters`
   - **Select Conditions**: Add condition
     - **Field Name or ID**: `is_current`
     - **Condition**: `Equals`
     - **Field Value**: `true`
   - **Sort**: Add sort (if available in n8n Supabase node)
     - **Sort By**: `created_at`
     - **Order**: `Descending`
4. **Save**

**Note**: If the n8n Supabase node doesn't support sorting, ensure the database only has ONE season with `is_current = true` (use the script above).

---

## Fix 2: Upsert to Supabase Node

**Current Problem**: Operation is `upsert` (which doesn't exist in n8n Supabase node) and has no field mappings configured

**Important**: n8n's Supabase node **does NOT have an "upsert" operation**. Available operations are:
- Create
- Get
- Get Many
- Update
- Delete

**Solution**: Use **"Update"** operation with proper filters and field mappings. For true upsert behavior, we'll add a fallback Create node.

**Fix**:

1. Click **"Upsert to Supabase"** node
2. Configure:
   - **Resource**: `row`
   - **Operation**: `Update` (change from "upsert")
   - **Table Name or ID**: `draft_pool`
   - **Select Type**: `Build Manually`
   - **Must Match**: `All Select Conditions`
   - **Select Conditions**: Click "Add Condition" twice:
     - **Condition 1**:
       - **Field Name or ID**: `season_id`
       - **Condition**: `Equals`
       - **Field Value**: `={{ $json.season_id }}`
     - **Condition 2**:
       - **Field Name or ID**: `pokemon_name`
       - **Condition**: `Equals`
       - **Field Value**: `={{ $json.pokemon_name }}`
   - **Data to Send**: `Define Below for Each Column`
   - **Fields to Send**: Click "Add Field to Send" for each:
     - **Field 1**: `pokemon_name` → `={{ $json.pokemon_name }}`
     - **Field 2**: `point_value` → `={{ $json.point_value }}`
     - **Field 3**: `status` → `={{ $json.status }}`
     - **Field 4**: `tera_captain_eligible` → `={{ $json.tera_captain_eligible }}`
     - **Field 5**: `pokemon_id` → `={{ $json.pokemon_id }}`
     - **Field 6**: `season_id` → `={{ $json.season_id }}`
     - **Field 7**: `banned_reason` → `={{ $json.banned_reason }}`
3. **Save**

**Note**: This will only UPDATE existing rows. If the row doesn't exist, the update will succeed but won't create a row. For true upsert, see "Alternative Solution" below.

---

## Alternative: True Upsert (Insert if Not Exists, Update if Exists)

For true upsert behavior, add an **IF node** to check if record exists, then Create if it doesn't:

### Step 1: Add "Check if Exists" Node

1. Add a new **Supabase** node between "Transform to Supabase" and "Upsert to Supabase"
2. Name it: **"Check if Exists"**
3. Configure:
   - **Resource**: `row`
   - **Operation**: `Get Many`
   - **Table Name or ID**: `draft_pool`
   - **Return All**: `false`
   - **Limit**: `1`
   - **Filter**: `Build Manually`
   - **Must Match**: `All Filters`
   - **Filters**: Add 2 conditions:
     - `season_id` = `={{ $json.season_id }}`
     - `pokemon_name` = `={{ $json.pokemon_name }}`

### Step 2: Add IF Node

1. Add an **IF** node after "Check if Exists"
2. Name it: **"Record Exists?"**
3. Configure:
   - **Condition**: `{{ $json.length > 0 }}` (or check if first item exists)

### Step 3: Add Create Node

1. Add a new **Supabase** node on the "false" branch of IF node
2. Name it: **"Create if Not Exists"**
3. Configure:
   - **Resource**: `row`
   - **Operation**: `Create`
   - **Table Name or ID**: `draft_pool`
   - **Data to Send**: `Auto-Map Input Data to Columns`

### Step 4: Update Connections

- "Transform to Supabase" → "Check if Exists"
- "Check if Exists" → "Record Exists?" (IF node)
- "Record Exists?" (true) → "Upsert to Supabase" (Update)
- "Record Exists?" (false) → "Create if Not Exists"
- Both "Upsert to Supabase" and "Create if Not Exists" → "Discord Notification"

**Simpler Alternative**: Use **HTTP Request** node for true upsert:

1. Replace "Upsert to Supabase" with **HTTP Request** node
2. Configure:
   - **Method**: `POST`
   - **URL**: `{{ $env.SUPABASE_URL }}/rest/v1/draft_pool`
   - **Headers**:
     - `apikey`: `{{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
     - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
     - `Content-Type`: `application/json`
     - `Prefer`: `resolution=merge-duplicates`
   - **Query Parameters**:
     - `on_conflict`: `season_id,pokemon_name`
   - **Body**: `={{ JSON.stringify($json) }}`

This uses Supabase's native upsert via REST API.

---

## Fix 3: Verify Season Data Flow

After fixing "Get Current Season", verify it's returning data:

1. **Test the workflow manually**
2. **Check "Get Current Season" node output**:
   - Should show an array with one season object
   - Should have `id` field with real UUID (not placeholder)
3. **Check "Transform to Supabase" node output**:
   - Should show `season_id` with real UUID
   - All other fields should be populated

---

## Quick Checklist

- [ ] Fix "Get Current Season" → Use `Get Many` with `is_current = true` filter
- [ ] Fix "Upsert to Supabase" → Use `Update` with field mappings OR Custom API Call for true upsert
- [ ] Verify season ID is real UUID (not placeholder)
- [ ] Test workflow with a Pokémon where "Added to Draft Board" = true
- [ ] Check Supabase `draft_pool` table for the synced data

---

## Testing

After fixes:

1. **Make a test change in Notion**:
   - Find a Pokémon row
   - Check "Added to Draft Board" checkbox
   - Wait for workflow to trigger (or run manually)

2. **Check execution logs**:
   - "Get Current Season" should return season data
   - "Transform to Supabase" should have real season_id
   - "Upsert to Supabase" should succeed

3. **Verify in Supabase**:
   ```sql
   SELECT * FROM draft_pool 
   WHERE pokemon_name = 'Your Test Pokemon'
   ORDER BY updated_at DESC 
   LIMIT 1;
   ```
