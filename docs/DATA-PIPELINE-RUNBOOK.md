# Data Pipeline Runbook

How to populate the app so standings, matches, draft boards, and rosters work. Choose **Option A** (Google Sheets) or **Option B** (Notion + seed).

**May 2026 update:** Teams should come from the spreadsheet **Data** tab via in-app sync. Draft pool generation uses `pokemon_master` with in-app backfill — no CLI required for normal ops.

---

## Option A: Google Sheets → Supabase (recommended for AAB league)

Use when league standings and team metadata live in the league Google Spreadsheet.

### Prerequisites

- Google Service Account with access to the spreadsheet.
- Env: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (see `lib/utils/google-sheets.ts`).
- Supabase: `google_sheets_config` and `sheet_mappings` (Admin → Google Sheets → **Save configuration**).

### Steps (teams)

1. **Configure** — Admin → [Google Sheets](/admin/google-sheets): paste URL, save config.
2. **Enable sheets** — **Select recommended** (Data tab only) or manually enable **Data** → table `teams`.
3. **Sync** — **Sync Now** → `POST /api/sync/google-sheets` → expect ~24 rows in `teams`.
4. **Validate** — Standings, team pages, coach assignment; confirm `division` and `conference` are set.

Full detail: **[GOOGLE-SHEETS-SYNC-GUIDE.md](./GOOGLE-SHEETS-SYNC-GUIDE.md)**.

### Do not

- **Select all** and sync every sheet to `teams` — Team 1–12, Rules, and Pokédex are not standings and will error or pollute logs.
- Rely on header-based parsing for the **Data** tab — use the dedicated index parser (automatic when sheet name is `Data`).

### Matches / rosters (optional)

Configure additional `sheet_mappings` only when column layout is verified:

| Suggested table | Typical sheet names |
|-----------------|---------------------|
| `matches` | Week Battles, Weekly Stats (if structured) |
| `team_rosters` | Draft Results, Draft Board |

Sync order follows `sync_order` on mappings.

### Implementation map

| Piece | Path |
|-------|------|
| Sync orchestration | `lib/google-sheets-sync.ts` |
| Data tab parser | `lib/google-sheets-data-tab.ts` |
| Sheet allowlist / skip | `lib/google-sheets-sheet-policy.ts` |
| API | `app/api/sync/google-sheets/route.ts` |
| Admin UI | `app/admin/google-sheets/page.tsx` |

### After DB reset

See [SUPABASE-DB-RESET-TROUBLESHOOTING.md](./SUPABASE-DB-RESET-TROUBLESHOOTING.md) and re-run Sheets sync for `teams`.

---

## Option B: Notion sync + manual/CSV seed

Use for Pokémon catalog / reference data or when Sheets is unavailable.

### Notion sync (catalog / reference)

1. Ensure Notion databases exist per project docs.
2. Run `POST /api/sync/notion/pull` or incremental pull (secure with `NOTION_SYNC_SECRET`).
3. Validate Supabase tables populated by Notion (`pokemon_unified`, role tags, etc.).

### League data (teams, rosters, matches)

- **Manual seed** — SQL or Table Editor for `seasons`, `teams`, `matches`, etc.
- **CSV import** — One-off scripts; resolve foreign keys by name.

---

## Draft pool data (in-app)

Separate from Sheets team sync; required before live draft.

| Step | Action |
|------|--------|
| 1 | Ensure `draft_pool` has rows with `generation` (published board or import) |
| 2 | Admin → **Draft pool rules** → **Generate** (auto-fills `pokemon_master` if empty) |
| 3 | **Publish** → `season_draft_pool` → `draft_pool` |
| 4 | Verify status API / readiness card |

Guide: **[DRAFT-IN-APP-OPERATIONS.md](./DRAFT-IN-APP-OPERATIONS.md)**.

| API | Purpose |
|-----|---------|
| `GET/POST /api/admin/pokemon-master/backfill` | Registry from `draft_pool` |
| `POST /api/admin/draft-pool-generate` | Build `season_draft_pool` |

**Game code:** optional; requires `pokemon_games` rows. Leave blank for generation-only filters.

---

## Homepage countdown (optional)

Draft/open date for the public homepage banner:

- Admin → **League** → **Countdown** tab, or `league_config` keys `draft_open_at` / season fields.
- Logic: `lib/league-countdown.ts`, banner in `components/conditional-header.tsx`.

---

## Outcome

After Option A + draft pool steps:

- `teams` populated for standings and coach flows.
- `draft_pool` available for draft board and picks.
- App resolves `season_id`, `team_id`, and pool state for Discord and dashboard.

---

## Related

- [SESSION-CHANGELOG-2026-05-19.md](./SESSION-CHANGELOG-2026-05-19.md)
- [ADMIN-CONFIG-QUICK-REFERENCE.md](./ADMIN-CONFIG-QUICK-REFERENCE.md)
