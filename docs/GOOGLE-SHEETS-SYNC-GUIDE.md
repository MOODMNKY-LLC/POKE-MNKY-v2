# Google Sheets sync guide

**Route:** `/admin/google-sheets`  
**API:** `POST /api/sync/google-sheets`  
**Core logic:** `lib/google-sheets-sync.ts`, `lib/google-sheets-data-tab.ts`, `lib/google-sheets-sheet-policy.ts`

This is the canonical path for importing **league teams** (and optional matches/rosters) from the AAB spreadsheet into Supabase.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| Service account | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` in `.env.local` / Vercel |
| Sheet sharing | Spreadsheet shared with the service account email (Editor or Viewer per your policy) |
| Saved config | Spreadsheet URL/ID in `google_sheets_config` via **Save configuration** |

---

## Quick start (teams only)

1. Open **Admin → Google Sheets**.
2. Paste the league spreadsheet URL → confirm green spreadsheet ID.
3. **Save configuration**.
4. Click **Select recommended** (enables only the **Data** tab for `teams`).
5. Click **Sync Now** (always visible; disabled until config is saved and at least one sheet is enabled).

**Expected:** ~24 teams synced with division, conference, wins/losses, and strength of schedule from the **Data** tab.

---

## Admin UI controls

| Control | Behavior |
|---------|----------|
| **Select recommended** | Enables sync for the **Data** sheet only (`teams` table). |
| **Select all** | Enables every listed sheet; use only if you have set correct table mappings per sheet. |
| **Deselect all** | Clears all enable flags. |
| **Sync Now** | Runs `syncLeagueData` for enabled mappings. Shows a disabled reason if config, credentials, or enabled sheets are missing. |
| **Quick Detect / Comprehensive Analysis** | Discovers sheets and suggests mappings; does not sync by itself. |

Saved mappings appear in **Sheets to Sync** even if you have not re-run detect after a DB reset.

---

## Which sheets sync to `teams`

| Sheet | Sync to `teams`? |
|-------|------------------|
| **Data** | Yes — uses fixed column indices (wide sheet, duplicate headers). |
| **Standings** | Only if headers include team + division columns and are not `#REF!`. |
| **Team 1 … Team 12** | **No** — per-coach roster pages; skipped automatically. |
| **Rules**, **Pokédex**, **MVP**, **Backend Data**, **Draft Board**, etc. | **No** — skipped automatically. |

Policy implementation: `getTeamsSyncEligibility()` in `lib/google-sheets-sheet-policy.ts`.

---

## Data tab column layout

The **Data** tab uses index-based parsing (not header names) because the sheet has duplicate column labels.

| Index | Field |
|-------|--------|
| 1 | Team ID |
| 2 | Coach name |
| 3 | Team name |
| 5 | Division |
| 6 | Conference |
| 28–30 | Wins, losses, differential (cols AC–AE) |
| 56 | Strength of schedule (clamped for `DECIMAL(4,3)`) |

Rows matching Budget / Bye / Eliminated patterns are skipped. Missing division/conference default to **TBD**.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|--------|-----|
| Added 0, many division errors | Team pages or Rules enabled for `teams` | **Deselect all** → **Select recommended** → Sync |
| Added 0, Data enabled | Empty DB or wrong spreadsheet | Confirm URL; check `teams` in Supabase after sync |
| Sync Now disabled | No saved config or no enabled sheets | Save config; enable Data |
| `numeric field overflow` on SOS | Bad column mapping on non-Data sheets | Use Data tab only for teams |
| AI parser errors in logs | Non-team sheets with invalid headers | Ignore if those sheets are skipped; or disable them |

---

## After `supabase db reset`

1. Re-apply migrations: `supabase migration up --local` (repair orphan versions if needed — see [SUPABASE-DB-RESET-TROUBLESHOOTING.md](./SUPABASE-DB-RESET-TROUBLESHOOTING.md)).
2. Re-save Google Sheets config (mappings load from DB if still present).
3. **Select recommended** → **Sync Now**.
4. Verify **Admin → League → Teams** or `SELECT count(*) FROM teams`.

---

## APIs and tables

| Table | Role |
|-------|------|
| `google_sheets_config` | Spreadsheet ID, sync mode |
| `sheet_mappings` | Per-sheet table, range, enabled, column_mapping |
| `teams` | Sync target for Data / standings |
| `sync_log` | Last sync status and error summary |

---

## Related

- [DATA-PIPELINE-RUNBOOK.md](./DATA-PIPELINE-RUNBOOK.md) — Sheets vs Notion vs seed
- [SESSION-CHANGELOG-2026-05-19.md](./SESSION-CHANGELOG-2026-05-19.md) — May 2026 session details
