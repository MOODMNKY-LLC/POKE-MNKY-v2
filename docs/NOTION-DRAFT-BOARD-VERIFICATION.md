# Notion Draft Board ↔ Supabase Verification

This document records verification of the **Master Draft Board** in Notion and its sync to Supabase, using Notion MCP and Supabase local MCP (March 2026).

## Notion (via Notion plugin)

- **Database:** Master Draft Board  
- **URL:** https://www.notion.so/5e58ccd73ceb44ed83de826b51cf5c36  
- **Parent page:** POKE MNKY v4  
- **Data source ID:** `collection://7efba35e-03ef-4597-82ad-1c38e47bd06b`  

### Schema (sync-relevant properties)

| Notion property              | Type    | Sync worker mapping                          |
|-----------------------------|---------|---------------------------------------------|
| Name                        | title   | `pokemon_name`                              |
| Point Value                 | number  | `point_value` (clamped 1–20, default 10)    |
| Added to Draft Board        | checkbox| Rows with `true` only are synced            |
| Status                      | select  | `status` (Available, Banned, Unavailable, Drafted) |
| Tera Captain Eligible       | checkbox| `tera_captain_eligible`                     |
| Generation                  | number  | `generation`                                 |
| Notes                       | text    | `banned_reason` (Notes / Banned Reason)     |
| Pokemon ID (PokeAPI)        | number  | Not used for FK; `pokemon_id` from `pokemon_cache` by name |

### Views

- **Master Draft Board: Table** – full table, sort by Name  
- **Master Draft Board: Gallery** – gallery with Sprite, Point Value, Status  
- **Draft Board: Season 7** – board view filtered by “Added to Draft Board” = true  

Sync worker uses database ID `5e58ccd73ceb44ed83de826b51cf5c36` (no view URL required; it queries all pages and filters by “Added to Draft Board” in code).

---

## Supabase (via Supabase local MCP)

- **Current season:** Season 7 (`is_current = true`)  
- **draft_pool (Season 7):** 1,025 rows (1,015 available, 10 banned)  
- **Unique constraint:** One row per `(season_id, pokemon_name)`; sync dedupes by name and upserts with `onConflict: "season_id,pokemon_name"`.  

---

## Sync job behavior (after fixes)

- When scope is **draft_board only** and `draft_board` stats show **synced > 0**, **failed === 0**, and **no errors**, the job is marked **completed** even if Realtime broadcast fails.  
- “Trigger Sync” sends `scope: ["draft_board"]` and `incremental: true` (no `since` by default, so all Notion pages are queried).  

---

## References

- Sync worker: `lib/sync/notion-sync-worker.ts`  
- Pull API: `app/api/sync/notion/pull/route.ts`  
- Draft Board Management UI: `components/admin/draft-board/sync-status.tsx`  
- Season 7 go-live: `docs/SEASON-7-GO-LIVE.md`  
