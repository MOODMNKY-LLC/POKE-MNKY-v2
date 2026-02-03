# Fix "Empty or invalid json" Error - Upsert to Supabase Node

## Problem

The "Upsert to Supabase" node is configured with:
- ❌ `operation: "upsert"` (doesn't exist in n8n Supabase node)
- ❌ No field mappings configured
- ❌ No "Data to Send" configuration

This causes Supabase to receive empty JSON, resulting in: `"Empty or invalid json"`

## Solution: Configure Update Operation with Field Mappings

### Step-by-Step Fix

1. **Open the workflow**: https://aab-n8n.moodmnky.com/workflow/AeazX7cYBLeNmRBJ

2. **Click "Upsert to Supabase" node**

3. **Change Operation**:
   - **Resource**: `row` (should already be set)
   - **Operation**: Change from `upsert` to `Update` ⚠️ **CRITICAL**

4. **Configure Table**:
   - **Table Name or ID**: `draft_pool` (select from dropdown)

5. **Configure Filters** (to find the row to update):
   - **Select Type**: `Build Manually`
   - **Must Match**: `All Select Conditions`
   - **Select Conditions**: Click "Add Condition" **twice**:
     
     **Condition 1**:
     - **Field Name or ID**: `season_id` (select from dropdown)
     - **Condition**: `Equals`
     - **Field Value**: `={{ $json.season_id }}`
     
     **Condition 2**:
     - **Field Name or ID**: `pokemon_name` (select from dropdown)
     - **Condition**: `Equals`
     - **Field Value**: `={{ $json.pokemon_name }}`

6. **Configure Data to Send** ⚠️ **THIS IS THE MISSING PIECE**:
   - **Data to Send**: Select `Define Below for Each Column` (NOT "Auto-Map Input Data")

7. **Add Fields to Send** ⚠️ **REQUIRED**:
   - Click **"Add Field to Send"** button
   - Add each field one by one:
     
     **Field 1**:
     - **Field Name or ID**: `pokemon_name`
     - **Field Value**: `={{ $json.pokemon_name }}`
     
     **Field 2**:
     - **Field Name or ID**: `point_value`
     - **Field Value**: `={{ $json.point_value }}`
     
     **Field 3**:
     - **Field Name or ID**: `status`
     - **Field Value**: `={{ $json.status }}`
     
     **Field 4**:
     - **Field Name or ID**: `tera_captain_eligible`
     - **Field Value**: `={{ $json.tera_captain_eligible }}`
     
     **Field 5**:
     - **Field Name or ID**: `pokemon_id`
     - **Field Value**: `={{ $json.pokemon_id }}`
     
     **Field 6**:
     - **Field Name or ID**: `season_id`
     - **Field Value**: `={{ $json.season_id }}`
     
     **Field 7**:
     - **Field Name or ID**: `banned_reason`
     - **Field Value**: `={{ $json.banned_reason }}`

8. **Save** the node

9. **Test** the workflow manually to verify it works

## Visual Guide

The node configuration should look like this:

```
┌─────────────────────────────────────┐
│ Upsert to Supabase                  │
├─────────────────────────────────────┤
│ Resource: row                       │
│ Operation: Update                   │ ← Changed from "upsert"
│ Table: draft_pool                   │
│                                     │
│ Select Type: Build Manually        │
│ Must Match: All Select Conditions   │
│                                     │
│ Select Conditions:                  │
│   [1] season_id = {{ $json... }}   │
│   [2] pokemon_name = {{ $json... }} │
│                                     │
│ Data to Send:                       │
│   ○ Define Below for Each Column   │ ← Select this!
│                                     │
│ Fields to Send:                    │ ← Add all 7 fields here!
│   [1] pokemon_name = {{ $json... }}│
│   [2] point_value = {{ $json... }} │
│   [3] status = {{ $json... }}       │
│   [4] tera_captain_eligible = ...  │
│   [5] pokemon_id = {{ $json... }}   │
│   [6] season_id = {{ $json... }}    │
│   [7] banned_reason = {{ $json... }}│
└─────────────────────────────────────┘
```

## Why This Fixes the Error

- **Before**: Node had `operation: "upsert"` (invalid) with no field mappings → Empty JSON sent to Supabase
- **After**: Node has `operation: "Update"` (valid) with all 7 fields mapped → Proper JSON sent to Supabase

## Important Notes

1. **Update Only**: This configuration will only UPDATE existing rows. If the row doesn't exist, the update will succeed but won't create a new row.

2. **For True Upsert**: If you need insert-if-not-exists behavior, see `docs/N8N-WORKFLOW-FINAL-FIXES.md` for the HTTP Request node approach.

3. **Field Names**: Make sure the field names match exactly what's in your Supabase `draft_pool` table (snake_case).

4. **Expression Syntax**: Use `={{ $json.field_name }}` syntax for all field values.

## Verification

After fixing, test the workflow:

1. **Check Transform Node Output**: Should show all 7 fields populated
2. **Check Update Node Output**: Should show success message
3. **Check Supabase**: Query `draft_pool` table to verify the row was updated

```sql
SELECT * FROM draft_pool 
WHERE pokemon_name = 'Your Test Pokemon' 
AND season_id = 'your-season-id'
ORDER BY updated_at DESC 
LIMIT 1;
```
