# In-app draft operations

**Status:** Canonical operator path for pool setup and live drafting.

Notion/n8n workflows remain in the repo for legacy environments only. Do not add new features there; use this guide instead.

---

## Data model

| Table | Role |
|--------|------|
| `pokemon_master` | Canonical species registry (dex, types, default points, legendary flags) |
| `pokemon_games` | Optional map of species → game codes (`SV`, `FRLG`, …) for filtering |
| `draft_pool` | Published board coaches see and pick from (legacy rows also seed the registry) |
| `season_draft_pool` | Per-season builder catalog (generate, edit, archive) |
| `draft_pool_pokemon_master` | Archived pool snapshots (links to `pokemon_master`) |
| `draft_sessions` | Turn order, pick number, session status |
| `team_rosters` | Picks recorded by `DraftSystem.makePick` |

### Pipeline

```text
draft_pool  ──backfill──►  pokemon_master  ──Generate──►  season_draft_pool  ──Publish──►  draft_pool
```

- **Generate** never reads `draft_pool` directly; it reads `pokemon_master`.
- If `pokemon_master` is empty, **Generate auto-runs backfill** from `draft_pool` (same logic as **Populate registry** in the UI).
- If both are empty, publish or import board data first, then Generate.

---

## Operator checklist

1. **Create season** — Admin → League → seasons; set current season.
2. **Teams & coaches** — Sync or create teams; assign coaches (`profiles.team_id`, Discord sync). See [GOOGLE-SHEETS-SYNC-GUIDE.md](./GOOGLE-SHEETS-SYNC-GUIDE.md) for spreadsheet import.
3. **Board data (if needed)** — Ensure `draft_pool` has rows with `generation` set (from a prior publish, import, or seed).
4. **Build pool** — `/admin/draft-pool-rules`:
   - Review **Pokémon registry** counts (GET status via page load).
   - Optional: **Populate registry from draft board** if master count is 0.
   - Set **Generation** (e.g. `9`). Leave **Game code** empty unless `pokemon_games` is populated.
   - Toggle legendary / mythical / paradox as needed.
   - **Generate** → fills `season_draft_pool` from `pokemon_master`.
   - **Publish** → copies included rows to `draft_pool` (never changes `status = drafted` rows).
5. **Verify** — `GET /api/admin/draft-pools/status` or readiness card on Draft Pool Rules (available count &gt; 0).
6. **Create session** — Admin → Draft Sessions → Create Session wizard. Auto-publishes after generate/load when needed.
7. **Coaches draft** — `/dashboard/draft/board` → `POST /api/draft/pick-by-name` → `DraftSystem.makePick`.

---

## Game code (optional filter)

| Concept | Detail |
|---------|--------|
| **Field** | Text on Draft Pool Rules and Create Session wizard (e.g. `SV`, `FRLG`) |
| **Table** | `pokemon_games` (`pokemon_id`, `game_code`, `generation`) |
| **Behavior** | Generate only includes `pokemon_master` rows whose id appears in `pokemon_games` for that `game_code` |
| **Default** | Leave **empty** — filter by generation + legendary/mythical/paradox only |
| **Empty table** | If `pokemon_games` has no rows, any game code returns **0** matches |

---

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/pokemon-master/backfill` | Registry + `draft_pool` + `pokemon_games` counts |
| `POST /api/admin/pokemon-master/backfill` | Populate `pokemon_master` from `draft_pool` |
| `POST /api/admin/draft-pool-generate` | Generate `season_draft_pool` (auto-backfill if master empty) |
| `POST /api/admin/draft-pools/publish` | Publish builder → board |
| `GET /api/admin/draft-pools/status?season_id=` | Readiness counts |
| `POST /api/draft/create-session` | Create session (+ auto-publish) |
| `POST /api/draft/pick-by-name` | **Production pick path** |

### Publish options

```json
{
  "season_id": "uuid",
  "prune_absent": false,
  "force": false
}
```

- `force: true` — Admin only; allows publish during an active session.
- Returns `{ published, updated, skipped_drafted, pruned, warnings }`.

---

## Pick paths

| Path | Use |
|------|-----|
| `pick-by-name` + `makePick` | Coach UI, budgets, `draft_pool` status |
| `POST /api/draft/pick` | **Deprecated** — `rpc_submit_draft_pick` / `draft_picks` (reporting only) |
| Discord `/api/discord/draft/pick` | Bot RPC (separate; not unified in this project) |

---

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `DRAFT_PUSH_TO_NOTION` | off | Set `true` to push drafted rows to Notion after each pick (legacy) |

---

## Manual verification

1. Confirm `pokemon_master` count &gt; 0 (or run Populate registry).
2. Generate pool for current season (e.g. Gen 9, no game code).
3. Publish → confirm board available count matches included builder count (minus any already drafted).
4. Create draft session → session `active` (or `pending` for commissioner-only flow).
5. Pick on board → `draft_pool` row `drafted`, session pick advances, budget decreases.

Run unit tests:

```bash
pnpm exec vitest run lib/draft-pool-publish.test.ts lib/__tests__/google-sheets-sheet-policy.test.ts
```

---

## Related docs

- [GOOGLE-SHEETS-SYNC-GUIDE.md](./GOOGLE-SHEETS-SYNC-GUIDE.md) — league teams from spreadsheet
- [CREATE-DRAFT-SESSION-GUIDE.md](./CREATE-DRAFT-SESSION-GUIDE.md) — wizard steps and auto-publish
- [DRAFT-BOARD-DISPLAY-ARCHITECTURE.md](./DRAFT-BOARD-DISPLAY-ARCHITECTURE.md) — coach UI data flow
- [SESSION-CHANGELOG-2026-05-19.md](./SESSION-CHANGELOG-2026-05-19.md) — May 2026 implementation log
- [N8N-DRAFT-POOL-SEED-AND-UPSERT.md](./N8N-DRAFT-POOL-SEED-AND-UPSERT.md) — **legacy** Notion seed/sync
