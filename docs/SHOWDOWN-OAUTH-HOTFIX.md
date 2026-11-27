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
| Single-use | Server-side atomic JTI insert into `showdown_oauth_consumed_jti` **before** profile write; cookie also cleared |
| Fail closed | Missing/invalid proof, unregistered assertion, session/state mismatch, JTI replay, stale assertion → 4xx/409, no profile write |

Public profile / ladder / replay discovery stay separate read-only surfaces and
**do not** prove ownership.

## Required migrations (order matters)

Both migrations are required wherever verified linking is enabled. The callback
consumes a one-time request ID (`jti`) in the second table **before** it can bind
a verified `profiles.showdown_userid`.

| # | File | Purpose |
| --- | --- | --- |
| 1 | `supabase/migrations/20261127210000_showdown_verified_link_columns.sql` | Adds `profiles.showdown_userid`, `showdown_linked_at`, `showdown_link_method` (+ unique index) |
| 2 | `supabase/migrations/20261127213000_showdown_oauth_consumed_jti.sql` | Creates `showdown_oauth_consumed_jti` for atomic single-use OAuth request IDs |

Apply **1 then 2**. Skipping #2 leaves the callback unable to consume JTIs
(bind fails closed / store error). Skipping #1 leaves profile columns missing.

## Production posture (do not change yet)

Production currently reports both OAuth env vars absent — **keep it that way**.

| Item | Production | Staging |
| --- | --- | --- |
| `SHOWDOWN_OAUTH_CLIENT_ID` | **unset** | set after PS form approval for staging origin |
| `SHOWDOWN_OAUTH_REDIRECT_URI` | **unset** | `https://<staging-host>/api/showdown/oauth/callback` |
| `SHOWDOWN_OAUTH_BINDING_SECRET` | optional if service role present; prefer explicit | set explicit secret |
| `REPLAY_INGEST_ENABLED` | **unset / false** | optional soak after linking |
| Migration #1 `20261127210000_…` | **do not apply to prod yet** | apply on staging before smoke |
| Migration #2 `20261127213000_…` | **do not apply to prod yet** | apply on staging before smoke (required for JTI consume) |
| PS OAuth client registration | **do not register prod origin yet** | register staging origin via [form](https://forms.gle/VAoSjqHn4zwem7tp9) |
| Merge / deploy of enabling env | **out of scope for this PR** | after green CI + manual staging link/unlink |

With OAuth env unset, `/api/showdown/oauth/*` returns HTTP 503 and the profile
Link control stays hidden (`oauth_link_available: false`).

## Staging prerequisites (exact)

1. Submit the [PS OAuth client form](https://forms.gle/VAoSjqHn4zwem7tp9) with the **exact** staging origin (`https://host` — scheme/host/port).
2. Set on staging only:
   - `SHOWDOWN_OAUTH_CLIENT_ID=<issued public id>`
   - `SHOWDOWN_OAUTH_REDIRECT_URI=https://<staging-host>/api/showdown/oauth/callback`
   - `SHOWDOWN_OAUTH_BINDING_SECRET=<long random>` (prefer explicit; do not reuse production secrets)
3. Apply **both** migrations on **staging** Postgres, in order:
   1. `supabase/migrations/20261127210000_showdown_verified_link_columns.sql`
   2. `supabase/migrations/20261127213000_showdown_oauth_consumed_jti.sql`
4. Smoke: Profile → Link → authorize on play.pokemonshowdown.com → land on `/profile?showdown_linked=1` with `profiles.showdown_userid` set; Unlink clears columns.
5. Negative smoke: concurrent/replay callback with same Cookie → only one bind / `JTI_REPLAY`; wrong session → `BINDING_USER_MISMATCH`; forged type-1 assertion → `ASSERTION_UNREGISTERED_USER`; expired binding → `BINDING_EXPIRED`.

## Production enablement (later, coordinator-approved)

Only after staging soak:

1. Register **production** origin with PS (separate from staging if origins differ).
2. Set the three OAuth env vars on Vercel production.
3. Apply **both** migrations on production Postgres, in order:
   1. `20261127210000_showdown_verified_link_columns.sql`
   2. `20261127213000_showdown_oauth_consumed_jti.sql`
4. Keep `REPLAY_INGEST_ENABLED` off until separately approved.
5. Never collect Showdown passwords; never promise `getteams` / cloud team sync.

## Tests

- `lib/showdown/assertion.test.ts` — invalid / mismatched / stale / type-1 unregistered / valid RSA proof
- `lib/showdown/oauth-verify.test.ts` — session/state/identity mismatch, expired binding, Cookie replay, concurrent JTI race (only one wins), valid bind + unlink wiring
- `lib/showdown/oauth.test.ts` — authorize URL, binding cookie, prerequisites
- `lib/showdown/public-web-api.test.ts` — public profile/ladder remain mocked unit coverage (opt-in live probes)

## Staging verification log

| Date (America/New_York) | Result | Notes |
| --- | --- | --- |
| Fri Nov 27, 2026, 4:41 PM (America/New_York) | **Blocked — no staging client ID** | Vercel project envs have **no** `SHOWDOWN_OAUTH_CLIENT_ID` / `SHOWDOWN_OAUTH_REDIRECT_URI` / `SHOWDOWN_OAUTH_BINDING_SECRET` (preview identity-status reports linking unavailable). Cannot complete real Link/Unlink with a Showdown account until ops registers a client. |

### Exact origin to register (PS OAuth form)

Register **one stable staging origin** (scheme + host + port; path may vary):

| Candidate | Origin to submit | Callback URI to set in Vercel after approval |
| --- | --- | --- |
| Recommended stable staging | `https://poke-mnky.moodmnky.com` **only if** used as non-prod, **or** a dedicated staging hostname you control | `https://<that-host>/api/showdown/oauth/callback` |
| This PR preview (ephemeral) | `https://poke-mnky-v2-git-cursor-showdown-oau-9837d4-mood-mnkys-projects.vercel.app` | Same host + `/api/showdown/oauth/callback` — **not recommended** as sole registration (URL changes per branch) |

Form: https://forms.gle/VAoSjqHn4zwem7tp9

After client ID issuance: set staging env vars, apply **both** migrations in order, then re-run Link → Unlink smoke and update this log.

Production OAuth env, migrations, registration, merge/deploy: **still pending review / leave disabled**.

## References

- https://github.com/smogon/pokemon-showdown-loginserver/blob/master/OAUTH.md
- https://github.com/smogon/pokemon-showdown/blob/master/server/users.ts (`validateToken`)
- https://github.com/smogon/pokemon-showdown/blob/master/config/config-example.js (`loginserverpublickey*`)
