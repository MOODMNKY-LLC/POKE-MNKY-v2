# Discord Integration Guide — POKE MNKY

> **Purpose:** This guide explains how the POKE MNKY app and Discord server work together: webhooks, bot commands, channel mapping, and integration status. It is the single reference for commissioners, admins, and developers.

---

## 1. Overview

The **Average At Best Draft League** runs primarily on Discord for communication. The POKE MNKY app and Discord bot integrate so that:

- **Webhooks** post trade lifecycles, match results, draft board sync status, and transaction execution summaries to specific channels.
- **Bot slash commands** let coaches submit draft picks, free agency moves, search the draft pool, run damage calcs, and check status from Discord.
- **Role sync** keeps Discord roles aligned with app roles (coach, commissioner, etc.).

**Canonical docs:** [DISCORD-SERVER-INTEGRATION-REPORT.md](./DISCORD-SERVER-INTEGRATION-REPORT.md) (full report), [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md) (channel list and IDs). Refresh the server map with `pnpm discord:refresh-map`.

---

## 2. Server at a Glance

| Metric | Value |
|--------|--------|
| **Server name** | Average At Best Draft League |
| **Guild ID** | `1190512330556063764` |
| **Members** | 25 |
| **Text channels** | 34 |
| **Voice channels** | 4 |
| **Categories** | 11 |

**Formats:** AAB Singles (primary), AAB Doubles (secondary), Average At Best Battle League (app/bot integration). Season review archives (Seasons 1–5) exist as separate categories.

---

## 3. What Is Working (Verified)

These integrations are implemented and in use.

### 3.1 Trade lifecycle notifications

All trade events post to the **`trades`** webhook (configure in Admin → Discord):

- **New offer** — `notifyLeagueTradeOffer` when a coach submits a league trade offer.
- **Rejected** — `notifyLeagueTradeRejected` when the receiving coach rejects.
- **Accepted** — `notifyLeagueTradeAccepted` when the receiving coach accepts (pending commissioner approval).
- **Approved** — `notifyLeagueTradeApproved` when the commissioner approves (trade will execute at midnight Monday EST).
- **Denied** — `notifyLeagueTradeDenied` when the commissioner denies.

**Target channel:** #trades-and-transactions (AAB Singles), ID `1190520119949021244`. Ensure the `trades` webhook URL in the admin UI points to this channel.

### 3.2 Tera assignment window (48h)

When a trade is **approved**, the app:

1. Creates `tera_assignment_windows` entries (48-hour expiration) for both teams.
2. Calls **`notifyTeraWindowOpened`** — posts to the `trades` webhook with coach Discord mentions when available, instructing them to assign Tera types in the dashboard within 48 hours.

Coaches complete Tera assignment in the app (**Dashboard → Tera assignment modal**). Promoting a Pokémon to Tera Captain after the window costs 3 transaction points.

### 3.3 Midnight Monday transaction execution

- Pending trades and free agency moves are enqueued with `execute_at` = next Monday 00:00 EST.
- The cron job at **`/api/cron/execute-transactions`** (protected by `CRON_SECRET`) runs and processes them.
- After execution, **`notifyTransactionsProcessed`** posts a summary to the `trades` webhook (counts of trades executed, FA moves executed, and any failures).

### 3.4 Draft board (Notion → Supabase) sync notifications

When the Notion Draft Board sync runs (manual or scheduled):

- **Success:** **`notifyDraftBoardSync`** posts to the `draft_board_sync` webhook with sync stats (synced count, failed count).
- **Error:** **`notifyDraftBoardError`** posts to the `draft_board_errors` webhook with error details.

Configure `draft_board_sync` and `draft_board_errors` in Admin → Discord (e.g. to #announcements in the Battle League category).

### 3.5 Role sync (App ↔ Discord)

- **`lib/discord-role-sync.ts`** syncs user roles from the app to Discord.
- API routes: `sync-user-role`, `sync-roles` (see project API docs).

### 3.6 Bot slash commands

Implemented in **`lib/discord-commands/`** and backed by app APIs (using `DISCORD_BOT_API_KEY`):

| Command | Purpose | API |
|---------|---------|-----|
| `/pick` | Submit draft pick (with autocomplete) | `POST /api/discord/draft/pick` |
| `/search` | Search draft pool | `GET /api/discord/pokemon/search` |
| `/calc` | Damage calculator | `POST /api/calc` |
| `/free-agency-submit` | Submit FA transaction | `POST /api/free-agency/submit` |
| `/free-agency-status` | Team FA status | `GET /api/free-agency/team-status` |
| `/draftstatus` | Draft session status | `GET /api/discord/draft/status` |
| `/whoami` | Coach identity | `GET /api/discord/coach/whoami` |
| `/setseason` | Set guild default season (admin) | `POST /api/discord/guild/config` |
| `/getseason` | Show guild default season | `GET /api/discord/guild/config` |
| `/coverage` | Roster coverage analysis | `POST /api/discord/notify/coverage` |

Bot registration and runtime are typically handled by an external integration worker or startup script; command logic lives in the repo.

### 3.7 Admin Discord webhooks UI

- **Path:** `/admin/discord` (or equivalent under Admin).
- **Features:** List, create, delete, enable/disable, and test webhooks stored in the `discord_webhooks` table.
- Commissioners can point each webhook name to the correct Discord channel URL without editing code.

---

## 4. Partially Implemented or Not Wired

### 4.1 Match result notification

- **`notifyMatchResult(matchId)`** exists in `lib/discord-notifications.ts` and posts to the `match_results` webhook.
- It may be invoked from an **external integration worker** (e.g. after a battle is recorded). The main Next.js app may not call it on match submission; confirm your match flow and wire it if needed.

### 4.2 Draft board sync — webhook names

- Sync success/error notifications use webhook **names** `draft_board_sync` and `draft_board_errors`. Create these in the admin UI and set their URLs to the desired channels (e.g. #announcements in the Battle League category).

---

## 5. Gaps (Not Yet Built)

| Gap | Recommendation |
|-----|----------------|
| **Tera window reminders** | No 24h or 6h reminder before the 48h window closes. Optional: scheduled job to post/DM reminders. |
| **`/tera-status` slash command** | Optional: command for a coach to check remaining time on their active Tera window. |
| **Transaction cap warning** | Optional: DM or channel mention when a coach has 2 or fewer transactions remaining. |
| **Webhook → channel docs in Admin UI** | Inline help in the Discord webhooks tab (e.g. “Use channel ID 1190520119949021244 for #trades-and-transactions”) would help commissioners; currently documented only in this guide and DISCORD-SERVER-MAP. |

---

## 6. Webhook Configuration (Recommended)

Configure these in **Admin → Discord** (webhook **name** must match exactly):

| Webhook name | Recommended channel | Channel ID |
|--------------|---------------------|------------|
| `trades` | #trades-and-transactions (AAB Singles) | `1190520119949021244` |
| `match_results` | #battle (AAB Singles) or #announcements | `1196192255829086298` or `1408801974605975553` |
| `weekly_recap` | #announcements (AAB Singles) | `1408801974605975553` |
| `draft_board_sync` | #announcements (AAB Battle League) | `1461567986329714791` |
| `draft_board_errors` | #announcements (AAB Battle League) | `1461567986329714791` |
| `video_tag` | #video-content (AAB Singles) | `1357802168031117586` |

**How to get a webhook URL:** In Discord, open the channel → Channel settings → Integrations → Webhooks → Create (or use existing). Copy the webhook URL and paste it in the admin UI for the matching webhook name.

---

## 7. App → Discord Data Flow (Summary)

1. **Trade offer API** → `trades` webhook (offer, rejected, accepted, approved, denied; Tera window opened; transactions processed).
2. **Free agency API** → Used by bot commands; transaction execution summary via `notifyTransactionsProcessed` → `trades`.
3. **Notion sync** → `draft_board_sync` / `draft_board_errors` when scope includes draft board.
4. **Role sync** → Discord roles updated from app roles.
5. **Match result** → `match_results` (when wired from your match flow).
6. **Bot** → Slash commands call app APIs; no webhooks from the bot itself for league data.

---

## 8. Critical Channels (Quick Reference)

| Channel | ID | Use |
|---------|-----|-----|
| #trades-and-transactions (Singles) | `1190520119949021244` | Primary target for `trades` webhook |
| #bot-command-testing (Battle League) | `1461568485716004894` | Bot slash command output |
| #battle (Singles) | `1196192255829086298` | Match results (candidate for `match_results`) |
| #announcements (Singles) | `1408801974605975553` | Rule changes, recap, match results (candidates) |
| #announcements (Battle League) | `1461567986329714791` | Draft board sync/errors |

---

## 9. Refreshing the Server Map

When the Discord server layout changes (new channels, renames, categories):

1. Run: `pnpm discord:refresh-map` (or `pnpm exec tsx scripts/fetch-discord-server-map.ts [guildId]`).
2. Default guild ID: `1190512330556063764`.
3. The script updates `docs/DISCORD-SERVER-MAP.json` and `docs/DISCORD-SERVER-MAP-RAW.md`. Update `docs/DISCORD-SERVER-MAP.md` and this guide if you change channel purposes or IDs.

---

## 10. References (In-App and Repo)

- **Settings → Guides** — Dashboard guide and full References list (League Features v3, Discord Integration Guide, etc.).
- **League Features Guide (v3)** — Trade Block, Trade Offers, Free Agency, Tera Captains, midnight execution, weekly roster (in-app guide).
- **Repo docs:** `docs/DISCORD-SERVER-INTEGRATION-REPORT.md`, `docs/DISCORD-SERVER-MAP.md`, `docs/DISCORD-SERVER-MAP-RAW.md`, `docs/LEAGUE-FEATURES-GUIDE-V3.md`, `CHATGPT-V3-UPDATE.md`.
- **Code:** `lib/discord-notifications.ts` (webhook helpers), `lib/discord-commands/` (slash command handlers), `lib/discord-role-sync.ts` (role sync).
- **Activating slash commands:** [DISCORD-SLASH-COMMANDS-ACTIVATION.md](./DISCORD-SLASH-COMMANDS-ACTIVATION.md) — register commands from your machine or via SSH to the bot server.
- **Single source of truth & how commands are put together:** [DISCORD-COMMANDS-SINGLE-SOURCE-OF-TRUTH.md](./DISCORD-COMMANDS-SINGLE-SOURCE-OF-TRUTH.md) — app vs server bot, registration, and keeping the how-to guide in sync.
