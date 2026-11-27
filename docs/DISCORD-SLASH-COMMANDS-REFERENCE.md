# Discord Slash Commands

POKE MNKY registers **11** slash commands for the league Discord. Type `/` in a channel, choose the POKE MNKY app, then pick a command.

You need a **Discord-linked app account** for most coach actions (`/whoami` tells you if the link is working). Battle-network access (`/join-battles`) is optional and only for coaches who play on Ryujinx.

---

## Draft

### `/pick`

- **Purpose:** Submit your draft pick when it is your turn.
- **Who can use:** Coaches linked to Discord with a team in the active draft. Anyone can open the command; it fails if you are not linked or it is not your turn.
- **Options:**
  - `pokemon` (required) — start typing; pick from autocomplete
  - `season_id` (optional) — season UUID if the guild default is wrong
  - `draft_round` / `pick_number` / `notes` (optional)
- **Example:** `/pick pokemon:Garchomp`
- **Availability:** Guild channels where the bot is present

### `/search`

- **Purpose:** Look up Pokémon still in the draft pool (cost, availability).
- **Who can use:** Anyone. Linked coaches get owned-mon filtering when possible.
- **Options:**
  - `query` (required) — name fragment; autocomplete supported
  - `season_id` (optional)
  - `limit` (optional) — default 10, max 25
- **Example:** `/search query:land`
- **Availability:** Guild channels

### `/draftstatus`

- **Purpose:** See draft state — whose turn, round, and whether the draft is live.
- **Who can use:** Anyone; richest result when Discord is linked to a coach/team.
- **Options:** `season_id` (optional)
- **Example:** `/draftstatus`
- **Availability:** Guild channels

---

## You & your roster

### `/whoami`

- **Purpose:** Show your linked coach profile and team.
- **Who can use:** Anyone. Returns “not linked” until Discord is connected in the app.
- **Options:** `season_id` (optional)
- **Example:** `/whoami`
- **Availability:** Guild channels

### `/coverage`

- **Purpose:** Analyze roster roles and type coverage (hazards, cleric, speed control, and more).
- **Who can use:** Linked coach with a team in the season.
- **Options:**
  - `season_id` (optional)
  - `checks` (optional) — comma-separated list; default all. Valid: `hazard_removal`, `hazard_setting`, `cleric`, `speed_control`, `recovery`, `phasing`, `screens`
  - `channel` (optional) — where to post a summary
- **Example:** `/coverage checks:cleric,speed_control`
- **Availability:** Guild channels

---

## Free agency

### `/free-agency-submit`

- **Purpose:** Queue an add, drop, or replacement. Moves settle with the league FA schedule (Monday 12:00 AM Eastern unless your season says otherwise).
- **Who can use:** Linked coach with an assigned team.
- **Options:**
  - `type` (required) — `replacement` | `addition` | `drop_only`
  - `add` (optional) — Pokémon to add; autocomplete
  - `drop` (optional) — Pokémon to drop; autocomplete
- **Examples:**
  - `/free-agency-submit type:replacement add:Slowking drop:Pikachu`
  - `/free-agency-submit type:addition add:Charizard`
  - `/free-agency-submit type:drop_only drop:Bulbasaur`
- **Availability:** Guild channels

### `/free-agency-status`

- **Purpose:** See pending FA moves, remaining transactions, and roster snapshot.
- **Who can use:** Linked coach with an assigned team.
- **Options:** none required (handler may accept `season_id` if provided)
- **Example:** `/free-agency-status`
- **Availability:** Guild channels

---

## Tools

### `/calc`

- **Purpose:** Damage ranges for a move (same engine as the in-app `/api/calc` route; web UI also embeds [calc.pokemonshowdown.com](https://calc.pokemonshowdown.com)).
- **Who can use:** Anyone.
- **Options:**
  - `attacker` / `defender` / `move` (required) — autocomplete
  - `generation` (optional) — Gen 9 (default), 8, or 7
- **Example:** `/calc attacker:Pikachu defender:Charizard move:Thunderbolt`
- **Availability:** Guild channels

---

## Commissioners

### `/getseason`

- **Purpose:** Show the guild’s default season for draft and free agency.
- **Who can use:** Any guild member.
- **Options:** none
- **Example:** `/getseason`
- **Availability:** Guild only (not DMs)

### `/setseason`

- **Purpose:** Set or clear the guild default season.
- **Who can use:** League admins / commissioners (Discord Administrator or configured admin roles). Prefer running this from a commissioner channel.
- **Options:**
  - `season_id` (required) — season UUID, or `clear` to remove the default
- **Example:** `/setseason season_id:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`
- **Availability:** Guild only

---

## Battle network (optional)

### `/join-battles`

- **Purpose:** Request access to the private NetBird mesh used for Ryujinx / RyuLDN battles. Not required for public Pokémon Showdown play.
- **Who can use:** Members of the league guild with a Discord-linked app account. Approvals go to NetBird admins / league admins.
- **Options:** none
- **Example:** `/join-battles` (reply is ephemeral). Re-run after linking Discord in the app if you were unlinked.
- **Availability:** League guild only — never appears in DMs
- **Handler note:** Routed through NetBird interactions (`lib/discord/netbird-interactions.ts`), not the generic draft/FA switch.

For setup steps after approval, open [Battle network (NetBird)](/dashboard/guides/netbird).

---

## Operator section

Details below are for commissioners and operators. Coaches can skip this.

### Registration inventory (code)

Canonical definitions: `lib/discord-commands/index.ts` → `getAllCommands()` (**11** commands).

| Command | Live handler | App surface |
| --- | --- | --- |
| `/pick` | interactions-handler | `POST /api/discord/draft/pick` |
| `/search` | interactions-handler | `GET /api/discord/pokemon/search` |
| `/draftstatus` | interactions-handler | in-process `getDraftStatusData` |
| `/whoami` | interactions-handler | in-process `getWhoamiData` |
| `/setseason` | interactions-handler | `POST /api/discord/guild/config` |
| `/getseason` | interactions-handler | `GET /api/discord/guild/config` |
| `/coverage` | interactions-handler | draft status + `POST /api/discord/notify/coverage` |
| `/calc` | interactions-handler | `POST /api/calc` |
| `/free-agency-submit` | interactions-handler | `POST /api/discord/free-agency/submit` |
| `/free-agency-status` | interactions-handler | `GET /api/discord/free-agency/team-status` |
| `/join-battles` | netbird-interactions | NetBird access request + Approve/Deny |

Interaction entrypoint: `app/api/discord/interactions/route.ts` (preferred). An Edge Function path may still exist for older deploys — keep one bot Interactions Endpoint URL.

### Registering commands

```bash
# Full guild inventory from getAllCommands() (11 commands)
pnpm discord:register-commands

# Upsert /join-battles alone (preferred when NetBird is already live —
# avoids a bulk PUT clobbering guild inventory)
pnpm discord:register-join-battles
```

Env for registration scripts: `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` (application id), `DISCORD_GUILD_ID`.

**Do not** re-register from the legacy server bot on the same application + guild after the app register — last write wins and can wipe the app set.

### Live guild inventory (read-only)

To list what Discord currently has (no mutations):

```bash
# Requires bot token + application id + guild id
curl -s -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  "https://discord.com/api/v10/applications/$DISCORD_CLIENT_ID/guilds/$DISCORD_GUILD_ID/commands" \
  | jq '.[].name'
```

Expect 11 names including `join-battles` when the app registration is active. This environment had no bot credentials, so live inventory was **not** verified here.

### Legacy server-bot commands

Older installs may still document `/matchups`, `/submit`, `/standings`, `/battle`, `/validate-team`, and similar. Those are **not** in `getAllCommands()`. Treat them as legacy unless a separate Discord application still serves them.

### Smoke tests

```bash
npx tsx scripts/test-discord-commands-e2e.ts
```

Exercises APIs with bot headers where applicable; does not require a live Discord websocket.

### Troubleshooting

| Symptom | What to check |
| --- | --- |
| Command missing in Discord | Registration ran for this guild? Last PUT from legacy bot? |
| Timeout | Discord needs a response in ~3s; slow routes should defer (`type: 5`) |
| Unauthorized | `/setseason` needs admin; FA/pick need linked coach + team |
| Autocomplete empty | Handler must return autocomplete (`type: 8`) choices for `/calc` and FA Pokémon options |
| `/join-battles` fails | User linked in app? League guild id? NetBird feature flags / admin allowlist |

### Related guides

- [Discord integration](/dashboard/guides/discord-integration)
- [Battle network (NetBird)](/dashboard/guides/netbird)
- [League features](/dashboard/guides/league-features-v3)
