# Live draft pick timer (Vercel Hobby–friendly)

## Goal

Enforce `draft_sessions.pick_time_limit_seconds` server-side. When the current pick’s deadline passes:

- If `auto_draft_enabled` is true → auto-pick the cheapest available Pokémon the team can afford.
- Otherwise → skip the pick and advance the turn.

League values (point budget, roster size, timer length, etc.) stay configurable on the session / season rules — this only enforces whatever is configured.

## Approach

1. **Deadline column** — `draft_sessions.current_pick_deadline_at` is set when a session goes live and whenever a pick/skip advances the turn (`rpc_set_draft_pick_deadline` / `rpc_make_live_draft_pick`).

2. **Atomic enforce RPC** — `rpc_enforce_draft_pick_timer(session_id)` locks the session row, no-ops if the deadline is still in the future (or missing → sets one), otherwise calls `rpc_make_live_draft_pick` for auto-pick or skip.

3. **Opportunistic checks (primary on Hobby)** — `/api/draft/status` and `DraftSystem.makePick` call the enforce RPC on every request. While the draft board is open and polling status, timers advance without relying on frequent cron.

4. **Cron backup** — `GET /api/cron/draft-timers` (Bearer `CRON_SECRET`, scheduled hourly in `vercel.json`) sweeps active sessions. On Vercel Hobby, cron frequency is limited; treat this as a safety net for idle boards, not the sole enforcer.

## Related RPCs

- `rpc_make_live_draft_pick` — single-transaction pick (turn, budget, availability, roster, pool, advance).
- `rpc_enforce_draft_pick_timer` — timer gate used by status/pick/cron.
- `rpc_set_draft_pick_deadline` — sets `current_pick_deadline_at` from `pick_time_limit_seconds`.
