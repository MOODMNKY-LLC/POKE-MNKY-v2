# Discord Bot ↔ API Wiring

All slash commands call the Next.js app API with **bot authentication** via `Authorization: Bearer DISCORD_BOT_API_KEY`. The app validates this header (e.g. in `/api/discord/draft/pick`, `/api/discord/coach/whoami`) and uses it to allow the Discord bot to perform actions on behalf of users.

## Command → API mapping

| Command        | API route                          | Method | Auth        | Notes                                      |
|----------------|-------------------------------------|--------|-------------|--------------------------------------------|
| `/pick`        | `/api/discord/draft/pick`           | POST   | Bot key     | Autocomplete: `/api/discord/pokemon/search` (GET, bot key) |
| `/search`      | `/api/discord/pokemon/search`      | GET    | Bot key     | Autocomplete and execute                   |
| `/draftstatus` | `/api/discord/draft/status`         | GET    | Bot key     | Season + coach + team budget               |
| `/whoami`      | `/api/discord/coach/whoami`         | GET    | Bot key     | Coach profile, teams, season team          |
| `/setseason`   | `/api/discord/guild/config`         | POST   | Bot key     | Admin-only; sets guild default season      |
| `/getseason`   | `/api/discord/guild/config`         | GET    | Bot key     | Guild default season                       |
| `/coverage`    | `/api/discord/draft/status` + `/api/discord/notify/coverage` | GET + POST | Bot key | Status for team, then notify/coverage       |
| `/calc`        | (damage calc service or app route) | —      | —           | See calc-command.ts                        |
| `/free-agency-submit` | (free agency API)            | POST   | Bot key or user | See free-agency-submit.ts              |
| `/free-agency-status` | (free agency status API)      | GET    | Bot key     | See free-agency-status.ts                   |

## Client helper

- **`lib/discord/api-client.ts`**: `appGet<T>(path)`, `appPost<T>(path, body)`, `getGuildDefaultSeasonId(guildId)`.
- All use `NEXT_PUBLIC_APP_URL` (or `APP_BASE_URL`) and `DISCORD_BOT_API_KEY`.
- GET/POST send `Authorization: Bearer DISCORD_BOT_API_KEY` and `Content-Type: application/json` (POST).

## Guild default season

- Commands that need a season resolve it in order: option `season_id` → guild default from `/api/discord/guild/config?guild_id=...`.
- `getGuildDefaultSeasonId(guildId)` caches the result for 30s.

## Verification checklist

- [ ] `DISCORD_BOT_API_KEY` set in the environment where the Discord bot runs (e.g. server Docker env).
- [ ] App API routes that serve the bot validate the bot key (e.g. `validateBotKeyPresent(request)` or equivalent).
- [ ] Each command uses `appGet`/`appPost` or raw `fetch` with `Authorization: Bearer DISCORD_BOT_API_KEY`.
- [ ] Guild default season is set via `/setseason` (admin) so coaches can omit `season_id`.
