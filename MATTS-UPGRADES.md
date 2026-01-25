This is Matt, League Manager. I have a request that i would like to add a section to the dashboard page in the app. Likely under the side bar drop down tab of "My Matches" (lets rename that to "Weekly Matches" at a later time). Utilize the attached screenshot for reference on a potential way to format the main content area.

Lets have a card for each of the following: one that shows for the selection of sprites to view, the week you are looking at planning for (this should be a drop down or some sort of selection card), the opponents Team name and Coaches name and team logo (This can be in the same card if formatted to fit symmetrically). The selected weeks opponent's team's stats for Kills, deaths, differential, record and win streak (again all can be on one card spaced symmetrically within the card). I would also like it to show what mons are tera captains on the opposing team, with some sort of denotation of that mon, or the mons, that are a tera captain (maybe a small star next to their name?). I would like to also have a card to show the opponent's current league standing and their divisional ranking.

Below the cards formatted to the upper part of the page in the main content area, i would like to have a damage calculator implemented that pulls only the pokemon from each team for the specific weeks planning, into its search query to be planned for. This needs to run through Simeon and approved by him before we take any action.

I would also like to be able to save these "weekly battle plans" with some sort of cache that is specific to my login. This save feature needs to be able to be used and utilized for other users that have the "Coach" roles, but not shared between users.




ChatGPT6:11 PM
Got it Matt — this is a very clear and well-scoped product request, and it fits cleanly into the ecosystem you, Simeon, and the MCP work have already laid out. I’ll respond in two parallel lenses as requested:

League / product intent (Matt-facing): does this meet league needs, how it should feel to coaches, and what data is authoritative

Technical / implementation intent (Simeon-facing): data contracts, architecture, risks, and approval points

I’ll take a first‑principles approach, starting from what problem this page solves, then translating that into UI structure, data model, permissions, and integration boundaries.

1. First‑Principles Framing
What problem is this page solving?
This page is not standings and not drafting.

It is a weekly opponent intelligence + planning workspace.

A coach should be able to:

Select a week

Instantly understand who they are playing

Instantly understand how dangerous that opponent is

Instantly understand what Pokémon and mechanics matter

Plan damage calcs only for relevant Pokémon

Save those plans privately for that matchup

That framing is important, because it dictates:

What data is read-only

What data is user-authored

What is cached vs recomputed

What must be consistent with league rules

Your request aligns extremely well with this framing.

2. Sidebar & Navigation Placement
Rename
Current: “My Matches”

Future: “Weekly Matches” ✅ (good call, clearer league language)

Navigation semantics
Sidebar entry opens a single planning workspace

The week selector drives all downstream content

This avoids fragmenting context across pages.

3. Page Layout: Card-Based Top Section
Your card breakdown is correct. I’ll formalize it into a canonical card stack, with each card having a single responsibility.

Card A — Week & View Configuration (Control Card)
Purpose: Establish context

Contents

Week selector (dropdown)

Defaults to current week

Only weeks where the coach has a scheduled match

Sprite view selector

Likely: Gen sprites, animated/static, alt art later

Why this matters

This is the root state for the page

Everything else subscribes to this selection

Technical note (Simeon)

This is pure UI state

No league logic beyond “what week am I in”

Card B — Opponent Identity Card
Purpose: Humanize the matchup

Contents

Opponent Team Name

Opponent Coach Name

Team Logo

Notes

This should feel immediate and visual

This card anchors the rest emotionally (“I’m playing them”)

Data source

matches table (week → home/away → team_id)

teams + users join

Card C — Opponent Performance Snapshot
Purpose: Competitive threat assessment

Contents (all from same snapshot)

Record (W–L)

Win streak (active)

Kills

Deaths

Differential

Important league detail

These must reflect current state as of that week

Not season-end projections

League correctness

This directly mirrors what you already track in Sheets

No new logic introduced, just surfaced

Technical note

Should be backed by a materialized or cached aggregate

Do not recompute from raw matches on every page load

Card D — Opponent Tera Captains
Purpose: Reveal strategic constraints

Contents

List of opponent Pokémon

Visual denotation (⭐ or icon) for Tera Captain(s)

Why this is critical

Tera captains are rule-based power multipliers

They materially affect planning and damage calcs

League correctness

This must be authoritative

If the league designates captains at roster lock, this should be immutable

Technical note

This should come from a team_roster metadata field

Not inferred dynamically

Card E — Standings & Division Context
Purpose: Macro stakes awareness

Contents

Current league standing (overall rank)

Division rank

League correctness

Must respect:

Conference structure

Division ordering

Your defined ranking comparator (wins → losses → diff → H2H → streak → SoS → alpha)

This card implicitly validates that the app ranking logic matches Matt’s league logic, which is good pressure.

4. Damage Calculator (Lower Main Section)
This is the most sensitive and important part.

Functional Requirement (Matt)
“Pulls only the Pokémon from each team for the specific week’s planning”

That requirement is excellent and correct.

What this means conceptually
The calculator is scoped, not global

No irrelevant Pokémon appear

Coaches plan this match, not hypotheticals

Inputs
Team A Pokémon (coach)

Team B Pokémon (opponent)

Tera captain flags

Likely later: items, EVs, natures (manual entry)

Approval Boundary (Simeon)
You explicitly said:

“This needs to run through Simeon and approved by him before we take any action.”

Correct — because this introduces:

External logic engines

Potential IP / licensing considerations

Performance considerations

Trust boundaries (calc correctness)

Recommended approach (high-level)
Treat damage calc as a pluggable service

UI calls an internal adapter

Adapter may:

Call a trusted external calc

Or run a sandboxed internal engine

Nothing here violates MCP principles — this is not a tool that mutates state.

5. Weekly Battle Plan Saving (Per-User Cache)
This is a very strong product feature and often overlooked.

Functional Requirement
Coaches can save battle plans

Plans are:

Scoped to user

Scoped to week

Scoped to match

Not shared between coaches

This is exactly right.

Conceptual Model
Think of a battle plan as:

“A user-authored notebook attached to a match-week”

Contents may include
Notes

Selected calcs

Hypotheses

Reminders

Maybe later: team sheets or predicted leads

Data Model (High-Level)
weekly_battle_plans
- id
- user_id
- season_id
- week
- match_id
- payload (JSON)
- updated_at
Key properties

user_id is mandatory → privacy guaranteed

No cross-user reads unless admin override

Payload is flexible (future-proof)

Permissions
Role: Coach

Read/write own plans

Role: Admin

Optional read-only for moderation

No coach can ever read another coach’s plan

This aligns perfectly with league trust expectations.

6. Alignment Summary
What’s Fully On Track ✅
Page purpose is correct

Card breakdown is clean and composable

Data requested already exists in league logic

Tera captain emphasis is correct

Scoped damage calc is the right UX

Per-user cached plans is the correct privacy model

What Needs Explicit Coordination ⚠️
Damage calculator engine

Must be approved by Simeon

Must be deterministic and explainable

Standings source of truth

Must match Matt’s ranking comparator exactly

Any mismatch will be immediately noticed

Performance

Aggregates should be cached/materialized

Not recomputed per render

What I Would Add (Optional, Future)
Not requested, but natural extensions:

“Previous matchup results” (if rematches occur)

“Opponent most-used Pokémon” (later seasons)

“Export plan” (PDF / image for offline prep)

None of these conflict with your current request.

7. Final Verdict
From the League Manager perspective (Matt)
✅ This feature:

Reflects how coaches actually prepare

Respects league rules

Adds competitive depth without adding noise

Feels professional and intentional

From the Dev / Architecture perspective (Simeon)
✅ This feature:

Cleanly separates read-only league data from user-authored data

Introduces no unsafe mutations

Can be built incrementally

Fits MCP + Supabase + role-based access cleanly

If you want, next steps I can do without touching code:

Produce a wireframe-level layout spec

Produce a data contract for each card

Produce a checklist Simeon can sign off on before implementation

Just say the word.