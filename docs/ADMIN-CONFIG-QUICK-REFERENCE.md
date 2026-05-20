# Admin Config Quick Reference

Commissioners can manage Discord, draft sessions, and matches from the admin UI without editing code.

## Entry points

| Area | Route | Purpose |
|------|--------|--------|
| **Admin dashboard** | `/admin` | Overview and links to sections |
| **Discord** | `/admin/discord` | Roles, bot status, config, webhooks |
| **Draft sessions** | `/admin/draft/sessions` | List/create/update draft sessions |
| **League (teams, matches, stats, sync)** | `/admin/league` | Teams tab, Matches tab, Statistics, Sync logs, **Countdown** |
| **Google Sheets** | `/admin/google-sheets` | Spreadsheet sync → `teams` / matches / rosters |
| **Draft pool rules** | `/admin/draft-pool-rules` | Generate `season_draft_pool`, publish board, registry backfill |

## Discord (`/admin/discord`)

- **Roles**: Map Discord role IDs to app roles (e.g. coach, commissioner). Used for role sync and permission checks.
- **Bot**: Check bot status and connectivity.
- **Config**: Guild/default season and related Discord app settings (if exposed).
- **Webhooks**: Configure webhook URLs (e.g. `match_results`) and enable/disable. Used by the Integration Worker for posting battle results.

Ensure `discord_webhooks` has a row for `match_results` with `webhook_url` and `enabled = true` if you want battle results posted to Discord.

## Draft sessions (`/admin/draft/sessions`)

- **List**: Loads from `GET /api/admin/draft/sessions`.
- **Create**: `POST /api/draft/create-session` with `draft_type`, `pick_time_limit`, etc.
- **Update**: `PATCH /api/admin/draft/sessions/[id]` for status/round (if implemented).

Requires a season to exist; create session for that season so coaches can use `/pick` and draft status.

## Match management (`/admin/league` → Matches tab)

- **League matches tab**: Lists and manages matches (e.g. create, set result, link Showdown room). Data from `GET /api/matches` or equivalent; updates via admin match API if available.

Match management is under **League** → **Matches** (hash `#matches`). Use this to create weekly matches, assign teams, and (if manual) enter results until the Integration Worker is verified.

## Environment / permissions

- Admin routes are protected by middleware; only users with admin role (e.g. in `admin_users` or app role) should access `/admin/*`.
- Discord webhooks and bot key: set in server/env (e.g. `DISCORD_BOT_API_KEY`, webhook URL in DB).
- **Google Sheets:** [GOOGLE-SHEETS-SYNC-GUIDE.md](./GOOGLE-SHEETS-SYNC-GUIDE.md) — use **Select recommended** (Data tab) then **Sync Now**.
- **Draft pool:** [DRAFT-IN-APP-OPERATIONS.md](./DRAFT-IN-APP-OPERATIONS.md) — Generate (auto-fills `pokemon_master`), Publish; leave **Game code** empty unless `pokemon_games` is populated.
- **Homepage countdown:** League → Countdown tab; sets draft open time for banner on `/`.

## Google Sheets (`/admin/google-sheets`)

- Paste spreadsheet URL → **Save configuration**.
- **Select recommended** enables only the **Data** sheet for `teams` (~24 teams).
- **Sync Now** runs `POST /api/sync/google-sheets` (visible even when disabled, with reason text).
- Do not enable Team 1–12 or Rules for `teams` — sync policy skips them server-side.

## Draft pool rules (`/admin/draft-pool-rules`)

1. Check **Pokémon registry** count on the page.
2. **Populate registry from draft board** if `pokemon_master` is 0 (or let **Generate** auto-backfill).
3. Set generation (e.g. `9`); optional game code only if `pokemon_games` has data.
4. **Generate** → `season_draft_pool`.
5. **Publish** → live `draft_pool` for coaches.

APIs: `GET/POST /api/admin/pokemon-master/backfill`, `POST /api/admin/draft-pool-generate`, `POST /api/admin/draft-pools/publish`.
