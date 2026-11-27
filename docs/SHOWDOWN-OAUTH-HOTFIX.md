# Showdown OAuth ownership-proof hotfix

Defensive fix for the production release blocker in merged PR #79.

## What was broken

The OAuth callback trusted the redirect `user` query param and an unbound
`ps_oauth_state` cookie. It never:

1. Cryptographically verified the Showdown login assertion
2. Matched the assertion challenge to the initiated request
3. Bound the request to the league session that started linking
4. Consumed a single-use request token (replay possible)

## What this hotfix does

| Control | Behavior |
| --- | --- |
| Provider proof | RSA-SHA1 verify of assertion with official Main loginserver public key (`lib/showdown/assertion.ts`) |
| Registered only | Rejects Showdown `userType === "1"` (unregistered name) and `guest*` userids |
| Userid source | Derived from verified assertion fields — never from `user` alone |
| Request binding | HMAC cookie `ps_oauth_binding` = league uid + state + challenge + jti + exp |
| State | Appended to registered `redirect_uri` (`?state=`); compared on callback |
| Challenge | `4\|<hex>` challstr on authorize; hex embedded in assertion must match binding |
| Single-use | Server-side atomic JTI insert into `showdown_oauth_consumed_jti` before profile write; cookie also cleared |
| Fail closed | Missing/invalid proof, unregistered assertion, session/state mismatch, JTI replay, stale assertion → 4xx/409, no profile write |

Public profile / ladder / replay discovery stay separate read-only surfaces and
**do not** prove ownership.

## Production posture (do not change yet)

Production currently reports both OAuth env vars absent — **keep it that way**.

| Item | Production | Staging |
| --- | --- | --- |
| `SHOWDOWN_OAUTH_CLIENT_ID` | **unset** | set after PS form approval for staging origin |
| `SHOWDOWN_OAUTH_REDIRECT_URI` | **unset** | `https://<staging-host>/api/showdown/oauth/callback` |
| `SHOWDOWN_OAUTH_BINDING_SECRET` | optional if service role present; prefer explicit | set explicit secret |
| `REPLAY_INGEST_ENABLED` | **unset / false** | optional soak after linking |
| Migration `20261127210000_…` | **do not apply to prod in this hotfix** | apply on staging only when testing bind |
| PS OAuth client registration | **do not register prod origin yet** | register staging origin via [form](https://forms.gle/VAoSjqHn4zwem7tp9) |
| Merge / deploy of enabling env | **out of scope for this PR** | after green CI + manual staging link/unlink |

With OAuth env unset, `/api/showdown/oauth/*` returns HTTP 503 and the profile
Link control stays hidden (`oauth_link_available: false`).

## Staging prerequisites (exact)

1. Submit the [PS OAuth client form](https://forms.gle/VAoSjqHn4zwem7tp9) with the **exact** staging origin (`https://host` — scheme/host/port).
2. Set on staging only:
   - `SHOWDOWN_OAUTH_CLIENT_ID=<issued public id>`
   - `SHOWDOWN_OAUTH_REDIRECT_URI=https://<staging-host>/api/showdown/oauth/callback`
   - `SHOWDOWN_OAUTH_BINDING_SECRET=<long random>` (or rely on `SUPABASE_SERVICE_ROLE_KEY` derivation)
3. Apply on **staging** Postgres only:
   - `supabase/migrations/20261127210000_showdown_verified_link_columns.sql`
   - `supabase/migrations/20261127213000_showdown_oauth_consumed_jti.sql`
4. Smoke: Profile → Link → authorize on play.pokemonshowdown.com → land on `/profile?showdown_linked=1` with `profiles.showdown_userid` set; Unlink clears columns.
5. Negative smoke: replay callback with same Cookie → `JTI_REPLAY`; wrong session → `BINDING_USER_MISMATCH`; forged type-1 assertion → `ASSERTION_UNREGISTERED_USER`.

## Production enablement (later, coordinator-approved)

Only after staging soak:

1. Register **production** origin with PS (separate from staging if origins differ).
2. Set the three OAuth env vars on Vercel production.
3. Apply the profile-column migration on production.
4. Keep `REPLAY_INGEST_ENABLED` off until separately approved.
5. Never collect Showdown passwords; never promise `getteams` / cloud team sync.

## Tests

- `lib/showdown/assertion.test.ts` — invalid / mismatched / stale / valid RSA proof
- `lib/showdown/oauth-verify.test.ts` — session/state/identity mismatch, replay, valid bind + unlink wiring
- `lib/showdown/oauth.test.ts` — authorize URL, binding cookie, prerequisites
- `lib/showdown/public-web-api.test.ts` — public profile/ladder remain mocked unit coverage (opt-in live probes)

## References

- https://github.com/smogon/pokemon-showdown-loginserver/blob/master/OAUTH.md
- https://github.com/smogon/pokemon-showdown/blob/master/server/users.ts (`validateToken`)
- https://github.com/smogon/pokemon-showdown/blob/master/config/config-example.js (`loginserverpublickey*`)
