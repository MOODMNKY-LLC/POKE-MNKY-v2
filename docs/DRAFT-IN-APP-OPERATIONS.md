# In-app draft operations

**Status:** Canonical operator path for pool setup and live drafting.

Notion/n8n workflows remain in the repo for legacy environments only. Do not add new features there; use this guide instead.

---

## Data model

| Table | Role |
|--------|------|
| `season_draft_pool` | Builder catalog (generate, edit, archive) |
| `draft_pool` | Published board coaches see and pick from |
| `draft_sessions` | Turn order, pick number, session status |
| `team_rosters` | Picks recorded by `DraftSystem.makePick` |

---

## Operator checklist

1. **Create season** — Admin → League → seasons; set current season.
2. **Teams & coaches** — Create teams and assign coaches (`profiles.team_id`, Discord sync).
3. **Build pool** — `/admin/draft-pool-rules`:
   - **Generate** → fills `season_draft_pool` from `pokemon_master`.
   - **Publish** → copies included rows to `draft_pool` (never changes `status = drafted` rows).
4. **Verify** — `GET /api/admin/draft-pools/status` or readiness card on Draft Pool Rules (available count &gt; 0).
5. **Create session** — Admin → Draft Sessions → Create Session wizard. Auto-publishes after generate/load when needed.
6. **Coaches draft** — `/dashboard/draft/board` → `POST /api/draft/pick-by-name` → `DraftSystem.makePick`.

---

## APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/draft-pool-generate` | Generate `season_draft_pool` |
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

1. Generate pool for current season.
2. Publish → confirm board available count matches included builder count (minus any already drafted).
3. Create draft session → session `active` (or `pending` for commissioner-only flow).
4. Pick on board → `draft_pool` row `drafted`, session pick advances, budget decreases.

Run unit tests:

```bash
pnpm exec vitest run lib/draft-pool-publish.test.ts
```

---

## Related docs

- [CREATE-DRAFT-SESSION-GUIDE.md](./CREATE-DRAFT-SESSION-GUIDE.md) — wizard steps and auto-publish
- [DRAFT-BOARD-DISPLAY-ARCHITECTURE.md](./DRAFT-BOARD-DISPLAY-ARCHITECTURE.md) — coach UI data flow
- [N8N-DRAFT-POOL-SEED-AND-UPSERT.md](./N8N-DRAFT-POOL-SEED-AND-UPSERT.md) — **legacy** Notion seed/sync
