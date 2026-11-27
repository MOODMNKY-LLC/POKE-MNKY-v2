# Showdown public data + verified linking — follow-up status

Baseline: `main` @ `#79`. Ownership-proof hotfix: `docs/SHOWDOWN-OAUTH-HOTFIX.md`.

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

## Public vs verified linking

| Surface | Proves ownership? |
| --- | --- |
| Public profile / ladder / moves / replay search | **No** — read-only observational |
| OAuth link (assertion + binding) | **Yes** — RSA-verified assertion bound to league session |

## Shipped in app

- `lib/showdown/public-web-api.ts` + authenticated proxies under `/api/showdown/public/*`
- Replay discovery UI on attach panel (requires `REPLAY_INGEST_ENABLED`)
- OAuth start/callback/unlink with **assertion verification + HMAC session binding**
- Migration: `supabase/migrations/20261127210000_showdown_verified_link_columns.sql` (staging only until approved)
- Removed retired `aab-login.moodmnky.com` fallback from legacy sync paths

## Production posture (hotfix)

| Item | State |
| --- | --- |
| OAuth capability gate | on in code (verification shipped) |
| `SHOWDOWN_OAUTH_CLIENT_ID` + redirect | **keep unset in production** |
| `REPLAY_INGEST_ENABLED` | **keep unset / false in production** |
| Profile bind migration on prod | **do not apply yet** |
| PS client registration for prod | **do not register yet** |

See `docs/SHOWDOWN-OAUTH-HOTFIX.md` for exact staging enablement steps.

Cloud `getteams` / password collection remain out of scope.
