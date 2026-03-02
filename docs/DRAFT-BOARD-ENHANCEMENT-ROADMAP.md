# Draft Board Enhancement Roadmap

**Purpose**: Ideas to perfect the draft board sync system—season linking, templates, and operational improvements.

---

## Current State

| Aspect | Current Behavior |
|--------|------------------|
| **Season** | Sync targets `seasons.is_current = true` only. No UI to pick a season. |
| **Notion** | Single Draft Board database (`5e58ccd73ceb44ed83de826b51cf5c36`). No Season property in schema. |
| **Supabase** | `draft_pool` has `season_id`; one pool per season. |
| **Sync type** | Incremental (default) or Full. Full removes Pokémon unchecked in Notion. |
| **Templates** | None. `draft_pools` + `draft_pool_pokemon` tables exist but are unused for the main flow. |

---

## Enhancement Ideas

### 1. **Season Selector for Sync** (Medium effort)

**Problem**: Sync always targets the current season. Admins cannot seed a future season or fix a past one.

**Solution**:
- Add a season dropdown to the Sync Status card (or a separate "Sync to season" control).
- Pass `seasonId` in the trigger API; sync worker uses it instead of `is_current`.
- Validate: season exists and is valid.

**API change**:
```json
{ "scope": ["draft_board"], "incremental": false, "seasonId": "uuid-optional" }
```

---

### 2. **Draft Board Templates** (Higher effort)

**Problem**: Each new season requires re-curating the Notion board or re-syncing from scratch. No way to "copy last season's pool" or "apply template."

**Solution A – Save as template (from `draft_pool`)**:
- New table: `draft_pool_templates` (id, name, created_at, created_by).
- New table: `draft_pool_template_entries` (template_id, pokemon_name, point_value, tera_captain_eligible, generation, banned_reason).
- Admin action: "Save current pool as template" → snapshot current season's `draft_pool` into a template.
- Admin action: "Apply template to season" → insert template entries into `draft_pool` for chosen season (or overwrite non-drafted rows).

**Solution B – Use existing `draft_pools` + `draft_pool_pokemon`**:
- These tables already support versioned pools per season.
- Add UI to create a "template" pool (e.g. `draft_pools` with `season_id = null` or a special "template" season).
- "Apply to season" copies `draft_pool_pokemon` into `draft_pool` for the target season.

---

### 3. **Notion Draft Board per Season** (Higher effort)

**Problem**: One Notion database for all seasons. Hard to have "Season 6 Board" vs "Season 7 Board" in Notion.

**Solution**:
- Config: `NOTION_DRAFT_BOARD_DATABASE_ID` per season (e.g. in `seasons` or a `notion_database_mappings` table).
- Sync worker: resolve Notion database ID from `seasonId` (or fallback to env var).
- Allows separate Notion databases per season if desired.

**Alternative**: Add a "Season" Select/Relation in the existing Draft Board. Sync filters by that property. Requires Notion schema change and sync logic update.

---

### 4. **Copy from Previous Season** (Low–medium effort)

**Problem**: New season setup is manual. Admins want to clone last season's pool and tweak.

**Solution**:
- New API: `POST /api/admin/draft-board/copy-from-season` with `{ sourceSeasonId, targetSeasonId }`.
- Copies all non-drafted rows from source `draft_pool` to target (or inserts new rows for target season).
- Option: "Overwrite existing" vs "Merge (skip conflicts)".

---

### 5. **Sync Preview / Dry Run** (Low effort)

**Problem**: Admins want to see what would change before running a full sync.

**Solution**:
- Add "Preview" or "Dry run" option to the Full Sync flow.
- Sync worker already supports `dryRun`; ensure it returns a diff (to add, to update, to remove) in the response.
- Show a summary in the UI before confirming.

---

### 6. **Notion ↔ Season Mapping in Admin** (Medium effort)

**Problem**: Season–Notion linkage is implicit (current season + single DB). No visibility or control.

**Solution**:
- Admin page: "Draft Board Sources" or extend League/Seasons.
- Table: `season_id`, `notion_database_id`, `is_primary`.
- Sync uses this mapping when `seasonId` is provided; fallback to default DB for current season.

---

## AI Draft Board Analysis (Implemented)

**Purpose**: AI-powered analysis of the draft pool using OpenAI GPT-5.2 (reasoning model).

**Features**:
- **Balance analysis** – Identifies over/under-valued Pokémon, point distribution skew
- **Tier recommendations** – Suggests S/A/B/C groupings based on meta, stats, and point values
- **Curation suggestions** – Recommends additions/removals for pool health
- **Point value audit** – Flags potential mispricings with reasoning

**Implementation**:
- API: `POST /api/ai/draft-board-analysis` (Admin/Commissioner only)
- Input: `{ seasonId?: string, analysisType?: 'balance' | 'tiers' | 'curation' | 'full' }`
- Model: `gpt-5.2-chat-latest` with `reasoning.effort: 'medium'`
- UI: Draft Board Analysis card on Admin → Draft Board Management

**Future AI integrations** (from plan):
- Copy from season: AI suggests "copy + these tweaks" based on prior season analysis
- Templates: AI can recommend template creation or generate "suggested template" from analysis
- Sync preview: AI summarizes dry-run diff in plain language for commissioners

---

## Recommended Order

| Priority | Enhancement | Effort | Impact |
|----------|-------------|--------|--------|
| 1 | Full sync button | Done | Immediate cleanup of removed Pokémon |
| 2 | Copy from previous season | Low–med | Speeds up new season setup |
| 3 | Season selector for sync | Medium | Enables future-season prep and fixes |
| 4 | Save as template | Medium | Reusable pool configs |
| 5 | Sync preview / dry run | Low | Safer operations |
| 6 | Notion DB per season | Higher | Full flexibility for multi-season Notion setup |

---

## References

- `app/api/ai/draft-board-analysis/route.ts` – AI analysis API
- `components/admin/draft-board/draft-board-analysis-card.tsx` – AI analysis UI
- `lib/openai-client.ts` – DRAFT_BOARD_ANALYSIS model
- `lib/sync/notion-sync-worker.ts` – Sync logic
- `docs/DRAFT-BOARD-NOTION-SCHEMA.md` – Notion schema
- `supabase/migrations/20260126013542_phase1_3_enhance_draft_system.sql` – `draft_pools` / `draft_pool_pokemon` schema
