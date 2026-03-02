# Mock Draft Guide

This guide explains how to run the **Mock Draft** system for demos and testing. The mock draft uses an isolated season (“Mock Draft Demo”) and optional Discord notifications so you can exercise the full draft flow without affecting a live league.

---

## Overview

- **Mock season**: One dedicated season named **“Mock Draft Demo”** with `is_current: false`.
- **Mock teams**: Three teams (Mock Draft Team A, B, C) by default.
- **Mock pool**: Draft pool for that season is seeded from an existing season’s pool or a small fallback list.
- **Execution**: Either run an automated script (or admin API) that makes picks in order, or use the in-app draft board with the mock season.

---

## 1. Seed mock data

Run the seed script once (or after a reset) to ensure the mock season, teams, draft pool, and budgets exist:

```bash
pnpm exec tsx --env-file=.env.local scripts/seed-mock-draft.ts
```

This script:

- Gets or creates the season **“Mock Draft Demo”**.
- Gets or creates three teams for that season.
- Seeds **draft_pool** for the mock season (copy from another season or a small fallback list).
- Ensures **draft_budgets** (120 pts, 0 spent) for each team.

It is idempotent: safe to run multiple times.

---

## 2. Run an automated mock draft

### Option A: Script

```bash
pnpm exec tsx --env-file=.env.local scripts/run-mock-draft.ts [maxPicks]
```

- If no **active** draft session exists for the mock season, the script creates one (snake, 45s limit).
- It then runs picks in order until the draft is complete or you hit `maxPicks` (if provided).
- Example: `scripts/run-mock-draft.ts 9` runs at most 9 picks.

### Option B: Admin API

**POST** `/api/draft/mock/run` (admin or commissioner only).

- **Body** (optional):
  - `season_id` – UUID of the season to run (default: mock season by name).
  - `max_picks` – cap number of picks (optional).
- Creates an active session if needed, then runs the same automated pick loop.
- Returns a summary: `picksMade`, `sessionId`, `completed`, `picks`, `finalBudgets`.

Use this for E2E tests or demos without running the script locally.

---

## 3. Optional: Discord notifications

If you set **`MOCK_DRAFT_DISCORD_WEBHOOK_URL`** in `.env.local`, the script and the mock/run API will send short messages to that webhook:

- When the mock draft starts.
- After each pick: e.g. “Mock draft: Pick #N – [Team] drafted **Pokémon** (X pts).”
- When the run finishes: “Mock draft run finished. Picks made: N.”

Use a Discord channel webhook (e.g. #bot-command-testing or a dedicated #demo-draft channel). See [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md) for channel IDs if you integrate with other Discord tooling.

---

## 4. Reset mock draft (repeatable runs)

To run another mock draft from a clean state (e.g. for E2E or another demo):

```bash
pnpm exec tsx --env-file=.env.local scripts/reset-mock-draft.ts
```

This:

- Cancels any active/paused draft session for the mock season.
- Sets all **draft_pool** rows for the mock season that were **drafted** back to **available** and clears draft metadata.
- Resets **draft_budgets** for that season’s teams to 0 spent, 120 remaining.

Then run **seed-mock-draft** again if you want to refresh pool data, or run **run-mock-draft** (or call **POST /api/draft/mock/run**) to start a new automated draft.

---

## 5. Using the draft board with the mock season

The in-app draft board shows the **current** season by default (where `seasons.is_current = true`). To use the draft board with the mock season:

1. **Temporarily set mock as current**  
   In the admin area, set “Mock Draft Demo” as the current season. The draft board will then show that season’s pool and session. Remember to set your real league season back as current when done.

2. **Pick submission**  
   The board submits picks via **POST /api/draft/pick-by-name** with `season_id`, `team_id`, and `pokemon_name`. That endpoint works for any season with an active session, including the mock season. So once the mock season is current (or the board is pointed at it), coaches (or you) can make picks from the UI.

There is no separate “demo mode” query parameter; “demo” is achieved by using the mock season and optionally making it current for the board.

---

## 6. Quick reference

| Task              | Command or endpoint                                      |
|------------------|-----------------------------------------------------------|
| Seed mock data   | `pnpm exec tsx --env-file=.env.local scripts/seed-mock-draft.ts` |
| Run mock draft   | `pnpm exec tsx --env-file=.env.local scripts/run-mock-draft.ts [maxPicks]` |
| Run via API      | `POST /api/draft/mock/run` (admin/commissioner), body: `{ "max_picks": 9 }` optional |
| Reset mock state | `pnpm exec tsx --env-file=.env.local scripts/reset-mock-draft.ts` |
| Discord          | Set `MOCK_DRAFT_DISCORD_WEBHOOK_URL` for pick/start/end messages |

---

## Related

- [DRAFT-SYSTEM-USER-GUIDE.md](./DRAFT-SYSTEM-USER-GUIDE.md) – full draft system overview.
- [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md) – Discord channels and IDs.
