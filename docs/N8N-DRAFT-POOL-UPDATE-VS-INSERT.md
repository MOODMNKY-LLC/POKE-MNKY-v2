# Why production draft_pool is empty – Update vs Insert

## What the current workflow does

The **Notion Draft Board → Supabase Sync** workflow is meant to keep `draft_pool` in sync with Notion. In practice it only **updates** existing rows; it does **not** insert new ones.

| Step | What it does |
|------|----------------|
| Notion Trigger | Fires when a page in the Draft Board database changes |
| Filter | Keeps only rows where "Added to Draft Board" = true |
| Get Page Data | Loads the Notion page |
| Get Current Season | Loads current season from Supabase |
| Transform to Supabase | Builds payload: pokemon_name, point_value, status, etc. |
| **Upsert to Supabase** | **Operation: Update** – finds rows where `season_id` + `pokemon_name` match and updates them |
| Code node → Discord | Pass-through + notification |

So the Supabase node is an **Update**: it only changes rows that **already exist** in `draft_pool`. If no row matches, the update affects **0 rows** and the table does not change.

That’s why in production you see nothing in `draft_pool`: the table was never populated. The workflow runs, but with no existing rows it never inserts any.

---

## Summary

- **Design intent**: Notion is the source of truth; this workflow should sync its data into `draft_pool`.
- **Actual behavior**: It only **updates** matching rows. It does **not** insert when a row is missing.
- So it’s not “notification only” – it does write to the DB – but it only updates. On an empty `draft_pool`, you get no rows.

---

## How to actually populate draft_pool

You need **inserts** when there is no row yet (and optionally still update when there is). Two approaches:

### Option A: True upsert in the workflow (Insert or Update per item)

For each Notion item (with “Added to Draft Board” checked):

1. **Get** from `draft_pool` one row where `season_id` = current season and `pokemon_name` = this Pokémon (Supabase “Get” or “Get Many” with filters).
2. **If no row returned** → **Create** (Insert) that row into `draft_pool` with the transformed payload.
3. **If a row was returned** → **Update** that row (same as today).

In n8n that means: after **Transform to Supabase**, add a **Get** row from `draft_pool` (filter by `season_id` + `pokemon_name`), then an **IF** that branches on “item exists” → one branch **Create**, one branch **Update**, then merge back before the Code node and Discord.

### Option B: One-time full sync, then this workflow for updates

1. **One-time (or per season)**: Run a separate workflow or script that reads **all** Notion Draft Board rows with “Added to Draft Board” checked and **inserts** them into `draft_pool` for the current season (Create only, no update).
2. **Ongoing**: Keep the current workflow as-is. It will then **update** those existing rows when Notion changes, and Discord will still fire.

So: first seed `draft_pool` (Option B), then the current workflow is no longer “expecting” the table to be pre-populated by something else – you explicitly populate it once, and the workflow keeps it updated.

---

## Recommendation

- **Short term**: Run a **one-time seed** (Option B) so production `draft_pool` has rows for the current season (e.g. from all “Added to Draft Board” Notion rows). After that, the existing workflow will update those rows and notifications will reflect real data.
- **Long term**: Add **Insert when missing** logic (Option A) so new Pokémon added in Notion also get a row in `draft_pool` without a separate seed step.

If you want, we can sketch the exact n8n nodes for Option A (Get → IF → Create vs Update) or a small script/flow for the one-time seed in Option B.
