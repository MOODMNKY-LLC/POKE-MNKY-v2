# Point Tier Auto-Update Options

**Question**: Which approach allows Point Tier to automatically update when Point Value changes?

---

## Comparison Table

| Option | Auto-Updates? | Board View Grouping? | Setup Complexity |
|--------|---------------|---------------------|------------------|
| **Formula Property** | ✅ Yes | ⚠️ Maybe (test first) | Easy |
| **Select Property + Automation** | ✅ Yes | ✅ Yes | Medium |
| **Select Property + Script** | ❌ No (manual) | ✅ Yes | Easy |
| **Number Ranges** | ✅ Yes | ✅ Yes (ranges only) | Easy |

---

## Option 1: Formula Property (✅ AUTO-UPDATES)

### How It Works:
- Formula automatically recalculates when Point Value changes
- No manual sync needed
- Formula: `format(prop("Point Value"))` converts number to text

### Setup:
1. Add Formula property: **"Point Tier Text"**
2. Formula: `format(prop("Point Value"))`
3. Group Board view by **"Point Tier Text"**

### Pros:
- ✅ Automatically updates when Point Value changes
- ✅ No manual intervention needed
- ✅ Always in sync with Point Value

### Cons:
- ⚠️ **May not support Board view grouping** - Notion's grouping by formula text properties varies by version
- ⚠️ **Test first** - Create the formula and try grouping before committing

### Verification:
1. Create the formula property
2. Create a Board view
3. Try to group by "Point Tier Text"
4. If grouping works → ✅ Use this approach
5. If grouping doesn't work → Use Option 2 or 3

---

## Option 2: Select Property + Notion Automation (✅ AUTO-UPDATES)

### How It Works:
- Notion Automation triggers when Point Value changes
- Automation updates Point Tier Select property
- Requires Notion Automation feature (may need workspace plan)

### Setup:
1. Add Select property: **"Point Tier"** with options 1-20
2. Create Notion Automation:
   - **Trigger**: When "Point Value" property changes
   - **Action**: Update "Point Tier" Select property
   - **Logic**: Set Point Tier = Point Value (as string)
3. Group Board view by **"Point Tier"**

### Pros:
- ✅ Automatically updates when Point Value changes
- ✅ Guaranteed to work for Board view grouping
- ✅ Real-time updates

### Cons:
- ⚠️ Requires Notion Automation feature (may need paid plan)
- ⚠️ More complex setup
- ⚠️ May have rate limits

### Note:
Notion Automations may not be available in all workspaces. Check your Notion plan and workspace settings.

---

## Option 3: Select Property + Sync Script (❌ Manual Sync)

### How It Works:
- Select property stores Point Tier value
- Run sync script to update Point Tier from Point Value
- Script must be run manually or scheduled

### Setup:
1. Add Select property: **"Point Tier"** with options 1-20
2. Run sync script: `pnpm exec tsx --env-file=.env.local scripts/sync-point-tier-from-point-value.ts`
3. Group Board view by **"Point Tier"**

### Pros:
- ✅ Guaranteed to work for Board view grouping
- ✅ Simple setup
- ✅ Can be automated via cron/webhook

### Cons:
- ❌ **Does NOT auto-update** - requires manual script run
- ❌ Not real-time (only updates when script runs)
- ❌ Must remember to run script when Point Value changes

### Automation Options:
- **Cron job**: Schedule script to run daily/weekly
- **Webhook**: Trigger script when Point Value changes in your app
- **Manual**: Run script when needed

---

## Option 4: Number Ranges (✅ AUTO-UPDATES, Ranges Only)

### How It Works:
- Group directly by Point Value (Number property)
- Notion creates ranges/buckets automatically
- Updates automatically when Point Value changes

### Setup:
1. Create Board view
2. Group by **"Point Value"**
3. Configure ranges: "1-5", "6-10", "11-15", "16-20"

### Pros:
- ✅ Automatically updates when Point Value changes
- ✅ Simple setup (no extra properties)
- ✅ Guaranteed to work

### Cons:
- ❌ Creates ranges, not individual columns (1-5, 6-10, etc.)
- ❌ Not individual point values (1, 2, 3...20)

---

## Recommendation

### Best for Auto-Updating Individual Columns (1-20):

**Try Option 1 (Formula Property) first:**
1. Create formula property: `format(prop("Point Value"))`
2. Test if Board view grouping works
3. If it works → ✅ Perfect solution (auto-updates, individual columns)
4. If it doesn't work → Use Option 2 or 3

### Best for Guaranteed Board View Grouping:

**Use Option 2 (Select Property + Automation) if available:**
- Auto-updates via Notion Automation
- Guaranteed Board view grouping
- Individual columns (1-20)

**Or Option 3 (Select Property + Script) if Automation unavailable:**
- Run sync script periodically or via webhook
- Guaranteed Board view grouping
- Individual columns (1-20)

### Best for Quick Setup:

**Use Option 4 (Number Ranges):**
- Auto-updates automatically
- Simple setup
- Ranges instead of individual columns

---

## Testing Formula Property Grouping

To test if Formula Property works for Board view grouping:

1. **Create Formula Property**:
   - Name: "Point Tier Text"
   - Formula: `format(prop("Point Value"))`
   - Type: Text (formula)

2. **Create Board View**:
   - Add new Board view
   - Try to group by "Point Tier Text"
   - If grouping option appears → ✅ It works!
   - If grouping option doesn't appear → ❌ Use Select property instead

3. **Verify Auto-Update**:
   - Change a Pokémon's Point Value
   - Check if "Point Tier Text" updates automatically
   - If yes → ✅ Perfect solution!

---

## Script Usage

### Initial Sync:
```bash
# Sync Point Tier from Point Value for all entries
pnpm exec tsx --env-file=.env.local scripts/sync-point-tier-from-point-value.ts
```

### Periodic Sync (if using Option 3):
```bash
# Add to cron or scheduled task
# Runs daily at 2 AM
0 2 * * * cd /path/to/project && pnpm exec tsx --env-file=.env.local scripts/sync-point-tier-from-point-value.ts
```

### Webhook Trigger (if using Option 3):
- Set up webhook endpoint that calls sync script
- Trigger when Point Value changes in your app
- Keeps Point Tier in sync in near real-time
