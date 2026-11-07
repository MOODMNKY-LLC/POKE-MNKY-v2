# Showdown identity + optional replay archive — implementation-ready plan

**Status:** RESEARCH + PLAN ONLY (no implementation in this pass)  
**Audited baseline SHA:** `a200b744e02142cf3eba93c7ce200dc3b4bee26e` (main / PR #37 last deployed)  
**Audience:** POKE-MNKY Notion HQ publication (parent publishes; this file is the source artifact)  
**Out of scope:** custom battle hosting requirement, simulator sandbox PRs, production writes, OAuth client registration, account deletes, sheet standings overwrite

---

## 1-page recommendation

### What we should do
Keep the **league app** as the system of record for Discord identity, roles, seasons, rosters, and sheet-legacy results. Treat Pokémon Showdown as an **optional** battle/replay surface: coaches who battle on **central PS** can **link a verified Main account** and later **attach public (or explicitly shared private) replays** for archive + observed analysis. Coaches who never use Showdown remain fully functional.

### What we should stop doing (directionally)
- Auto-registering parallel accounts on a **self-hosted loginserver** and treating “username already taken” as ownership.
- Implying “Sync Showdown” imports teams from a cloud account.
- Assuming we need a **custom battle server** for this workstream (user direction: we don’t).
- Letting replay-derived numbers silently overwrite sheet standings / MVP / official results.

### Best architecture (pragmatic)
| Layer | Owner |
|-------|--------|
| League identity, Discord, roles, seasons, rosters, sheet sync | App (Supabase) |
| Optional verified Showdown userid | Central PS via OAuth2-*like* authorize (if `client_id` available) |
| Teams for league use | Paste / upload / export (+ roster validation with correct coach→season resolver) |
| Cloud private `getteams` | **Deferred** until third-party access is verified (not MVP) |
| Replays | Coach pastes official replay URL first; optional later discovery by verified alias |
| Official league W/L / MVP | Sheet / existing match submit — **unchanged by default** |
| Observed battle stats | Separate archive + analysis tables with confidence / pending review |

### Why this fits AAB
Season 7 live + Season 8 placeholder already creates `is_current` hazards; any new path must take **explicit `season_id` / `team_id`**. Sheet sync remains gradual migration truth for competitive standings. Discord + paste result flows already exist. CAP/custom mon: **not required** for this plan; custom battle host stays optional ops, not a dependency.

### Rollout posture
Ship in **small phases**, reuse existing dashboard match UI + `replay-utils` + worker parser ideas, add new archive tables rather than hijacking Showdown’s `public.replays` schema. Feature flags for link + ingest. Graceful no-op if OAuth `client_id` never arrives.

---

## 2. Goals and non-goals

### Goals
1. Verified link from app profile → **central** Showdown identity (no passwords stored/proxied).
2. Keep **paste/upload/export** as the reliable team workflow; fix roster validation resolver.
3. Optional **replay ingest** from official public replay APIs for archive + observed stats.
4. Dashboard UX: attach replay on a match → fetch preview → confirm → archive; league works with zero Showdown use.
5. Clear separation: **observed** vs **official** league stats.

### Non-goals
- Requiring every coach to link Showdown or upload replays.
- Running or depending on a custom battle server for this plan.
- Implementing cloud private team sync (`getteams`) in MVP.
- Overwriting sheet standings, MVP (`pokemon_stats`), or auto-finalizing league results from logs without Matt approval.
- Resuming simulator sandbox release work.
- Contacting PS for `client_id` in this research pass (plan notes the dependency only).

---

## 3. Official facts (documented) vs inferred

Legend: **D** = documented in cited official source · **I** = inferred from client/server source · **T** = locally tested in prior audit · **U** = unverified / unknown

### Accounts and OAuth
| Claim | Class | Source |
|-------|-------|--------|
| Login uses `|challstr|` then POST `play.pokemonshowdown.com/api/login` (or upkeep) then `/trn USER,0,ASSERTION` | D | [PROTOCOL.md](https://github.com/smogon/pokemon-showdown/blob/master/PROTOCOL.md) |
| Custom servers default `loginserver` to Main; verifier public key shipped in config | D | [config-example.js](https://github.com/smogon/pokemon-showdown/blob/master/config/config-example.js) (`loginserver`, `loginserverpublickey*`) |
| `psim.us` used for shared account logins with PS Main | D | [server/README.md](https://github.com/smogon/pokemon-showdown/blob/master/server/README.md) |
| OAuth2-*like* provider: authorize → `assertion` + `token` + `user`; token → `getassertion` with challstr; origin must match registered client; apply via Google form | D | [OAUTH.md](https://github.com/smogon/pokemon-showdown-loginserver/blob/master/OAUTH.md) |
| OAuth docs do **not** grant team APIs or passwordless `getteams` | D | same OAUTH.md (scope = login assertions) |
| Asking users to type PS passwords into our backend is discouraged (MitM concern historically) | I/D-adjacent | [client issue #1264](https://github.com/smogon/pokemon-showdown-client/issues/1264) (Zarel: don’t encourage MitM passwords); prefer OAuth |

### Public web APIs (no private credentials)
| Claim | Class | Source |
|-------|-------|--------|
| Replay JSON + `.log`; inputlog only for autogenerated-team formats | D | [WEB-API.md](https://github.com/smogon/pokemon-showdown-client/blob/master/WEB-API.md) |
| CORS `Access-Control-Allow-Origin: *` on these APIs | D | WEB-API.md |
| Search: `search.json`, `?user=`, `?user2=`, `?format=`, paginate with `?before=<uploadtime>`; 51 results ⇒ more pages; prefer `before=` over `page=` | D | WEB-API.md |
| Public user JSON / ladders | D | WEB-API.md |
| Private replay URLs include password segment ending in `pw` | I | [PS issue #6950](https://github.com/smogon/pokemon-showdown/issues/6950); rooms.ts password/`pw` suffix |

### Teams
| Claim | Class | Source |
|-------|-------|--------|
| Export / JSON / packed formats defined | D | [sim/TEAMS.md](https://github.com/smogon/pokemon-showdown/blob/master/sim/TEAMS.md) |
| Client loads localStorage teams; logged-in client calls loginserver `getteams` / `getteam` | I | [client-main.ts](https://github.com/smogon/pokemon-showdown-client/blob/master/play.pokemonshowdown.com/src/client-main.ts) (`PSLoginServer.query('getteams')`) |
| `getteams` **not** listed in WEB-API.md | D (absence) | WEB-API.md |
| Third-party OAuth → `getteams` | **U** | Do not ship until verified |

### App baseline (prior audit @ SHA above)
| Claim | Class |
|-------|-------|
| “Sync” = self-hosted loginserver **register**, not team sync | T/source |
| Teams = paste/upload/builder → `showdown_teams` | T/source |
| `validate-team` uses `teams.coach_id = user.id` (likely wrong; should be coaches.id / `resolveCoachTeamForSeason`) | T/source |
| No in-app fetch/parse/store of battle logs; `replay_url` is a string field; embed UI exists | T/source |
| Worker `ReplayParser` exists under `scripts/integration-worker/` — not wired into Next app | T/source |

---

## 4. Narrow repo map (reuse first)

### Reuse as-is or with small edits
| Path | Role |
|------|------|
| `lib/showdown/replay-utils.ts` | `extractReplayId` **used**; `getReplayLogUrl` / `getReplayJsonUrl` **unused helpers** — extend for **official** `replay.pokemonshowdown.com` allowlist |
| `components/showdown/replay-library.tsx`, `replay-viewer.tsx`, `app/showdown/replay*` | Embed/list UI — keep for viewing; do not treat as archive |
| `lib/validation/match-submit.ts` | Already allows optional `replay_url` |
| `lib/match-result-complete.ts` | Official result writes — **do not auto-drive from parser** |
| `lib/coach-team-context.ts` | Correct season/team resolver — use in validate-team |
| `lib/standings-season.ts` | Prefer over naive `is_current` for live competitive season |
| `lib/sheet-sync-write-gate.ts` | Keep blocking official writes when sheet is SoT |
| `lib/discord-results/*` + cron | Read-only reconcile pattern — model “pending review” similarly |
| `components/dashboard/upload-team-form.tsx`, `lib/team-parser.ts`, `lib/showdown-teams.ts` | Paste path baseline |
| `components/profile/profile-sheet.tsx` | Replace Sync UX with Link / Unavailable states |
| `scripts/integration-worker/src/parsers/replay-parser.ts` | **Reference** for win/faint heuristics — port carefully into `lib/showdown/replay-parse.ts` with confidence; do not deploy worker as-is |

### Do not hijack / do not assume
| Asset | Note |
|-------|------|
| `public.replays` / `replayplayers` | Showdown-shaped schema in our DB; **no app TS reads**; RLS locked down — **leave alone**; new `league_replay_*` tables |
| `public.showdown_client_teams` | Loginserver table; Next never queries |
| `/api/battle/*` + `battle_sessions` | In-app simulator — paused workstream; unrelated |
| Worker DB updater writing `matches` + team W/L | Dangerous if revived alongside app — keep off |

### Official write paths that replay analysis must not silently touch
- Sheet sync → `teams`, `matches`, `pokemon_stats` (`source='sheet'`)
- `completeMatchResult` → `matches` + team W/L recalculation
- MVP reads from `pokemon_stats` (`lib/mvp-standings.ts`)

---

## 5. Target product design

### 5.1 Identity (verified link)
**User journey**
1. Coach opens Profile → “Link Showdown account”.
2. If `SHOWDOWN_OAUTH_CLIENT_ID` **missing**: show honest empty state (“Linking unavailable — paste teams and replay URLs still work”).
3. If present: browser OAuth authorize against Main with registered origin + challstr/challenge per OAUTH.md.
4. On callback: store `profiles.showdown_userid`, `showdown_username`, `showdown_linked_at`, `showdown_link_method='oauth'`, clear any legacy “synced via register” flags for display.
5. Unlink: soft-clear link fields; keep historical replay archives.

**Safety**
- Never collect/store PS passwords.
- Never treat register/`username taken` as ownership.
- Linked username ≠ proof that a replay participant is that coach until match attach is confirmed (or stronger heuristics + review).

**Compatibility with old loginserver sync**
- Flag `SHOWDOWN_LEGACY_LOGINSERVER_SYNC=off` (default off for new UX).
- Keep old columns readable for migration; **no destructive account deletes**.
- Comms draft (user-facing, not sent by agents):  
  > We’re moving to optional linking of your existing Pokémon Showdown account. League rosters and results stay in POKE MNKY. You don’t need Showdown to coach. If you previously used “Sync,” you can ignore it — paste teams as before. Linking (when enabled) proves your Main username; it doesn’t import private teams automatically.

### 5.2 Teams (baseline — always available)
- Paste / `.txt` upload / builder → `showdown_teams` (existing).
- Validate against **draft roster** via fixed resolver (`resolveCoachTeamForSeason` + explicit `season_id`).
- Preview parse errors before save (existing toast patterns).
- Export clipboard/download unchanged.
- **Cloud `getteams`:** Phase “Later / research spike” only after verifying auth for third-party clients. Until then UI must not promise it.

### 5.3 Replay ingestion (optional)
**Primary:** coach pastes a replay URL on a match (or Match Center attach).  
**Secondary (later):** suggest candidates from `search.json?user=<linked_userid>` — never auto-attach; never treat username alone as identity proof.

**Allowlisted fetch hosts (SSRF)**
- `https://replay.pokemonshowdown.com/` only for MVP official path.
- Reject other hosts (including legacy `aab-replay` / custom) **or** put behind a separate explicit allowlist flag if ops still host copies — default **official only**.
- No redirects outside allowlist (max 2 redirects, same host).
- Timeouts (e.g. 8s), max body size (e.g. 2–5 MB), HTTPS only.
- Do not fetch arbitrary user-supplied URLs.

**Private / password / unlisted**
- If URL contains `…-…pw` password form: require **explicit coach consent** checkbox (“I have the right to archive this private replay for league use”).
- Store password **only if required to refetch**, encrypted at rest, ACL-restricted; prefer storing fetched log once so password need not be re-used.
- Never index private replays in public site search; never expose password in client HTML/API to non-owners.
- If JSON indicates private/hidden and fetch fails without password: clear error, no retry spam.

**Archive immutability**
On confirm, write immutable raw artifact:
- `source_url` (canonicalized), `source_id` (replay id), `content_hash` (sha256 of raw log), `fetched_at`, `parser_version`, `format`, `visibility` (`public|private|unlisted|unknown`), `raw_log`, optional `raw_json`, `inputlog` if present
- Dedup on `(source_id)` or `content_hash`
- Soft-delete / tombstone policy; reparse creates new `parse_run` rows without mutating raw
- If upstream deleted: keep archive; mark `source_status=gone` on refresh attempt

### 5.4 What logs can reliably measure

| Signal | Reliability | Notes |
|--------|-------------|-------|
| Winner / tie from `|win|` / `|tie|` | High | Prefer over faint counts |
| Participant names (`|player|`) | High | Display names; map to coaches only via confirm |
| Turn count | High | `|turn|` |
| Faint events | High as events | **Not** the same as “KO credit” |
| Forfeit / disconnect | Medium | Depends on log tags; often needs review |
| KO attribution (who caused faint) | Low–medium | Residual, recoil, hazards, self-KO, confusion — easy to mis-credit |
| Illusion / forme / species identity | Low without careful rules | Species shown ≠ underlying |
| Full EV/IV/moves/opponent sets | **Do not promise from spectator logs** | Incomplete by design for many formats |
| Official league W/L / MVP | **Not from this parser alone** | Sheet / submit remain SoT unless Matt decides otherwise |

**Confidence model:** each derived fact has `confidence` (`high|medium|low`) + `provenance` (log line refs) + optional `needs_review=true`.

**Product rule:** Observed stats live in `league_replay_observations` (name TBD). They **never** auto-write `pokemon_stats` or overwrite sheet standings without an explicit, approved product switch (Matt decision).

---

## 6. Data contracts (proposed — unapplied)

> Migrations proposed only. **Do not execute SQL / do not `db push` in this plan pass.**

### 6.1 Profile link fields (additive)
```text
profiles
  showdown_userid text null          -- toID
  showdown_username text null        -- display
  showdown_linked_at timestamptz null
  showdown_link_method text null     -- 'oauth' | null
  -- retain legacy showdown_account_synced* for read/compat; stop writing when flag off
```

### 6.2 New archive tables (preferred over `public.replays`)
```text
league_replay_archives
  id uuid pk
  source_id text not null unique          -- e.g. gen9ou-1234567890
  source_url text not null
  content_hash text not null
  raw_log text not null
  raw_json jsonb null
  inputlog text null
  format text null
  visibility text not null default 'unknown'
  fetched_at timestamptz not null
  source_status text not null default 'ok'  -- ok|gone|error
  created_by uuid null references profiles
  acl_owner_team_id uuid null
  season_id uuid null                     -- explicit; never infer alone from is_current
  created_at timestamptz default now()

league_replay_parse_runs
  id uuid pk
  archive_id uuid references league_replay_archives
  parser_version text not null
  parsed_at timestamptz not null
  result jsonb not null                   -- structured observations + confidence
  status text not null                    -- ok|partial|failed

league_match_replay_links
  match_id uuid references matches
  archive_id uuid references league_replay_archives
  linked_by uuid
  link_method text                        -- paste|discovery_confirm
  confirmed_at timestamptz
  unique(match_id, archive_id)
```

### 6.3 API sketch
| Method | Route | Behavior |
|--------|-------|----------|
| GET | `/api/showdown/oauth/start` | 404/disabled if no client_id; else redirect URL |
| GET | `/api/showdown/oauth/callback` | Persist link; never store password |
| DELETE | `/api/showdown/link` | Soft unlink |
| POST | `/api/showdown/validate-team` | Fix coach/season resolver |
| POST | `/api/replays/preview` | Allowlisted fetch → parse preview, **no persist** |
| POST | `/api/replays/import` | Persist archive + parse_run; optional match link |
| GET | `/api/replays/:archiveId` | ACL: owners/admins; redact private secrets |
| POST | `/api/matches/:id/attach-replay` | Preview+confirm attachment |

### 6.4 RLS / privacy (intent)
- Archives: readable by creating coach, linked match coaches, admin/commissioner; private visibility never public-anon.
- Service role only for server fetch job.
- No anon insert.
- Password material never selected to clients.

---

## 7. UI plan (iterative, no redesign)

### Match record (dashboard weekly history / match detail)
1. Optional field: Replay URL (already on submit schema).
2. **Attach replay** button → modal: paste URL → Preview (players, winner, turns, faint count, confidence badges) → Confirm archive.
3. Progress: fetching → parsing → ready / error.
4. After attach: link to official PS replay + “Archived copy” for coaches.
5. Empty state: “No replay — league results still stand.”

### Profile
- Replace “Sync Showdown Account” with **Link** / **Linked as X** / **Unavailable**.
- Short copy: linking is optional; teams still paste.

### Settings / admin
- Flag panel: OAuth enabled?, legacy sync off, replay ingest on, allowlist hosts.
- **No** auto “apply observations to MVP” toggle without Matt.

---

## 8. Phased delivery

Effort labels are **coarse estimates** (S/M/L relative complexity), not calendar or headcount.

### Phase 0 — Prep / safety (S) — PR38 **MERGED** into `main`
- Merged: `2026-11-07T10:26:06Z` (17:26 ICT) by MOODMNKY-LLC; state `MERGED`.
- Merge commit on `main`: `166bc0186267d59c4d29b79eb27ffcfd08af4beb` from final head `ca52d06dae79e7f60ee8d4636d25e616860bc977`.
- Flags: `SHOWDOWN_OAUTH_LINK_IMPLEMENTED=false` hard gate; `SHOWDOWN_LEGACY_LOGINSERVER_SYNC` default off; server-only (no `NEXT_PUBLIC_*` secrets).
- `validate-team` uses `resolveCoachTeamForSeason` + required `season_id`; Discord/upload callers hardened.
- Pre-merge CI (run `42363490199`): unit / sheet-sync / e2e / Vercel / GitGuardian **pass**.
- **Merged ≠ deployed/enabled:** production deploy may still be building; flags remain fail-closed until explicitly configured.

### Phase 1 — Replay paste → archive MVP (M) — PR based on `main` (review, not merged)
- Retargeted onto `main@166bc01` after PR38 merge (clean Phase1-only diff).
- Allowlist HTTPS fetcher + visibility gate (`private===0` required; never infer public).
- APIs: `/api/replays/status|preview|import` gated by `REPLAY_INGEST_ENABLED` (default OFF → 410, no fetch/write).
- Migration file only: `20261107102017_league_replay_archives.sql` (additive; **not** applied to prod).
- Attach UX on weekly-matches history; no standings/MVP/sheet writes; simulator remains paused.
- Dedup does not grant foreign ACL or leak archive ids on deny.
- **Local RLS limitation:** no Docker / no disposable Supabase in this cloud agent — migration + RLS SQL reviewed against current docs; role/foreign/concurrency tests not executed live.

### Phase 2 — Verified account link (M) — **blocked on client_id**
- OAuth start/callback when client_id + registered origin exist.
- Graceful fallback remains Phase 0 empty state if unavailable.
- Store userid; optional display on coach card.
- **Acceptance:** link/unlink works; no password path; Discord username alone cannot claim a PS name.

### Phase 3 — Discovery assist (M)
- `search.json?user=` using **linked** userid only; show candidates; require confirm.
- Rate-limit outbound search; cache pages; respect 51-result pagination via `before=`.
- **Acceptance:** never auto-attach; username without link cannot search-as-self.

### Phase 4 — Observed analytics (L) — product-gated
- Aggregate observed faint/win stats for coaches who opt in.
- Explicitly labeled “from replays — not official league stats.”
- Any bridge into `pokemon_stats` / results requires **Matt decision** (see §10).

### Later / research spike (not scheduled)
- Verify whether OAuth token or browser session can lawfully call `getteams` for third-party apps.
- If yes: optional import UX. If no: keep paste forever.
- Private replay password vault hardening review.

---

## 9. Rollout and rollback

### Rollout
1. Flags default **off** in production until Phase 0 copy + validate-team fix soak.
2. Enable `REPLAY_INGEST_ENABLED` for admins/coaches after fixture tests pass.
3. Enable OAuth only after `client_id` + origin registered (human step outside this plan).
4. No simulator gates; no coupling to season-sim sandbox PRs.

### Rollback
- Flip flags off → UI hides link/ingest; archives remain readable.
- Do not drop tables on rollback.
- Legacy loginserver sync remains off; do not re-enable register-as-sync without review.
- If fetcher misbehaves: disable ingest flag; cached archives untouched.

### Migration away from old loginserver (non-destructive)
1. Stop writing legacy sync fields (flag).
2. Communicate (draft in §5.1) — humans send, not agents.
3. Optionally mark `showdown_account_synced` as deprecated in UI.
4. Never mass-delete loginserver users from this app.

---

## 10. Decisions only Matt / user must make

1. **When OAuth `client_id` is requested** (and which exact callback origin: production domain only vs preview hosts).
2. **Whether observed replay stats may ever feed official MVP / `pokemon_stats`** (default plan: **no**).
3. **Whether attaching a replay may auto-suggest correcting an in-app match score** (default: preview only; official submit remains human/sheet).
4. **Retain vs retire** self-hosted battle/replay hosts for embeds (`aab-replay`) now that custom battle hosting is not required — embeds can point at official PS replay pages.
5. **Private replay policy:** allow archive with consent, or public-only forever.

Everything else in this plan can proceed as engineering defaults.

---

## 11. Acceptance checklist (MVP)

- [ ] League usable with zero Showdown link and zero replays  
- [ ] No password collection  
- [ ] No parallel registration UX when legacy flag off  
- [ ] Paste team + roster validation uses season-aware coach resolver  
- [ ] Replay fetch only allowlisted hosts; SSRF tests pass  
- [ ] Private URL requires consent; password not leaked to unauthorized clients  
- [ ] Archive stores hash + parser_version; reparse non-destructive  
- [ ] Parser marks low-confidence KO credit; no EV/set promises in UI  
- [ ] Sheet standings / MVP unchanged by ingest  
- [ ] Explicit `season_id` on archive/link paths (no `is_current`-only writes)  
- [ ] Feature-flag rollback works without data loss  

---

## 12. Test plan (concrete)

| Layer | Cases |
|-------|--------|
| Unit | `extractReplayId` / allowlist URL builder; reject `http://169.254.169.254`, non-allowlisted hosts, oversize; pagination `before=` helper |
| Unit | Parser fixtures: win, tie, forfeit-ish logs, faint counting ≠ win; Illusion label → `needs_review` |
| Unit | `resolveCoachTeamForSeason` in validate-team |
| API | preview without auth 401; import ACL; private without consent 400 |
| RLS | anon cannot select private archives |
| E2E (later) | attach public replay on match history happy path |
| Never | production writing tests against live PS accounts; paid tools |

Reuse: `lib/coach-team-context.test.ts`, `lib/match-result-complete.test.ts`, `lib/standings-season.test.ts` patterns. Add `lib/showdown/replay-*.test.ts`. Worker fixtures under `scripts/integration-worker/src/test-fixtures/` as input samples only.

---

## 13. Source citations (canonical)

1. https://github.com/smogon/pokemon-showdown/blob/master/PROTOCOL.md — challstr / login / assertion  
2. https://github.com/smogon/pokemon-showdown-loginserver/blob/master/OAUTH.md — third-party OAuth2-like linking  
3. https://github.com/smogon/pokemon-showdown-client/blob/master/WEB-API.md — replay JSON/log/search/pagination/CORS  
4. https://github.com/smogon/pokemon-showdown/blob/master/sim/TEAMS.md — team text formats  
5. https://github.com/smogon/pokemon-showdown/blob/master/server/README.md — shared Main accounts via psim.us  
6. https://github.com/smogon/pokemon-showdown/blob/master/config/config-example.js — default central loginserver + verifier  
7. https://github.com/smogon/pokemon-showdown-client/blob/master/play.pokemonshowdown.com/src/client-main.ts — `getteams` client usage (inferred; not WEB-API)  
8. App baseline: repo `@ a200b744e02142cf3eba93c7ce200dc3b4bee26e` — audit of dashboard / sync / paste / `replay-utils` / worker parser / sheet SoT

---

## 14. Known unknowns

- Whether PS will grant OAuth `client_id` for moodmnky.com and on what timeline (**U**).  
- Whether that token can call `getteams` (**U** — assume no until proven).  
- Exact JSON schema fields for private/unlisted in replay JSON beyond URL password form (**partial I**).  
- How many AAB coaches already upload to Main vs local-only teams (**U**).  
- Whether ops still need `aab-replay` embeds after moving archive to official URLs (**decision #4**).

---

*End of plan artifact. No migrations applied. No provider contact. Simulator release remains paused.*
