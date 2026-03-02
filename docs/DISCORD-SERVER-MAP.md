# Discord Server Map — Average At Best Draft League

> **Canonical channel map.** Refresh with `pnpm exec tsx scripts/fetch-discord-server-map.ts [guildId]` after channel/category changes.

---

## Server Overview

| Property | Value |
|----------|-------|
| **Server name** | Average At Best Draft League |
| **Guild ID** | `1190512330556063764` |
| **Members** | 25 |
| **Total channels** | 49 (34 text, 4 voice, 11 categories) |
| **Bot** | POKE MNKY#3869 |
| **Created** | 2023-12-30 (Discord API) |
| **Icon** | [Server icon](https://cdn.discordapp.com/icons/1190512330556063764/d751f512404b293b75f8497c53bb458b.webp) |

---

## Categories and Channels (with League Function)

### Uncategorized (top-level)

| Channel | ID | Type | League function | App integration |
|---------|-----|------|-----------------|-----------------|
| #welcome | `1190512331009032302` | text | New member onboarding, rules intro | — |
| #league-changes | `1190531695867330621` | text | League structure/format changes, commissioner notes | — |
| Mods (voice) | `1322331029146566656` | voice | Mod/admin voice chat | — |

---

### AAB Singles (primary league format)

**Category ID:** `1408801550175830016`

| Channel | ID | League function | App integration |
|---------|-----|-----------------|-----------------|
| #announcements | `1408801974605975553` | Rule changes, voting results, draft dates, major events | `match_results`, `weekly_recap` webhooks (candidate) |
| #battle | `1196192255829086298` | Weekly battle setup, battle codes, match results, GG posts | `match_results` webhook (candidate); coaches post results manually |
| #general-chat | `1191355707296055306` | General league discussion | — |
| #logos | `1279902507346427935` | Team logos and branding | — |
| #questions | `1190514178381844560` | Rules questions, clarifications | — |
| #rules | `1190513002127048775` | League rules reference | — |
| #suggestions | `1190521133032808549` | Feature/rule suggestions | — |
| **#trades-and-transactions** | **`1190520119949021244`** | **FA drops/adds, trade block, Tera captain declarations** | **`discord_webhooks.name = 'trades'`** — primary target |
| #video-content | `1357802168031117586` | Battle replays, content | `video_tag` webhook (candidate) |
| #voting | `1190513871098744872` | Polls, rule votes | — |

---

### Pokemon Extras

**Category ID:** `1190513054593601658`

| Channel | ID | League function | App integration |
|---------|-----|-----------------|-----------------|
| #memes | `1365498070862790739` | Off-topic | — |
| #pogo | `1408808089989152908` | Pokémon GO | — |
| #pokémon-tcg | `1367315535477604454` | TCG | — |
| #game-spoilers | `1428746130115657899` | Game spoilers | — |

---

### Voice Channels

**Category ID:** `1190512330556063767`

| Channel | ID | League function | App integration |
|---------|-----|-----------------|-----------------|
| General | `1190512331009032303` | General voice | — |
| Battle 1 | `1408800830131540058` | Battle voice | — |
| Battle 2 | `1408801007323971594` | Battle voice | — |

---

### Draft League Docs

**Category ID:** `1190533648391352440`

| Channel | ID | League function | App integration |
|---------|-----|-----------------|-----------------|
| #docs | `1190533743505575996` | Documentation links | — |

---

### Season Review (archives)

| Category | Channel | ID |
|-----------|---------|-----|
| Season 1 Review | #season-1-review | `1226363715599863850` |
| Season 2 Review | #season-2-review | `1258115492061642822` |
| Season 3 Review | #season-3-review | `1318416920248058007` |
| Season 4 Review | #season-4-review | `1389792356533932072` |
| Season 5 Review | #season-5-review | `1410796312752029787` |

---

### AAB Doubles (secondary format)

**Category ID:** `1429247813417566228`

| Channel | ID | League function | App integration |
|---------|-----|-----------------|-----------------|
| #announcements | `1429248222723047555` | Doubles announcements | — |
| #battle | `1429248096835080202` | Doubles battle setup | — |
| #general-chat | `1429248168003895306` | Doubles chat | — |
| #polls-and-voting | `1429247967486808234` | Doubles polls | — |
| #questions | `1429248407272165376` | Doubles questions | — |
| #rules | `1429248434228957234` | Doubles rules | — |
| #suggestions | `1429248501564571856` | Doubles suggestions | — |
| #team-names-and-logos | `1429248689196765306` | Doubles team branding | — |
| #trades-and-transactions | `1429248323604451381` | Doubles trades/FA | — |
| #video-content | `1429248563933610054` | Doubles replays | — |

---

### Average At Best Battle League (app integration)

**Category ID:** `1461567928804708574`

| Channel | ID | League function | App integration |
|---------|-----|-----------------|-----------------|
| **#bot-command-testing** | **`1461568485716004894`** | **POKE MNKY bot commands, `/pick`, `/search`, `/calc`, `/free-agency-submit`, etc.** | **Bot slash commands** |
| #announcements | `1461567986329714791` | App announcements, draft board sync | `draft_board_sync`, `draft_board_errors` webhooks (candidate) |

---

## How to Refresh This Map

1. Run: `pnpm exec tsx scripts/fetch-discord-server-map.ts [guildId]`
2. Default guild ID: `1190512330556063764`
3. Script writes `docs/DISCORD-SERVER-MAP.json` and `docs/DISCORD-SERVER-MAP-RAW.md`
4. Update this file's "Categories and Channels" section with any structural changes.

---

## Webhook Target Recommendations

| Webhook name | Recommended channel | Channel ID |
|--------------|---------------------|------------|
| `trades` | #trades-and-transactions (AAB Singles) | `1190520119949021244` |
| `match_results` | #battle (AAB Singles) or #announcements | `1196192255829086298` or `1408801974605975553` |
| `weekly_recap` | #announcements (AAB Singles) | `1408801974605975553` |
| `draft_board_sync` | #announcements (AAB Battle League) | `1461567986329714791` |
| `draft_board_errors` | #announcements (AAB Battle League) or admin DM | `1461567986329714791` |
| `video_tag` | #video-content (AAB Singles) | `1357802168031117586` |

---

## Tera Window (CHATGPT-V3)

For the 48-hour Tera assignment window after trade approval:

- **Preferred:** DM to receiving coach (not channel) — avoids spam, targets the right person.
- **Fallback:** Post in #trades-and-transactions with coach mention.
- **Reminders:** 24h and 6h before expiry — DM or channel mention.
