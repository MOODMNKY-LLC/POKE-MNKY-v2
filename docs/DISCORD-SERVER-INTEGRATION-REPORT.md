# Discord Server Comprehensive Integration Report

> **Date:** 2026-03-02  
> **Guild:** Average At Best Draft League (`1190512330556063764`)  
> **Canonical map:** [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md) · **Raw export:** [DISCORD-SERVER-MAP-RAW.md](./DISCORD-SERVER-MAP-RAW.md) · **JSON:** [DISCORD-SERVER-MAP.json](./DISCORD-SERVER-MAP.json)

---

## Executive Summary

This report documents the full Discord server structure for the Average At Best Draft League, assigns league functions to each channel, maps app integration points (webhooks, bot commands), and identifies gaps from CHATGPT-V3 requirements. The league runs primarily on Discord for communication; the POKE MNKY app and bot must integrate seamlessly. Channel export is produced by `pnpm discord:refresh-map` (script: `scripts/fetch-discord-server-map.ts`).

---

## 1. Server Architecture

### 1.1 High-Level Stats

| Metric | Value |
|--------|-------|
| Members | 25 |
| Text channels | 34 |
| Voice channels | 4 |
| Categories | 11 |
| Total channels | 49 |

### 1.2 Format Split

The server hosts two league formats:

- **AAB Singles** — Primary format; most active channels (announcements, battle, trades-and-transactions, etc.).
- **AAB Doubles** — Secondary format; parallel structure (announcements, battle, trades, etc.).
- **Average At Best Battle League** — Newer category for app/bot integration (bot-command-testing, announcements).

Season review archives (Seasons 1–5) exist as separate categories.

### 1.3 Comprehensive Server Breakdown (Channel Tree)

Full category/channel list with IDs. See [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md) and [DISCORD-SERVER-MAP-RAW.md](./DISCORD-SERVER-MAP-RAW.md) for the canonical map and raw export.

| Category | Channel | ID | Type | League function |
|----------|---------|-----|------|-----------------|
| *(uncategorized)* | #welcome | `1190512331009032302` | text | Onboarding, rules intro |
| *(uncategorized)* | #league-changes | `1190531695867330621` | text | League structure, commissioner notes |
| *(uncategorized)* | Mods | `1322331029146566656` | voice | Mod/admin voice |
| **AAB Singles** `1408801550175830016` | #announcements | `1408801974605975553` | text | Rule changes, voting, draft dates |
| | #battle | `1196192255829086298` | text | Battle setup, codes, results |
| | #general-chat | `1191355707296055306` | text | General discussion |
| | #logos | `1279902507346427935` | text | Team logos |
| | #questions | `1190514178381844560` | text | Rules Q&A |
| | #rules | `1190513002127048775` | text | Rules reference |
| | #suggestions | `1190521133032808549` | text | Feature/rule suggestions |
| | **#trades-and-transactions** | **`1190520119949021244`** | text | **FA, trade block, Tera — primary webhook** |
| | #video-content | `1357802168031117586` | text | Replays, content |
| | #voting | `1190513871098744872` | text | Polls, votes |
| **Pokemon Extras** `1190513054593601658` | #memes, #pogo, #pokémon-tcg, #game-spoilers | (see map) | text | Off-topic / side games |
| **Voice Channels** `1190512330556063767` | General, Battle 1, Battle 2 | (see map) | voice | Voice chat |
| **Draft League Docs** `1190533648391352440` | #docs | `1190533743505575996` | text | Documentation links |
| **Season 1–5 Review** | #season-N-review (each) | (see map) | text | Archives |
| **AAB Doubles** `1429247813417566228` | announcements, battle, general-chat, polls-and-voting, questions, rules, suggestions, team-names-and-logos, trades-and-transactions, video-content | (see map) | text | Doubles parallel |
| **Average At Best Battle League** `1461567928804708574` | **#bot-command-testing** | **`1461568485716004894`** | text | **Bot slash commands** |
| | #announcements | `1461567986329714791` | text | App sync, draft board |

---

## 2. Channel ↔ App Integration Table

| Channel | ID | League function | Webhook / API / Command |
|---------|-----|-----------------|-------------------------|
| #trades-and-transactions (Singles) | `1190520119949021244` | FA drops/adds, trade block, Tera declarations | `discord_webhooks.name = 'trades'` |
| #bot-command-testing | `1461568485716004894` | Bot commands | `/pick`, `/search`, `/calc`, `/free-agency-submit`, `/free-agency-status`, `/draftstatus`, `/whoami`, `/setseason`, `/getseason`, `/coverage` |
| #battle (Singles) | `1196192255829086298` | Battle setup, match results | `match_results` (candidate) |
| #announcements (Singles) | `1408801974605975553` | Major events, rule changes | `weekly_recap`, `match_results` (candidates) |
| #announcements (Battle League) | `1461567986329714791` | App sync, draft board | `draft_board_sync`, `draft_board_errors` (candidates) |
| #video-content (Singles) | `1357802168031117586` | Replays, tagged content | `video_tag` (candidate) |
| DM (coach) | — | Tera window, trade notifications | Tera 48h window (to implement) |

---

## 3. App → Discord Data Flow

```mermaid
flowchart LR
  subgraph app [App / API]
    TradeAPI[Trade offer API]
    FAAPI[Free agency API]
    Sync[Notion sync]
    RoleSync[Role sync]
    VideoTag[Video tag API]
  end
  subgraph webhooks [Discord Webhooks]
    W_trades[trades]
    W_match[match_results]
    W_draft[draft_board_sync]
    W_video[video_tag]
  end
  subgraph bot [Discord Bot]
    Slash[/pick /search /calc etc]
  end
  TradeAPI --> W_trades
  Sync --> W_draft
  VideoTag --> W_video
  Slash --> FAAPI
  Slash --> TradeAPI
  RoleSync --> DiscordRoles[Discord roles]
```

---

## 4. CHATGPT-V3 Alignment and Gaps

### 4.1 Implemented

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Trade block & offer notifications | Done | `lib/discord-notifications.ts` — notifyLeagueTradeOffer, Rejected, Accepted, Approved, Denied via `trades` webhook |
| League runs on Discord | Done | Primary comms; webhooks and bot commands |
| Free agency bot commands | Done | `/free-agency-submit`, `/free-agency-status` |
| Draft pick via Discord | Done | `/pick` with autocomplete |
| Role sync (App ↔ Discord) | Done | `lib/discord-role-sync.ts` |

### 4.2 Gaps (To Implement)

| Requirement | Gap | Recommendation |
|-------------|-----|-----------------|
| **Tera assignment window (48h)** | Initial notification on trade approval implemented (`notifyTeraWindowOpened`). No 48h/24h/6h reminder flow; no `/tera-status` | Add scheduled reminders at 24h and 6h before Tera window closes. Optional `/tera-status` slash command. |
| **FA/transaction processed** | Implemented: `notifyTransactionsProcessed` posts to `trades` webhook after midnight Monday execution | — |
| **Transaction cap warning** | No alert when coach has 2 or fewer transactions left | Optional: DM or channel mention when cap is low. |
| **Webhook channel targeting** | Webhooks use `discord_webhooks` table; admin must configure correct channel per webhook | Ensure `trades` webhook URL points to #trades-and-transactions (`1190520119949021244`). Document in admin UI. |

---

## 5. Bot Commands Summary

| Command | Purpose | API |
|---------|---------|-----|
| `/pick` | Submit draft pick | `POST /api/discord/draft/pick` |
| `/search` | Search draft pool | `GET /api/discord/pokemon/search` |
| `/calc` | Damage calculator | `POST /api/calc` |
| `/free-agency-submit` | Submit FA transaction | `POST /api/free-agency/submit` |
| `/free-agency-status` | Team FA status | `GET /api/free-agency/team-status` |
| `/draftstatus` | Draft session status | `GET /api/discord/draft/status` |
| `/whoami` | Coach identity | `GET /api/discord/coach/whoami` |
| `/setseason` | Set guild default season (admin) | `POST /api/discord/guild/config` |
| `/getseason` | Show guild default season | `GET /api/discord/guild/config` |
| `/coverage` | Roster coverage analysis | `POST /api/discord/notify/coverage` |

---

## 6. Recommended Webhook Configuration

Configure these in the admin Discord Webhooks tab (`/admin/discord` or equivalent):

| Webhook name | Channel | Purpose |
|--------------|---------|---------|
| `trades` | #trades-and-transactions (AAB Singles) | Trade lifecycle, FA announcements |
| `match_results` | #battle (AAB Singles) | Match result embeds |
| `weekly_recap` | #announcements (AAB Singles) | Weekly recap |
| `draft_board_sync` | #announcements (AAB Battle League) | Notion sync success |
| `draft_board_errors` | #announcements (AAB Battle League) | Notion sync errors |
| `video_tag` | #video-content (AAB Singles) | Video tag mentions |

---

## 7. Channel Purpose (From Message Sampling)

**#trades-and-transactions:** Coaches post FA drops/adds ("dropping X, picking up Y"), Tera captain declarations, trade discussions. Commissioner (jackij03) validates Tera budgets. **Primary target for `trades` webhook.**

**#battle:** Coaches coordinate weekly battles, post "Searching GLHF", battle codes, match results ("Team A beat Team B 4-0"), GG posts. **Candidate for `match_results` webhook.**

**#bot-command-testing:** POKE MNKY bot responses, Battle Bot webhook embeds. Used for testing slash commands. **Bot command output channel.**

---

## 8. Implementation Checklist (v3)

- [ ] Implement Tera window Discord notification (DM or channel) on trade approval
- [ ] Add 48h, 24h, 6h reminder flow for Tera window
- [ ] Add optional `/tera-status` slash command
- [ ] Add `free_agency_processed` webhook and midnight job notification
- [ ] Document webhook → channel mapping in admin UI
- [ ] Verify `trades` webhook URL targets #trades-and-transactions
- [x] Add `discord:refresh-map` npm script for convenience (`pnpm discord:refresh-map`)

---

## 9. CHATGPT-V3 → Discord Integration Points (Cross-Reference)

From [CHATGPT-V3-UPDATE.md](../CHATGPT-V3-UPDATE.md), these product requirements map to Discord as follows:

| CHATGPT-V3 requirement | Discord target | Status |
|------------------------|----------------|--------|
| Trade block + offer notifications (offer made, rejected, accepted, commissioner approval) | #trades-and-transactions webhook `trades` | Implemented |
| All transactions at 12:00 AM Monday EST | Cron executes; post summary to `trades` webhook | Implemented (`notifyTransactionsProcessed`) |
| Tera Captain highlight in trades (gold/reverse) | In-app UI; Discord message can mention “Tera Captain” in body | In app |
| Notify coach when offer made / rejected / accepted | `trades` webhook + coach mention or DM | Implemented |
| 48-hour Tera assignment window after trade approval | DM receiving coach or #trades-and-transactions + mention | Implemented (`notifyTeraWindowOpened`); reminders (24h, 6h) optional |
| Free agency first-come-first-serve, documented by timestamp | App + `pending_transactions`; Discord for announcements | Implemented |
| Draft pick via bot | #bot-command-testing → `/pick`, `/search`, `/calc`, etc. | Implemented |
| FA submit/status via bot | `/free-agency-submit`, `/free-agency-status` | Implemented |
| Role sync (App ↔ Discord) | Bot / role sync service | Implemented |

---

## 10. References

- [LEAGUE-FEATURES-GUIDE-V3.md](./LEAGUE-FEATURES-GUIDE-V3.md) — User guide: how to use Trade Block, Trade Offers, Free Agency, Tera Captains, and all CHATGPT-V3 features in the app
- [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md) — Full channel list and IDs
- [DISCORD-SERVER-MAP-RAW.md](./DISCORD-SERVER-MAP-RAW.md) — Raw channel tree export
- [DISCORD-SERVER-MAP.json](./DISCORD-SERVER-MAP.json) — Machine-readable channel tree
- [CHATGPT-V3-UPDATE.md](../CHATGPT-V3-UPDATE.md) — League rules and integration requirements
- [lib/discord-notifications.ts](../lib/discord-notifications.ts) — Webhook notification functions
- [lib/discord-commands/](../lib/discord-commands/) — Slash command handlers
- [docs/FREE-AGENCY-DISCORD-INTEGRATION.md](./FREE-AGENCY-DISCORD-INTEGRATION.md) — FA command design

---

## 11. Final Summary — Discord Server Comprehensive Breakdown and Integration Map

This report is the **comprehensive breakdown and integration map** for the Average At Best Draft League Discord server:

- **Server:** 25 members, 49 channels (34 text, 4 voice, 11 categories). Primary formats: AAB Singles, AAB Doubles, and Average At Best Battle League (app/bot).
- **Critical channels:** #trades-and-transactions (Singles) for trades/FA/Tera webhooks; #bot-command-testing for all slash commands; #announcements (both Singles and Battle League) for match results, weekly recap, and draft board sync.
- **App integration:** Webhooks (`trades`, `match_results`, `weekly_recap`, `draft_board_sync`, `draft_board_errors`, `video_tag`) and bot commands (`/pick`, `/search`, `/calc`, `/free-agency-submit`, `/free-agency-status`, `/draftstatus`, `/whoami`, `/setseason`, `/getseason`, `/coverage`) are documented and largely implemented; Tera reminders and optional `/tera-status` remain.
- **Refresh:** Run `pnpm discord:refresh-map` to regenerate [DISCORD-SERVER-MAP-RAW.md](./DISCORD-SERVER-MAP-RAW.md) and [DISCORD-SERVER-MAP.json](./DISCORD-SERVER-MAP.json); then update [DISCORD-SERVER-MAP.md](./DISCORD-SERVER-MAP.md) if the channel layout changes.
