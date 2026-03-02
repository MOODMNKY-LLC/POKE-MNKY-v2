# Discord Commands: Single Source of Truth & How They’re Put Together

This doc explains where Discord slash commands live, how they get registered, and how the how-to guide stays in sync.

---

## 1. Where commands are defined

### App repo (this repo — POKE MNKY-v2)

- **Path:** `lib/discord-commands/`
- **Commands:** `/pick`, `/search`, `/calc`, `/free-agency-submit`, `/free-agency-status`, `/draftstatus`, `/whoami`, `/setseason`, `/getseason`, `/coverage`
- **Registration:** Run from this repo with:
  ```bash
  pnpm discord:register-commands
  ```
  That script uses `getAllCommands()` from `lib/discord-commands/index.ts`, builds the payload from each command’s `.data.toJSON()`, and calls Discord’s REST API to register **guild** commands for `DISCORD_GUILD_ID`.

- **How-to content:** The embed text for the “how to use” guide is built in **`lib/discord/slash-commands-guide-embed.ts`** (title, description, fields for each command). Scripts that post the guide use that module so the guide is a single source of truth.

### Server bot (tools/discord-bot on 10.3.0.119)

- **Path on server:** `/home/moodmnky/POKE-MNKY/tools/discord-bot/index.ts`
- **Commands:** A separate, legacy set is defined **in that file** (e.g. `/matchups`, `/submit`, `/standings`, `/recap`, `/pokemon`, `/draft`, `/draft-status`, `/draft-available`, `/draft-my-team`, `/battle`, `/validate-team`, `/showdown-link`, `/api-docs`, `/free-agency-submit`, `/free-agency-status`, `/free-agency-available`).
- **Registration:** The server bot calls its own `registerDiscordCommands()` on startup and registers **that** list for the same (or multiple) guild IDs.
- **Important:** Whichever registration runs **last** for a given guild wins. So if the app repo runs `pnpm discord:register-commands`, Discord will show the app’s 10 commands for that guild. If the server bot then starts and registers its commands for the same guild, Discord will show the server’s set instead (and the app’s 10 may disappear until you run the app registration again).

---

## 2. How to “put them all together”

### Option A: One set of commands (recommended)

- **Single source of truth:** Use only the **app repo** commands (`lib/discord-commands`).
- **Steps:**
  1. Register from the app repo: `pnpm discord:register-commands` (with `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` in `.env.local` or `.env`).
  2. Run the **bot process** that handles interactions (e.g. the server bot) but have it **use the same command definitions** from this repo (e.g. import `getAllCommands` and handle by `commandName`), or run a separate bot that only handles the app’s 10 commands.
  3. Keep the how-to guide in sync by editing only **`lib/discord/slash-commands-guide-embed.ts`** and re-posting the embed when needed (`pnpm discord:post-guide-embed [channelId]`).

Result: One list of commands, one registration, one guide.

### Option B: Two sets (app + legacy)

- **App commands:** Registered from this repo; handlers in `lib/discord-commands/` (and the Next.js app APIs they call).
- **Legacy commands:** Defined and registered by the server bot in `tools/discord-bot`; handlers in that same file.
- **Caveat:** Discord allows only **one** application command list per application per guild. So you cannot have both sets visible at once unless:
  - You merge them into one registration (e.g. register both the app’s 10 and the server’s legacy list from one place), or
  - You use two different Discord **applications** (two bots) — one for app commands, one for legacy.

- **How-to:** The guide in `lib/discord/slash-commands-guide-embed.ts` already includes both “App commands” and “Legacy / server bot commands” so one embed documents everything. Post it with `pnpm discord:post-guide-embed` or `pnpm discord:post-guide-webhook`.

---

## 3. Summary table

| What | Where | How to register | How-to guide |
|------|--------|------------------|--------------|
| App commands (10) | `lib/discord-commands/` in this repo | `pnpm discord:register-commands` | `lib/discord/slash-commands-guide-embed.ts` |
| Legacy commands (14) | `tools/discord-bot/index.ts` on server | Server bot’s `registerDiscordCommands()` on startup | Same embed (section “Legacy / server bot”) |
| Post guide to channel | — | `pnpm discord:post-guide-embed [channelId]` | Uses slash-commands-guide-embed |
| Post guide via webhook | — | `pnpm discord:post-guide-webhook <url>` | Same content in script |

---

## 4. Keeping the how-to up to date

1. **Add or change an app command:**  
   - Add (or edit) the command in `lib/discord-commands/` and `index.ts`.  
   - Update **`lib/discord/slash-commands-guide-embed.ts`** (e.g. add a new entry to `APP_COMMANDS` or edit the text).  
   - Re-register: `pnpm discord:register-commands`.  
   - Re-post the guide: `pnpm discord:post-guide-embed 1477875822642860204` (or your how-to channel ID).

2. **Add or change a legacy command:**  
   - Edit `tools/discord-bot/index.ts` on the server.  
   - Update **`lib/discord/slash-commands-guide-embed.ts`** (e.g. the `LEGACY_FIELDS` section).  
   - Restart the server bot so it re-registers.  
   - Re-post the guide from this repo.

3. **Single place for “what’s in the guide”:**  
   **`lib/discord/slash-commands-guide-embed.ts`** is the single source of truth for the how-to content. The webhook script (`scripts/post-slash-commands-guide-webhook.ts`) mirrors that content for webhook posts; keep it in sync when you change the embed.
