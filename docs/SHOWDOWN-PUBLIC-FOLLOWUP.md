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

## Shipped in app

- `lib/showdown/public-web-api.ts` + authenticated proxies under `/api/showdown/public/*`
- Replay discovery UI on attach panel (requires `REPLAY_INGEST_ENABLED`)
- OAuth start/callback/unlink with profile bind (`showdown_userid*`)
- Migration: `supabase/migrations/20261127210000_showdown_verified_link_columns.sql`
- `SHOWDOWN_OAUTH_LINK_IMPLEMENTED = true` (still needs client id + redirect env)
- Removed retired `aab-login.moodmnky.com` fallback from legacy sync paths

## Rollout (user-approved)

| Item | State |
| --- | --- |
| OAuth capability gate | **on** in code |
| Profile bind migration | in active migrations path — apply on deploy |
| `SHOWDOWN_OAUTH_CLIENT_ID` + redirect | **set in Vercel** after PS form approval |
| `REPLAY_INGEST_ENABLED` | set `true` in Vercel when ready |

## Still needs ops env

1. Submit [PS OAuth form](https://forms.gle/VAoSjqHn4zwem7tp9); register exact production origin
2. `SHOWDOWN_OAUTH_CLIENT_ID` + `SHOWDOWN_OAUTH_REDIRECT_URI=https://<host>/api/showdown/oauth/callback`
3. Apply migration `20261127210000_showdown_verified_link_columns`
4. Optional: `REPLAY_INGEST_ENABLED=true` after staging soak

Cloud `getteams` / password collection remain out of scope.
