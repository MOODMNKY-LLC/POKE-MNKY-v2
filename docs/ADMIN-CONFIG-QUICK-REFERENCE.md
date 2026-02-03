# Admin Config Quick Reference

Commissioners can manage Discord, draft sessions, and matches from the admin UI without editing code.

## Entry points

| Area | Route | Purpose |
|------|--------|--------|
| **Admin dashboard** | `/admin` | Overview and links to sections |
| **Discord** | `/admin/discord` | Roles, bot status, config, webhooks |
| **Draft sessions** | `/admin/draft/sessions` | List/create/update draft sessions |
| **League (teams, matches, stats, sync)** | `/admin/league` | Teams tab, Matches tab, Statistics, Sync logs |

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
- Google Sheets sync: configure in Admin → Google Sheets (or `google_sheets_config` + `sheet_mappings`) if using Option A data pipeline.
