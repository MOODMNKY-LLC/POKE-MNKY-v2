# Draft Board Notion Schema

**Purpose**: Document Notion draft board structure for league admin and two-way sync with Supabase `draft_pool`.

---

## Discovered: Existing Draft Pools Database

**Database ID**: `dd31c18ecd824e04a93597d629b067b9`  
**URL**: https://www.notion.so/dd31c18ecd824e04a93597d629b067b9  
**Data Source**: `collection://571cbd9e-20de-44e0-8f41-19350aa6421a`  
**Parent**: POKE MNKY v4 (`2f4cd2a6542280c09262d8c2feb8a067`)

### Current schema (pool version per season)

| Property         | Type     | Purpose / Notes                                      |
|------------------|----------|------------------------------------------------------|
| Draft Pool       | Title    | Name of the pool (e.g. "Season 5 Pool")             |
| Season           | Relation | Link to Seasons DB (`collection://26536ed0-97d6-4744-98cf-ffec6f45beab`) |
| Pokemon Included | Relation | Link to Pokemon Catalog – Pokémon in this pool       |
| Banned Pokemon   | Relation | Link to Pokemon Catalog – banned from this pool      |
| Locked           | Checkbox | Whether pool is locked for editing                   |
| Rules Notes      | Text     | Free-form notes                                      |

This is **one row per pool configuration** (e.g. one row per season), not one row per Pokémon with point value. To support a draft board where each Pokémon has a **point value (1–20)** and **Tera Captain Eligible** per season, we use a separate **Draft Board** database below.

---

## Draft Board Database (one row per Pokémon entry)

Used as the league admin source of truth: **full catalog of Pokémon from generations 1–9** (PokeAPI IDs 1–1025). Each row has comprehensive Pokédex-level detail. A **smaller sample** is chosen for the actual draft pool by checking **"Added to Draft Board"**; only those rows are synced to Supabase `draft_pool`.

**Database ID**: `5e58ccd73ceb44ed83de826b51cf5c36`  
**URL**: https://www.notion.so/5e58ccd73ceb44ed83de826b51cf5c36  
**Data Source**: `collection://7efba35e-03ef-4597-82ad-1c38e47bd06b`  
**Parent**: POKE MNKY v4 (`2f4cd2a6542280c09262d8c2feb8a067`)

### Target schema (aligned with Supabase `draft_pool`)

| Notion property        | Type    | Supabase mapping                    | Notes |
|------------------------|---------|-------------------------------------|-------|
| Name                   | Title   | `draft_pool.pokemon_name`           | Pokémon species name (e.g. Garchomp) |
| Point Value            | Number  | `draft_pool.point_value`            | 1–20 |
| Status                 | Select  | `draft_pool.status`                | **Active draft state**: Available, Banned, Unavailable, **Drafted** (set by sync from Supabase). This is the **single source of truth** for availability and draft state. Syncs to/from Supabase. |
| Tera Captain Eligible  | Checkbox| `draft_pool.tera_captain_eligible`  | Default true |
| Season                 | Select or Relation | `draft_pool.season_id` | Add in Notion UI (Select: "Season 5", etc.) or Relation to Seasons; sync resolves to Supabase UUID |
| Pokemon ID (PokeAPI)   | Number  | `draft_pool.pokemon_id`            | PokeAPI/pokemon_cache id; optional |
| Generation             | Number  | `draft_pool.generation`             | 9 for Gen 9 |
| Notes / Banned Reason  | Text    | `draft_pool.banned_reason`          | Optional |
| Added to Draft Board   | Checkbox | —                                  | When **checked**, this row is included in the sync to Supabase `draft_pool`. Unchecked = in full catalog only. Default false on populate. |
| ~~Availability Status~~ | ~~Select~~ | ~~—~~ | ~~**DEPRECATED/REDUNDANT**: Legacy property not used in sync. Use "Status" instead. Can be removed.~~

### Comprehensive fields (Pokemon Catalog–like)

These properties are populated by `scripts/populate-notion-draft-board.ts` from PokeAPI (pokenode-ts). They are **Notion-only**; the Notion → Supabase sync does **not** write them to `draft_pool` (Supabase has no columns for them).

| Notion property   | Type     | PokeAPI source / notes |
|-------------------|----------|------------------------|
| Type 1            | Select   | `types[0].type.name` (capitalized) |
| Type 2            | Select   | `types[1].type.name` or "(none)" |
| HP, Atk, Def, SpA, SpD, Spe | Number | `stats[]` by stat name (hp, attack, defense, special-attack, special-defense, speed) |
| BST               | Number   | Sum of the six base stats |
| Speed @ 0 EV      | Number   | Level 50 formula: 0 EV, 31 IV, neutral (see `lib/pokemon-stats.ts` `calculateSpeedTiersLevel50`) |
| Speed @ 252 EV    | Number   | Level 50 formula: 252 EV, 31 IV, neutral |
| Speed @ 252+      | Number   | Level 50 formula: 252 EV, 31 IV, +nature (1.1x) |
| Height            | Number   | PokeAPI `height` (decimetres) |
| Weight            | Number   | PokeAPI `weight` (hectograms) |
| Base Experience   | Number   | PokeAPI `base_experience` |
| Abilities         | Rich text | All abilities; hidden marked as "Hidden: X" |
| Sprite URL        | URL      | PokeAPI CDN: `sprites.other['official-artwork'].front_default` or `front_default` |
| GitHub Sprite URL | URL      | PokeAPI/sprites repo: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png` |
| Sprite            | **Files & media** | Same URL as GitHub Sprite; displays as **image thumbnail** in the table (external file). URL properties show as links only. |
| Species Name      | Rich text | Optional: from Species API `genera` (English) |
| Pokedex #         | Number   | Same as Pokemon ID (PokeAPI id) |

To add these properties to the Draft Board database in Notion, run once:  
`pnpm exec tsx --env-file=.env.local scripts/ensure-draft-board-schema.ts`

**Why sprites show as links vs thumbnails:** Notion **URL** properties (Sprite URL, GitHub Sprite URL) display as clickable links only. To show **visual sprites** in the table, use the **Sprite** property (type: Files & media) with an external image URL—Notion renders those as thumbnails.

**Page icons:** Each Draft Board row has a **page icon** set to the official artwork URL. The icon appears next to the **Name** in the database view (table/gallery). The populate script sets it on create; the backfill script sets it on existing rows.

**Page covers:** Each Draft Board row has a **page cover** set to the official artwork URL. The cover appears as a large banner at the top of the page when opened, and **prominently in Gallery View cards** as the primary visual element. This enables beautiful card-based browsing similar to Thomas Frank's Pokedex. The populate script sets covers on create; the backfill script sets covers on existing rows.

**Supabase alignment:** The `draft_pool` table in Supabase has **no sprite columns** (only pokemon_name, point_value, status, tera_captain_eligible, pokemon_id, generation, banned_reason, draft state). Sprite URL and GitHub Sprite URL are **Notion-only** catalog fields. The app can derive sprite URLs from `pokemon_id` via `getFallbackSpriteUrl(pokemon_id, false, "artwork")` or from views like `draft_pool_comprehensive` that join to pokemon data. Sync from Notion → Supabase does not write sprite fields.

**Sync behaviour:** Notion → Supabase sync only includes rows where **Added to Draft Board** is checked. The full list (Gen 1–9) lives in Notion; the draft pool in Supabase is the subset you mark with the checkbox.

### Sync rules

- **Notion → Supabase**: Sync job updates `draft_pool` from Notion; **do not** overwrite `status = 'drafted'` or `drafted_by_team_id` (Supabase wins for draft state).
- **Supabase → Notion**: When a pick is recorded via `DraftSystem.makePick()`, the app optionally updates the Notion row to Status = "Drafted" using `notion_mappings` (`entity_type = 'draft_pool'`, `entity_id = draft_pool.id`). See `lib/sync/push-draft-state-to-notion.ts`.

### Automation

**Real-time sync via webhooks**: See [Notion Draft Board Automation Setup](./NOTION-DRAFT-BOARD-AUTOMATION-SETUP.md) for configuring automated synchronization using Notion webhooks and n8n workflows.

### Runbook

0. **Ensure Draft Board schema (once before first populate or when adding new properties)**  
   `pnpm exec tsx --env-file=.env.local scripts/ensure-draft-board-schema.ts`  
   Adds missing comprehensive properties (Type 1/2, stats, BST, speed tiers, Abilities, Sprite URL, etc.). Optional: `--dry-run`.

1. **Populate Notion Draft Board (one-time or new season)**  
   `pnpm exec tsx --env-file=.env.local scripts/populate-notion-draft-board.ts`  
   Populates all Pokémon from Gen 1–9 (IDs 1–1025) with full detail. Optional: `--dry-run`, `--limit N`. Ensure the Draft Board database is shared with your Notion integration. Then in Notion, check **Added to Draft Board** for the subset you want in the current season's draft pool.

1b. **Backfill GitHub Sprite URL, Icons, and Covers (existing rows only)**  
   After adding the **GitHub Sprite URL** property or to add covers for Gallery View, run:  
   `pnpm exec tsx --env-file=.env.local scripts/backfill-draft-board-github-sprites.ts`  
   This sets GitHub Sprite URL, Sprite (files), page icon, and page cover. Optional: `--dry-run`, `--limit N`.

2. **Sync Notion → Supabase**  
   `POST /api/sync/notion/pull` with body `{ "scope": ["draft_board"] }` (or include `draft_board` with other scopes).  
   Uses current season (`seasons.is_current = true`). Requires `NOTION_API_KEY` and `NOTION_SYNC_SECRET`.

3. **Optional: Supabase → Notion (draft state)**  
   Automatic when a pick is made via `DraftSystem.makePick()`. No extra step; requires `NOTION_API_KEY` and prior Notion → Supabase sync so `notion_mappings` exists.

4. **Create Filtered Views in Notion**  
   To display only Pokémon where "Added to Draft Board" is checked (e.g., "Draft Board Season 7" view), see [Draft Board Views Guide](./DRAFT-BOARD-VIEWS-GUIDE.md) for step-by-step instructions.  
   Validate inclusions: `pnpm exec tsx --env-file=.env.local scripts/validate-draft-board-inclusions.ts`

---

## Related Notion databases

| Database        | ID (no dashes)           | Use |
|-----------------|---------------------------|-----|
| Draft Pools     | dd31c18ecd824e04a93597d629b067b9 | Pool config per season (Pokemon Included / Banned) |
| Draft Board     | 5e58ccd73ceb44ed83de826b51cf5c36 | One row per Pokémon per season (point value, status, Tera) |
| Pokemon Catalog | 6ecead11a27545e9b2ed10aa4ac76b5a | Has Draft Points, Eligible; relation target for Draft Pools |
| Seasons         | 2ec8e71938e24da38041cff3d7277b8c | Season relation for Draft Board and Draft Pools |

---

## Pokemon Catalog (reference)

**Data Source**: `collection://9f7b6b32-e56b-468a-8225-e06c5d0e1d87`

Relevant for draft: **Draft Points** (number), **Eligible** (checkbox), **Pokedex #** (number), **Name** (title). The **Draft Board** database holds season-specific point values and status; Pokemon Catalog can remain the canonical Pokémon list and stats.
