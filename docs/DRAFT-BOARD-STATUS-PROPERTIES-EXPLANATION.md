# Draft Board Status Properties Explanation

**Question**: What's the difference between "Status" and "Availability Status" properties? Are they redundant?

---

## The Two Properties

### 1. **Status** (Select Property) ✅ **USED IN SYNC**

**Purpose**: Tracks the **active draft state** and syncs to/from Supabase `draft_pool.status`

**Values**:
- **Available** → Maps to `draft_pool.status = 'available'`
- **Banned** → Maps to `draft_pool.status = 'banned'`
- **Unavailable** → Maps to `draft_pool.status = 'unavailable'`
- **Drafted** → Maps to `draft_pool.status = 'drafted'` (set by sync from Supabase when Pokémon is drafted)

**Sync Behavior**:
- ✅ **Notion → Supabase**: Sync reads "Status" and writes to `draft_pool.status`
- ✅ **Supabase → Notion**: When a pick is made, sync updates "Status" to "Drafted"
- ✅ **Supabase wins for draft state**: If `draft_pool.status = 'drafted'`, sync preserves it even if Notion says "Available"

**Used In**:
- `lib/sync/notion-sync-worker.ts` - Line 625-626
- `scripts/populate-notion-draft-board.ts` - Line 171 (sets initial value)

---

### 2. **Availability Status** (Select Property) ❌ **NOT USED IN SYNC**

**Purpose**: **Notion-only** field for initial league-level availability setup

**Values**:
- **Available**
- **Unavailable**
- **Banned**
- **Restricted**

**Sync Behavior**:
- ❌ **Not used in sync** - Notion → Supabase sync does NOT read this property
- ❌ **Not updated by sync** - Supabase → Notion sync does NOT write to this property
- ⚠️ **Only set by populate script** - Initial value set based on Gen 9 bans

**Used In**:
- `scripts/populate-notion-draft-board.ts` - Line 159, 180 (sets initial value based on `draftEntry.status`)
- **Not used anywhere else**

---

## The Problem: Redundancy

**Yes, they are redundant!** Here's why:

1. **Both track availability**: Both have "Available", "Banned", "Unavailable" values
2. **Only "Status" matters**: The sync code only uses "Status", not "Availability Status"
3. **"Availability Status" is legacy**: It appears to be an initial setup field that's no longer needed

### What "Status" Does That "Availability Status" Doesn't:

- ✅ Tracks **"Drafted"** state (when Pokémon is picked)
- ✅ Syncs to/from Supabase
- ✅ Updated by draft system when picks are made
- ✅ Preserves draft state (Supabase wins)

### What "Availability Status" Does:

- ❌ Only tracks initial availability (Available/Banned/Unavailable/Restricted)
- ❌ Doesn't track "Drafted" state
- ❌ Doesn't sync to Supabase
- ❌ Not updated by draft system

---

## Recommendation: Remove "Availability Status"

**"Availability Status" is redundant and can be safely removed** because:

1. ✅ **"Status" covers everything**: It tracks Available, Banned, Unavailable, AND Drafted
2. ✅ **Sync only uses "Status"**: The sync code doesn't read "Availability Status"
3. ✅ **No breaking changes**: Removing it won't affect sync or functionality

### Migration Steps:

1. **Verify no dependencies**: Check if any views, filters, or formulas use "Availability Status"
2. **Remove from populate script**: Remove line 159 and 180 from `scripts/populate-notion-draft-board.ts`
3. **Remove from schema script**: Remove from `scripts/ensure-draft-board-schema.ts` (lines 77-87)
4. **Delete property in Notion**: Manually delete "Availability Status" property from Draft Board database
5. **Update documentation**: Remove references to "Availability Status" from schema docs

---

## Current Usage Summary

| Property | Syncs to Supabase? | Tracks Drafted? | Updated by Draft? | Purpose |
|----------|-------------------|-----------------|-------------------|---------|
| **Status** | ✅ Yes | ✅ Yes | ✅ Yes | Active draft state |
| **Availability Status** | ❌ No | ❌ No | ❌ No | Legacy/initial setup |

---

## Conclusion

**"Availability Status" is redundant** and can be removed. **"Status" is the single source of truth** for availability and draft state, and it properly syncs with Supabase.

**Action**: Remove "Availability Status" property and clean up references in scripts and documentation.
