# Draft Pool: Seed Workflow (Option B) and True Upsert (Option A)

## Option B: One-Time Seed Workflow — Done

A dedicated **manual** workflow seeds `draft_pool` from all Notion Draft Board rows with "Added to Draft Board" checked.

### Workflow: **Draft Pool Seed (Notion → Supabase)**

- **ID**: `iOxLpBtSr16lVVpc`
- **Trigger**: Manual (run once per season or when pool is empty)
- **Active**: No (manual run only)

### Flow

1. **Manual Trigger** → run from n8n UI
2. **Get Current Season** → Supabase `seasons` where `is_current = true` (same as main sync)
3. **Notion Get All Draft Board** → all pages from Master Draft Board database (`5e58ccd73ceb44ed83de826b51cf5c36`)
4. **Transform and Filter to Supabase** → keep only "Added to Draft Board" = true, map to `draft_pool` fields (same shape as main sync)
5. **Insert to draft_pool** → Supabase **Create** one row per item

### When to run

- **Start of season**: After setting the current season and checking "Added to Draft Board" in Notion, run this workflow once to fill `draft_pool`.
- **Pool was cleared**: If you cleared `draft_pool` for the current season, run again to re-seed.

### Credentials (set in n8n if not already)

- **Get Current Season** & **Insert to draft_pool**: Supabase — same as main sync (e.g. "POKE MNKY DB").
- **Notion Get All Draft Board**: Notion — same as main sync (e.g. "POKE MNKY").

### Fix: `draft_pool_point_value_check` (point_value 1–20)

The table has a check constraint: **point_value must be between 1 and 20**. If Notion has empty or out-of-range Point Value, the Insert node fails.

**Fix:** In the **Transform and Filter to Supabase** Code node, ensure `point_value` is always an integer in 1–20. Replace the node’s code with the version below (it adds `clampPointValue` and uses it so missing or invalid values become 12 and out-of-range values are clamped to 1–20).

<details>
<summary>Replace with this code (click to expand)</summary>

```js
// Seed workflow: filter 'Added to Draft Board' and transform to draft_pool rows
// Enforce point_value 1-20 (draft_pool_point_value_check)
function firstItem(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  if (value.results && Array.isArray(value.results)) return value.results[0] ?? null;
  return value;
}
function getTitle(prop) {
  const arr = prop?.title;
  return Array.isArray(arr) && arr.length ? (arr[0]?.plain_text ?? null) : null;
}
function getNumber(prop) {
  return typeof prop?.number === 'number' ? prop.number : null;
}
function getSelectName(prop) {
  return prop?.select?.name ?? null;
}
function getCheckbox(prop) {
  return typeof prop?.checkbox === 'boolean' ? prop.checkbox : false;
}
function clampPointValue(n) {
  if (n == null || Number.isNaN(n)) return 12;
  const v = Math.round(Number(n));
  return Math.min(20, Math.max(1, v));
}
const season = $('Get Current Season').first().json;
const season_id = season?.id ?? null;
if (!season_id) throw new Error('No current season found');
const raw = $input.all();
const out = [];
for (const item of raw) {
  const page = firstItem(item.json);
  const props = page?.properties ?? page;
  if (!props) continue;
  const added = getCheckbox(props['Added to Draft Board']);
  if (!added) continue;
  const pokemon_name = getTitle(props['Name']);
  if (!pokemon_name) continue;
  const point_value = clampPointValue(getNumber(props['Point Value']));
  const status_raw = getSelectName(props['Status']);
  const status = status_raw ? String(status_raw).toLowerCase() : null;
  const tera_captain_eligible = getCheckbox(props['Tera Captain Eligible']);
  const pokemon_id = getNumber(props['Pokemon ID (PokeAPI)']);
  out.push({ json: { pokemon_name, point_value, status, tera_captain_eligible, pokemon_id, season_id, banned_reason: null } });
}
return out;
```

</details>

### Duplicate rows

The seed workflow only **inserts**. It does not check for existing rows. To avoid duplicates:

- Run it only when the current season’s `draft_pool` is empty, or
- Clear the current season’s rows first, then run:

  ```sql
  DELETE FROM draft_pool WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1);
  ```

---

## Option A: True Upsert in Main Sync Workflow — Manual Steps

The main workflow **Notion Draft Board → Supabase Sync** (`AeazX7cYBLeNmRBJ`) currently only **updates** existing rows. To support **insert when missing** (true upsert), add the following in the n8n editor.

### Current flow (simplified)

`Transform to Supabase` → `Upsert to Supabase` (Update only) → `Transform to Supabase1` → Discord.

### Target flow

1. **Transform to Supabase** → **Get Existing Row** (Supabase) and **Merge Payload and Get** (Merge).
2. **Get Existing Row** → **Merge Payload and Get**.
3. **Merge Payload and Get** → **Prepare Upsert** (Code).
4. **Prepare Upsert** → **IF Row Exists**.
5. **IF Row Exists**  
   - **true** → **Upsert to Supabase** (Update).  
   - **false** → **Insert Row** (Supabase Create).
6. **Upsert to Supabase** and **Insert Row** → **Transform to Supabase1** → Discord.

### Nodes to add

| Node name             | Type              | Purpose |
|-----------------------|-------------------|--------|
| Get Existing Row      | Supabase          | Get Many from `draft_pool` with filters `season_id` = `{{ $json.season_id }}`, `pokemon_name` = `{{ $json.pokemon_name }}`, limit 1. Same credentials as Upsert. |
| Merge Payload and Get | Merge             | Mode: **Append**. Input 1 = from Transform to Supabase, Input 2 = from Get Existing Row. |
| Prepare Upsert        | Code              | See code below. |
| IF Row Exists         | If                | Condition: `{{ $json._exists }}` equals `true`. |
| Insert Row            | Supabase          | Operation: **Create**, table: `draft_pool`, same field mappings as seed workflow (pokemon_name, point_value, status, tera_captain_eligible, pokemon_id, season_id, banned_reason). Same credentials. |

### Prepare Upsert (Code node)

```js
const items = $input.all();
const payload = items[0]?.json ?? {};
const exists = items.length > 1 && items[1]?.json?.id;
return [{ json: { ...payload, _exists: !!exists } }];
```

### Connections to change

- **Remove**: Transform to Supabase → Upsert to Supabase.
- **Add**:
  - Transform to Supabase → Get Existing Row
  - Transform to Supabase → Merge Payload and Get (input 1)
  - Get Existing Row → Merge Payload and Get (input 2)
  - Merge Payload and Get → Prepare Upsert
  - Prepare Upsert → IF Row Exists
  - IF Row Exists (true) → Upsert to Supabase
  - IF Row Exists (false) → Insert Row
  - Insert Row → Transform to Supabase1

(Upsert to Supabase → Transform to Supabase1 stays as is.)

### After editing

- Save the workflow.
- Deactivate and reactivate so the **active** version matches your draft (same as for the Discord node).
- Test: add a new Pokémon in Notion with "Added to Draft Board" checked; it should **insert** into `draft_pool` and notify Discord. Editing an existing one should **update**.

---

## Local development: seed draft_pool without n8n

n8n workflows typically run against **production** Supabase. For **local** development you need the draft pool populated in your **local** database.

Use the project script that replicates the same Notion → draft_pool logic:

1. **Prerequisites**
   - `.env.local` with **local** Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `.env.local` with `NOTION_API_KEY` (same Notion workspace as production; Master Draft Board is shared)
   - Local DB has a season with `is_current = true` (e.g. run `scripts/setup-season-6.ts` or set manually)
   - In Notion, some rows in the Master Draft Board have **Added to Draft Board** checked

2. **Run the seed**
   ```bash
   pnpm exec tsx --env-file=.env.local scripts/seed-draft-pool-local.ts
   ```
   This fetches all pages from the Notion Draft Board, keeps only "Added to Draft Board" = true, maps to `draft_pool` (same transform as the n8n seed), clears existing rows for the current season, and inserts.

3. **Options**
   - `--dry-run` — only fetch and log; no delete or insert
   - `--no-clear` — do not delete existing rows before insert (may hit unique conflicts if re-running)

4. **After running**  
   The draft board in the app (e.g. `/draft/board`) will show the seeded pool when the app is pointed at local Supabase (e.g. `next dev` with `.env.local`).

---

## Summary

| Item                         | Status |
|-----------------------------|--------|
| Option B: Seed workflow     | Created: **Draft Pool Seed (Notion → Supabase)** `iOxLpBtSr16lVVpc`. Run manually when pool is empty. |
| Option A: True upsert       | Documented above; add nodes and connections by hand in n8n. |
| Run seed first?             | Yes. Run the seed workflow once so `draft_pool` has rows; then the sync workflow can update them (and, after Option A, insert new ones). |
| Local dev                   | Use `scripts/seed-draft-pool-local.ts` to populate local `draft_pool` from Notion without n8n. |
