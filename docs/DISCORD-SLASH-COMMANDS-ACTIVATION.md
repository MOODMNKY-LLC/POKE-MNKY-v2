# Activating Discord Slash Commands

This guide explains how to make POKE MNKY slash commands active in your Discord server. **Slash commands must be registered with Discord’s API** (one-time or after any command change), and Discord sends interactions to the Next.js `/api/discord/interactions` route.

---

## Prerequisites

- **DISCORD_BOT_TOKEN** — Bot token from [Discord Developer Portal](https://discord.com/developers/applications) → Your App → Bot → Token
- **DISCORD_CLIENT_ID** — Application ID (same app → OAuth2 → Client ID)
- **DISCORD_GUILD_ID** — Server (guild) ID where commands should appear (e.g. `1190512330556063764` for Average At Best Draft League)

These can live in `.env.local` or `.env` in the project root.

---

## Option A: Register from your machine (recommended first step)

1. **From the repo root** (with `.env.local` or `.env` containing the three variables above):

   ```bash
   pnpm discord:register-commands
   ```

2. **Optional:** Register for a different guild without changing env:

   ```bash
   pnpm exec tsx scripts/register-discord-commands.ts YOUR_GUILD_ID
   ```

3. **Confirm in Discord:** Open your server → type `/` in a channel. You should see the POKE MNKY bot’s commands (e.g. `/pick`, `/search`, `/calc`, `/free-agency-submit`, `/free-agency-status`, `/draftstatus`, `/whoami`, `/setseason`, `/getseason`, `/coverage`).

---

## Option B: Register from the server (where the bot runs)

The Discord bot is hosted on **`moodmnky@10.3.0.119`**. If you prefer to run registration there (e.g. same env as the bot):

### 1. SSH into the server

From WSL or a terminal with SSH:

```bash
ssh moodmnky@10.3.0.119
```

(Use your actual password or SSH key.)

### 2. Go to the project directory

```bash
cd /home/moodmnky/POKE-MNKY
```

If the repo is named differently on the server, use that path (e.g. `POKE-MNKY-v2`).

### 3. Ensure env is loaded

The server should already have `.env` (or equivalent) with `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, and `DISCORD_GUILD_ID`. If not, create or edit `.env` in the project root with those values.

### 4. Run the registration script

If the project has the script and dependencies:

```bash
pnpm discord:register-commands
# or
pnpm exec tsx scripts/register-discord-commands.ts
```

If you use Node directly:

```bash
npx tsx scripts/register-discord-commands.ts
```

### 5. Restart auxiliary services only if you still use them

Slash command replies do **not** depend on a long-running bot process in this repo anymore. If you run an auxiliary bot or worker for role sync or posting, restart that service so it picks up env/code changes:

- **If using Docker Compose** (e.g. a `discord-bot` or `integration-worker` service that runs the bot):

  ```bash
  cd /home/moodmnky/POKE-MNKY
  docker compose restart discord-bot
  # or whatever the service name is, e.g. integration-worker
  ```

- **If using PM2 or a systemd service:** restart that service instead.

Registration only needs to be run once per guild (or after adding/editing commands). The Next.js app handles `interactionCreate` responses directly; registration does not require a separate always-on command handler.

---

## Commands registered

| Command | Description |
|--------|-------------|
| `/pick` | Submit draft pick (with autocomplete) |
| `/search` | Search draft pool |
| `/calc` | Damage calculator |
| `/free-agency-submit` | Submit FA transaction |
| `/free-agency-status` | Team FA status |
| `/draftstatus` | Draft session status |
| `/whoami` | Coach identity |
| `/setseason` | Set guild default season (admin) |
| `/getseason` | Show guild default season |
| `/coverage` | Roster coverage analysis |

Handlers live in `lib/discord-commands/`. See [DISCORD-COMMANDS-REGISTRATION.md](./DISCORD-COMMANDS-REGISTRATION.md) for API wiring and [DISCORD-INTEGRATION-GUIDE.md](./DISCORD-INTEGRATION-GUIDE.md) for full integration details.

---

## Troubleshooting

- **“DISCORD_BOT_TOKEN is not set”**  
  Load env from the project root: use `.env.local` or `.env` and run the script from the repo root, or use `pnpm exec dotenv -e .env.local -- tsx scripts/register-discord-commands.ts`.

- **“Missing Access” or 403 from Discord API**  
  In the Developer Portal, ensure the bot has **applications.commands** scope and is invited to the server with that scope. Re-invite the bot if needed.

- **Commands don’t appear in Discord**  
  Wait a minute and try again; Discord can cache the command list. Ensure `DISCORD_GUILD_ID` is the correct server ID (Developer Mode → right‑click server → Copy Server ID).

- **Bot doesn’t respond to /commands**  
  Registration only makes commands visible. The Next.js app must be reachable at `/api/discord/interactions`, and `DISCORD_PUBLIC_KEY` / `DISCORD_BOT_API_KEY` must be set.

---

## References

- [DISCORD-COMMANDS-REGISTRATION.md](./DISCORD-COMMANDS-REGISTRATION.md) — Registration code and interaction handling
- [DISCORD-INTEGRATION-GUIDE.md](./DISCORD-INTEGRATION-GUIDE.md) — Webhooks, bot commands, channel mapping
- [README-DISCORD-BOT.md](../README-DISCORD-BOT.md) — External bot location and quick reference
- [scripts/integration-worker/DEPLOYMENT-SERVER.md](../scripts/integration-worker/DEPLOYMENT-SERVER.md) — SSH and server deployment (integration worker)
