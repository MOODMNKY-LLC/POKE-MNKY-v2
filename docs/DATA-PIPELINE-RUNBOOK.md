# Data Pipeline Runbook

This document describes how to populate the app with league data so standings, matches, and draft/rosters work. Choose **Option A** (Google Sheets) or **Option B** (Notion + seed).

---

## Option A: Google Sheets → Supabase migration

Use when league data currently lives in Google Sheets and you want a one-time or recurring sync.

### Prerequisites

- Google Service Account with access to the league spreadsheet (JSON key or env vars).
- Env vars set: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (or equivalent; see `lib/utils/google-sheets.ts`).
- Supabase: `google_sheets_config` and `sheet_mappings` populated (e.g. via Admin → Google Sheets).

### Steps

1. **Configure sync** (Admin → Google Sheets, or DB):
   - Insert/update `google_sheets_config`: `spreadsheet_id` = your sheet ID.
   - Insert/update `sheet_mappings`: one row per sheet (e.g. Standings → teams, Draft Results → team_rosters, Week Battles → matches), with `enabled = true` and `sync_order` for execution order.

2. **Run sync**:
   - **From app**: Call `POST /api/sync/google-sheets` (or the sync route that invokes `syncLeagueData`) as an authenticated admin. Or use Admin → Google Sheets and trigger “Sync” if the UI exposes it.
   - **From script**: Use `syncLeagueData()` from `lib/google-sheets-sync.ts` with the same config (spreadsheet ID + mappings).

3. **Validate**:
   - Check `teams`, `matches`, `draft_picks` / rosters in Supabase (Table Editor or SQL).
   - Open app: Standings, Matches, Team pages and confirm data and IDs (e.g. `team_id`, `season_id`) line up.

4. **Deprecate Sheets as source of truth**: After validation, treat Supabase as canonical; run sync only for backfills or one-off imports.

### Notes

- Sync logic lives in `lib/google-sheets-sync.ts` and is invoked by the sync API route. Mapping from sheet columns to DB columns is configurable via `sheet_mappings` / parsers (e.g. `lib/google-sheets-parsers/`).
- If sync was “disabled in v0”, ensure env vars and config are set in the environment where the sync runs (e.g. Vercel for app-triggered sync).

---

## Option B: Notion sync + manual/CSV seed

Use when you prefer Notion as the catalog source or when you don’t have Google Sheets.

### Notion sync (catalog / reference data)

1. **Notion databases**: Ensure Notion workspace has the required databases (e.g. Pokémon catalog, role tags, moves) and relations as per project docs.
2. **Run Notion pull**:
   - `POST /api/sync/notion/pull` (full) or `POST /api/sync/notion/pull/incremental` (incremental). Secure with `NOTION_SYNC_SECRET` or equivalent.
   - Or run the Notion sync worker (see `lib/sync/notion-sync-worker.ts` and sync API routes).
3. **Validate**: Check Supabase tables populated by Notion sync (e.g. `pokemon`, `role_tags`, `moves`, `notion_mappings`).

### League data (teams, rosters, matches)

- **Manual seed**: Insert `seasons`, `teams`, `coaches`, `season_teams`, `draft_picks` (rosters), `matches` via SQL or Supabase Table Editor. Use UUIDs and foreign keys consistent with app (e.g. `team_id`, `season_id`).
- **CSV import**: Export from Sheets/Notion to CSV, then use a one-off script or Supabase CSV import to load into `teams`, `matches`, `draft_picks`, etc. Map columns to the schema; resolve coach/team/season IDs (e.g. by name lookup) before insert.

### Validation

- Same as Option A: confirm standings, matches, and team/roster pages in the app show correct data and no broken links (e.g. missing `season_id`, `team_id`).

---

## Outcome

After either option:

- App has real league data: standings, matches, rosters.
- Draft and free agency (and Discord bot) can resolve teams, seasons, and pool/roster state correctly.
