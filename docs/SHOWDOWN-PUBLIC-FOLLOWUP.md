# Showdown public data + verified linking — follow-up status

Baseline: `main` @ `09f5817` (#77). Companion Notion plan: [Showdown Identity + Public Replay Archive](https://app.notion.com/p/411cd2a6542281d2b6baf8cae414533b).

## Verified in this pass

| Flow | Evidence |
| --- | --- |
| Public user JSON | `GET https://pokemonshowdown.com/users/zarel.json` → HTTP 200 |
| Public ladder JSON | `GET https://pokemonshowdown.com/ladder/gen9ou.json` → HTTP 200 |
| Moves JSON | `GET https://play.pokemonshowdown.com/data/moves.json` → HTTP 200 |
| Replay JSON | `GET https://replay.pokemonshowdown.com/gen8doublesubers-1097585496.json` → HTTP 200 |
| Replay search + `before=` | `search.json?user=zarel` → hits; paginate with last `uploadtime` |
| Team paste → parse → export | `lib/team-parser.roundtrip.test.ts` |
| Public challenges (no synthetic rooms) | Inherited from #77 `getPublicBattleRoomUrl` + create-room 409 |
| Calc web + Discord | `/calc` + `/dashboard/calc` → `calc.pokemonshowdown.com`; Discord `/calc` → `POST /api/calc` |
| Pokédex ingest failure path | `triggerShowdownPokedexIngestion` returns `success: false` when Edge Function fails or `processed===0` with errors |

## Shipped in app (flags still OFF for ingest / OAuth writes)

- `lib/showdown/public-web-api.ts` + authenticated proxies under `/api/showdown/public/*`
- Replay discovery UI on attach panel (requires `REPLAY_INGEST_ENABLED`)
- OAuth start/callback/unlink routes (fail-closed 503 until capability gate + client id + redirect)
- Held migration: `supabase/migrations/_held_local_only_not_on_prod/20261127210000_showdown_verified_link_columns.sql`
- Removed retired `aab-login.moodmnky.com` fallback from legacy sync paths

## Blocked / unverified (need human / staging)

| Item | Blocker |
| --- | --- |
| Verified OAuth linking live | No approved `SHOWDOWN_OAUTH_CLIENT_ID`; register via [PS OAuth form](https://forms.gle/VAoSjqHn4zwem7tp9) with exact production origin. `SHOWDOWN_OAUTH_LINK_IMPLEMENTED` remains `false`. |
| Profile bind columns on prod | Held migration not applied (by design) |
| Replay paste → preview → confirm on staging | Needs `REPLAY_INGEST_ENABLED=true` + migrations applied in staging + authenticated coach session |
| Live Discord guild command inventory | No bot token in this environment (see Discord guide PR) |
| Cloud `getteams` sync | Not documented for third-party OAuth; **out of scope** — do not promise |
| Production flag flips / SQL apply | Explicit user approval required |

## Operator enablement checklist (do not run without approval)

1. Submit OAuth client form; set `SHOWDOWN_OAUTH_CLIENT_ID` + `SHOWDOWN_OAUTH_REDIRECT_URI`
2. Review + apply held migration on staging only
3. Flip `SHOWDOWN_OAUTH_LINK_IMPLEMENTED` in code after bind writes are wired
4. Staging soak for `REPLAY_INGEST_ENABLED` before production
