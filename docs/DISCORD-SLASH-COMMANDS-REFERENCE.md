# Discord Slash Commands Reference

## Overview

POKE MNKY registers 10 slash commands with Discord. Each command is handled by the interactions handler (Next.js API or Supabase Edge Function) and calls the corresponding app API.

## Command Inventory

| # | Command | Description | API | Status |
|---|---------|-------------|-----|--------|
| 1 | `/pick` | Make a draft pick | POST /api/discord/draft/pick | Working |
| 2 | `/search` | Search Pokémon in draft pool | GET /api/discord/pokemon/search | Working |
| 3 | `/draftstatus` | View draft status | In-process (getDraftStatusData) | Working |
| 4 | `/whoami` | View your identity/role | In-process (getWhoamiData) | Working |
| 5 | `/setseason` | Set active season for guild | POST /api/discord/guild/config | Working |
| 6 | `/getseason` | Get active season | GET /api/discord/guild/config | Working |
| 7 | `/coverage` | Check type coverage, notify | GET /api/draft/status + POST /api/discord/notify/coverage | Working |
| 8 | `/calc` | Damage calculator | POST /api/calc | Working |
| 9 | `/free-agency-submit` | Submit FA add/drop | POST /api/discord/free-agency/submit | Working |
| 10 | `/free-agency-status` | View FA team status | GET /api/discord/free-agency/team-status | Working |

## Command Details

### `/pick`

- **Options**: `pokemon` (required), `session_id` (optional)
- **API**: `POST /api/discord/draft/pick`
- **Auth**: Discord user must be linked to a coach/team for the active draft session

### `/search`

- **Options**: `query` (required)
- **API**: `GET /api/discord/pokemon/search?q=...`
- **Returns**: Matching Pokémon from draft pool

### `/draftstatus`

- **Options**: None
- **Behavior**: Fetches draft session, turn order, and pool status in-process

### `/whoami`

- **Options**: None
- **Behavior**: Resolves Discord user to coach/team in-process

### `/setseason`

- **Options**: `season_id` (required)
- **API**: `POST /api/discord/guild/config`
- **Auth**: Admin/commissioner only

### `/getseason`

- **Options**: None
- **API**: `GET /api/discord/guild/config`
- **Returns**: Active season for guild

### `/coverage`

- **Options**: None
- **API**: `GET /api/draft/status`, `POST /api/discord/notify/coverage`
- **Behavior**: Computes type coverage and optionally notifies channel

### `/calc`

- **Options**: `attacker`, `defender`, `move`, `terrain` (optional), `weather` (optional)
- **API**: `POST /api/calc`
- **Behavior**: Damage calculation for Pokémon Showdown-style battles

### `/free-agency-submit`

- **Options**: `add` (Pokémon name), `drop` (Pokémon name)
- **API**: `POST /api/discord/free-agency/submit`
- **Auth**: Discord user must be linked to a coach with a team in the current season

### `/free-agency-status`

- **Options**: None
- **API**: `GET /api/discord/free-agency/team-status`
- **Auth**: Resolves team from coach/Discord user
- **Returns**: FA submissions, roster, and status for the coach's team

## Registration and Activation

### Option A: App Commands (Global/Guild)

Commands are registered via Discord API when the app starts or via a registration script. The project uses app commands (slash commands) registered per guild or globally.

### Option B: Legacy Server Bot

The legacy server bot may have additional commands. See `docs/DISCORD-SERVER-MAP.md` for channel and command mapping.

## E2E Testing

### Manual Verification

1. Ensure `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID` are set
2. Invite the bot to a test guild
3. Run `/sync` or re-register commands if needed
4. Test each command in Discord

### Script-Based Testing

Run `scripts/test-discord-commands-e2e.ts` to exercise each command's API directly:

```bash
npx tsx scripts/test-discord-commands-e2e.ts
```

The script simulates the Discord → app flow by calling APIs with `X-Discord-Bot-Key` (when applicable) and verifies response shape. It does not require a live Discord connection.

**Required env**: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `NEXT_PUBLIC_APP_URL` (or `http://localhost:3000` for local)

## Troubleshooting

### Command not found

- Commands must be registered with Discord. Run the registration script or ensure the app has registered commands for the guild.
- Check `DISCORD_APPLICATION_ID` and `DISCORD_BOT_TOKEN`.

### Timeout

- API routes may be slow. Ensure Supabase and external services (e.g., calc API) respond within Discord's 3-second limit.
- Consider deferring with `type: 5` (deferred) and editing the response.

### Unauthorized / Forbidden

- `/setseason` requires admin/commissioner role.
- `/pick`, `/free-agency-submit`, `/free-agency-status` require the user to be linked to a coach/team.

### Autocomplete not working

- `/calc` move option and `/free-agency-submit` Pokémon options support autocomplete. Ensure the handler returns `type: 8` (APPLICATION_COMMAND_AUTOCOMPLETE_RESPONSE) with `choices`.

## References

- [Discord Integration Guide](/dashboard/guides/discord-integration)
- [League Simulation Guide](/dashboard/guides/league-simulation)
- [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md)
