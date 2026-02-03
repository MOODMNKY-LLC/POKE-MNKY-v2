# Draft Board Table: Data Population & Architecture Assessment

## Executive summary

The table view shows empty **Types** and **sprites** (question marks) because (1) the API path that returns data does not attach types or generation from `pokemon_cache`, and (2) when `draft_pool.pokemon_id` is null or sprite URLs fail, the UI has no way to resolve types or images. This document assesses whether to fix the current Supabase-based pipeline, adopt a Super.so-style Notion-as-UI approach, or introduce a “Notion wrapper” in Supabase, and recommends the most seamless path.

---

## 1. Root cause of missing data in the table

### 1.1 Data flow today

- **Notion** (source of truth) → **n8n** (transform) → **Supabase `draft_pool`** (pokemon_name, point_value, status, tera_captain_eligible, pokemon_id, season_id, banned_reason).  
  The n8n transform *does* map Notion’s “Pokemon ID (PokeAPI)” into `pokemon_id` when present.
- **App** reads from `/api/draft/available`, which either:
  - Calls RPC **get_available_pokemon_for_free_agency**, which returns only `(pokemon_id, pokemon_name, point_value, generation)` from **draft_pool** (no types), and **filters out rows where `pokemon_id IS NULL`**, or
  - Falls back to a direct **draft_pool** query when the RPC errors or returns 0 rows; in that branch the API *does* fetch **generation** and **types** from **pokemon_cache** by `pokemon_id`.

### 1.2 Why Types are empty

- When the **RPC is used** (typical when `draft_pool.pokemon_id` is set), the API never queries `pokemon_cache` for types. The response therefore has no `types` and the table shows “—”.
- When the **direct fallback** is used, types are loaded from `pokemon_cache` by `pokemon_id`. If `pokemon_id` is null for most rows (e.g. Notion not filled or n8n not syncing it), the set of `pokemon_id`s is empty and types are still not attached. So in both paths, **types only appear when draft_pool has pokemon_id and pokemon_cache has types for that id**.

### 1.3 Why sprites show “?”

- **PokemonSprite** builds a URL from `pokemonId` (or from a `pokemon` object / `sprite` prop). If `pokemon_id` is null in the API response, the component has no id and no URL, so it renders the fallback “?”. So missing sprites are primarily due to **missing or null `pokemon_id`** in the data returned to the client (or, secondarily, image load failure).

### 1.4 Why Gen shows “1” for everyone

- In the table we use `p.generation ?? 1`. When **generation** is null (RPC returns draft_pool.generation which may be null if n8n doesn’t write it; or direct path uses cache lookup by name which can miss), the UI defaults to 1. So “Gen 1” everywhere is a **default when generation is missing**, not necessarily correct data.

---

## 2. Option A: Fix the current pipeline (Supabase-first)

**Idea:** Keep Notion → n8n → Supabase as the sync, and make the app’s single source of truth for the table “Supabase” (draft_pool + pokemon_cache). Ensure the API always returns types, generation, and a usable sprite identifier (pokemon_id or sprite_url).

**Concrete steps:**

1. **API**
   - For **both** RPC and direct-query paths: after resolving the list of available Pokémon, query **pokemon_cache** by `pokemon_id` (and optionally by `pokemon_name` when `pokemon_id` is null) to attach **types** and **generation** to each row. Use the same batch logic you already have in the direct fallback.
   - Ensure **draft_pool** is populated with **pokemon_id** (and ideally generation) from Notion. The n8n transform already sends `pokemon_id` when Notion’s “Pokemon ID (PokeAPI)” is set; so either backfill Notion or ensure the sync runs and that column is filled.
   - Optionally add a **sprite_url** (or keep using **pokemon_id** so the existing PokemonSprite logic works). No schema change required if pokemon_id is present and pokemon_cache is populated.

2. **Supabase**
   - Keep **pokemon_cache** as the place for PokeAPI-derived data (types, generation, etc.). Populate it from your existing pipeline (e.g. PokeAPI sync or Notion backfill). If Notion is the source of truth for “what’s on the draft board”, you can still use pokemon_cache as the display-data source keyed by pokemon_id (or name).
   - Optionally add a **view** that joins `draft_pool` and `pokemon_cache` so one query returns name, point_value, status, generation, types, pokemon_id (and tera_captain_eligible, etc.), and have the API call that view instead of doing two queries. That’s an optimization, not required for correctness.

**Pros:** Single read path (Supabase only); no Notion API in the app; real-time and auth stay as today; table view stays fully in your app with one place to fix (API + cache).  
**Cons:** You must keep pokemon_cache (or equivalent) in sync for display data; n8n/Notion must provide at least pokemon_id so types and sprites can resolve.

---

## 3. Option B: Super.so-style – Notion as the table UI

**Idea:** Use Notion “as” the table: either embed a Notion database view (iframe / Notion embed) or fetch the Notion API and render a table in your app that mirrors Notion’s columns (including sprites, types, etc.).

**Reality check:**

- **Embedding Notion:** Notion’s embed is page-based; embedding a full DB view in a constrained table area with your app’s auth and layout is awkward. You’d likely open Notion in a new tab or a large iframe; draft actions (pick, etc.) still live in your app and in Supabase, so you’d have two UIs (Notion for catalog, app for picks) unless you sync “Drafted” back into Notion, which adds sync complexity and possible conflicts.
- **Fetching Notion API and rendering in your app:** You’d query the Notion DB (filter “Added to Draft Board” = true), map blocks/properties to rows (Name, Point Value, Status, Type 1/2, Sprite URL, etc.), and render your own table. Draft state (who picked whom) still lives in Supabase, so you’d merge “catalog from Notion” with “status from Supabase” (e.g. by pokemon_name). That gives one table in your app with rich columns, but:
  - Notion API rate limits and latency apply.
  - You now have two read sources (Notion for catalog, Supabase for draft state and picks), and you must keep “Available” vs “Drafted” in sync (e.g. update Notion when someone drafts, or ignore Notion’s Status for “Drafted” and only use Supabase).

**Pros:** Notion remains the single source for “catalog” content (sprites, types, point value, etc.); no need to duplicate that richness in Supabase.  
**Cons:** Two sources of truth for the table (Notion + Supabase); rate limits; more moving parts; embed option doesn’t integrate neatly with in-app draft actions.

---

## 4. Option C: “Notion wrapper” in Supabase

**Idea:** Supabase remains the only data source the app reads from, but the “shape” of data is a **wrapper** that mirrors what Notion has: one row per Pokémon with name, point_value, status, types, sprite_url, generation, tera_captain_eligible, etc. So either:

- A **view** (or RPC) that joins `draft_pool` and `pokemon_cache` (and optionally a small “display” table) so one query returns all columns the table needs, or
- An **enriched table** (e.g. `draft_pool_display`) that n8n or a job fills from Notion + pokemon_cache, so the app only reads that table.

**Concrete options:**

1. **DB view / RPC**  
   Define a view (or RPC) like `draft_pool_with_display` that:
   - Selects from `draft_pool` (season_id, pokemon_name, point_value, status, tera_captain_eligible, pokemon_id, …).
   - Left-joins `pokemon_cache` on `draft_pool.pokemon_id = pokemon_cache.pokemon_id` (and optionally on name if pokemon_id is null) and pulls types, generation, and any sprite URL you store in pokemon_cache.
   - API and table then read from this view only. No new table; just one “wrapper” query.

2. **Enriched table**  
   n8n (or a backend job) writes to a table that has both “draft” fields (from Notion) and “display” fields (types, sprite_url, generation). That table is the only thing the app reads for the draft board table. Sync complexity moves into n8n (or the job): it must push Type 1/Type 2, Sprite URL, etc. from Notion into this table, or resolve them from PokeAPI/pokemon_cache by pokemon_id.

**Pros:** App keeps a single read path (Supabase); one query can return everything; no Notion API in the app; real-time and auth unchanged.  
**Cons:** You must keep the wrapper (view or enriched table) aligned with Notion’s richness—either by joining to pokemon_cache (and ensuring it’s populated) or by syncing more from Notion into Supabase.

---

## 5. Recommendation

**Use Option A (fix pipeline) plus a lightweight Option C (wrapper view).**

- **Short term (fix table population):**
  - In **`/api/draft/available`**, for the **RPC path** as well as the direct path, after you have the list of available Pokémon (with at least `pokemon_id`, `pokemon_name`), query **pokemon_cache** by `pokemon_id` (and by `pokemon_name` where `pokemon_id` is null) and attach **types** and **generation** to each item. Return `tera_captain_eligible` and `status` from draft_pool where available.
  - Ensure **draft_pool** gets **pokemon_id** from Notion (n8n already maps it; ensure Notion’s “Pokemon ID (PokeAPI)” is set for draft board rows). Then sprites will work with the existing PokemonSprite component.
  - Optionally add a **Postgres view** that joins `draft_pool` and `pokemon_cache` and expose that to the API so a single query returns name, point_value, status, generation, types, pokemon_id, tera_captain_eligible. That keeps the “wrapper” idea without a new table.

- **Why not Super.so-style as the main approach:**  
  Using Notion directly as the table UI (embed or full Notion API render) introduces two sources of truth (Notion + Supabase) and either weak integration (iframe) or extra sync and rate-limit concerns. Your draft actions and real-time state are in Supabase; keeping the table reading only from Supabase is simpler and more robust.

- **Why the “wrapper” is optional but useful:**  
  A view (or RPC) that joins draft_pool and pokemon_cache gives you a single “Notion-like” shape in Supabase without changing Notion or n8n. The app and API stay simple; you only need to ensure pokemon_cache (or the columns you join on) is populated, which you need anyway for Option A.

**Summary:** The table isn’t missing sprites and types because of a fundamental architecture flaw; it’s because the API path in use doesn’t attach types/generation and/or draft_pool often has null pokemon_id. Fix the API and sync so Supabase has (or can join to) pokemon_id, types, and generation; then add a single-query “wrapper” (view/RPC) if you want. That is more seamless and comprehensive than moving to a Notion-direct or a separate enriched table sync, while keeping Notion as the source of truth for *what* is on the board and Supabase as the source of truth for *state* and *display data* the app reads.
