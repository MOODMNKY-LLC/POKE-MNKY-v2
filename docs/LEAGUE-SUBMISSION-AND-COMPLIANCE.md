# League Submission and Compliance

User-created (practice) teams can be submitted for league; the commissioner runs a compliance check and assigns the coach to a league slot.

## User flow

1. **Create a team** — Dashboard → Teams (Create / Upload / Team Builder); save to My Teams.
2. **Submit for league** — On a team card, click **Submit for league**. The team is flagged for commissioner review.
3. **Unsubmit** — Click **Unsubmit** to remove the flag.

## Commissioner flow

1. **Admin → League → Teams** — Coach Assignment section.
2. **Select user** (coach candidate).
3. **Submitted teams** — If the user has submitted teams, they appear with:
   - **Check compliance** — Rule-based (8–10 Pokemon, draft pool, 120 pt budget) plus optional AI advisory (Tera, format, etc.).
   - **Use this team** — Select which submission to assign.
   - **League slot** — Choose an unassigned league team.
   - **Assign to league** — Runs `assign_coach_to_team`, links the showdown team to the league team, clears the submission flag, and syncs Discord Coach role if applicable.
4. **No submissions** — Use **League slot** + **Assign Coach to Team (direct)** to assign without a linked submission.

## League rules (compliance)

- **Roster size:** 8–10 Pokemon.
- **Draft pool:** All Pokemon must be in the season draft pool.
- **Budget:** Total point value ≤ 120.

See [LEAGUE-FEATURES-GUIDE-V3.md](./LEAGUE-FEATURES-GUIDE-V3.md) for full league rules.

## APIs

- `POST /api/teams/submit-for-league` — Flag team (body: `showdown_team_id`, optional `submission_notes`).
- `POST /api/teams/unsubmit-for-league` — Remove flag (body: `showdown_team_id`).
- `GET /api/admin/submitted-teams?user_id=` — List submitted teams (admin/commissioner).
- `POST /api/admin/league-compliance-check` — Run compliance (body: `showdown_team_id`, optional `season_id`, `include_ai`).
- `POST /api/admin/assign-coach-from-submission` — Assign and link (body: `user_id`, `showdown_team_id`, `league_team_id`).

## Data

- `showdown_teams.submitted_for_league_at` — Set when user submits; cleared when commissioner assigns or user unsubmits.
- `showdown_teams.submission_notes` — Optional note to commissioner.
- `showdown_teams.team_id` — Set to the league team when assigned from submission.
