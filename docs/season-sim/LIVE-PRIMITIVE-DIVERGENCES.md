# provisional_demo_v0 — live primitive reuse vs intentional divergences

**Purpose:** Document where sandbox season path reuses production helpers vs deliberately diverges.  
**Not** a claim of live-league fidelity.

| Domain | Live / production primitive | Sandbox v2 provisional path | Divergence / why |
|---|---|---|---|
| Schedule | `generatePrioritySchedule` / `generateSeasonSchedule` → `matches`/`matchweeks` | `generateSimpleSchedule` (circle) → **`sim_matches`** | Avoids writing live `matches`; no conference/priority weighting for synthetic bots |
| Results | `completeMatchResult` (+ Discord/activity) | PRNG `createSubstreamPrng(…, "statistical_outcomes")` → update `sim_matches` | Seeded, reproducible, no side effects; **not** Showdown |
| Standings | `updateStandingsFromMatches` mutates `teams` W/L/diff | Pure `computeSimStandings` → **`sim_standings`** | Does not mutate live `teams` rows; keeps sandbox isolation |
| Playoff seeding | `buildPlayoffSeeding` / SOS / division byes / sheet order | Wins+diff sort + `generatePlayoffRound1Only` → `sim_matches` | No sheet SOS/byes; synthetic seats lack live division structure |
| Advancement | `buildAdvancement` + `playoff_seeds` | Pairwise winners → next `sim_matches` round | Same idea, sim-scoped tables only |
| Champion | Derived UI from finals `matches.winner_id` | Persisted **`sim_season_outcomes.champion_team_id`** + run `phase=complete` | Explicit durable demo outcome; still not a live league champion |
| Draft | `DraftSystem` / `draft_*` | `sim_draft_*` only | Already isolated in PR34 |

**Reuse that is intentional:** `signedMatchDifferential` from `lib/sheet-standings`; schedule circle helper from `lib/league-simulation/schedule-generator`; playoff round-1 pairing helper from `lib/league-simulation/playoff-bracket-generator`.

**Explicitly unused for this demo:** Showdown/`battle_engine`, Discord/email/sheet webhooks, paid inference, live `matches` writes, name-based Mock Draft reset.
