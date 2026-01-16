Short answer:The core draft data (who actually picked which Pokémon in which round) lives on the Master Data Sheet, and the player pool + point values come from Draft Board (which itself pulls from Pokédex).
More specifically:
Draft pool & costs:
The Draft Board sheet is where the available Pokémon by point tier are built.
All those point buckets (e.g. “20 Points”, “19 Points”, … “1 Point”) in Draft Board are filled via formulas from Pokédex (columns like J/M/P/S/… pointing to 'Pokédex'!$P:$N:$O).
So if you’re asking “where do the options and point values for drafting come from?” → Draft Board (sourced from Pokédex).
Who drafted what (actual picks):
On Master Data Sheet, the “Draft Results (20 Team Draft)” blocks around A92:L120 are the main structured record of picks by round and team.
Those results are echoed elsewhere:
Draft Board!BS5:BS pulls the drafted list directly from Master Data Sheet ranges (e.g. {'Master Data Sheet'!B93:B103; ... ; 'Master Data Sheet'!K108:K118}), and uses BT/BU to flag them as drafted and track points left.
Data!AX143:AZ155 (“Season 6 Draft”) also pulls draft pairs from Master Data Sheet via a formula like ={'Master Data Sheet'!A552:T561}.
So if you’re asking “where does everything else learn what was picked?” → they reference the draft grids on Master Data Sheet and the drafted list in Draft Board!BS:BT.
In one line: the main drafting information is defined by the draft result tables on Master Data Sheet, while Draft Board (fed by Pokédex) defines the draftable pool and tracks what was taken.


Here’s a full, first‑principles walkthrough of how drafting and free agency work in this workbook, how information flows between sheets, and how it could be improved.
1. Core building blocks (first principles)
From a system perspective, you have:
A Pokémon master list with metadata
PokédexContains every Pokémon, its name, tier/points, and various attributes.This is the single source of truth for “what exists” and “how many points it costs.”
A draft pool and live draft state
Draft BoardUses Pokédex to:
Group Pokémon into point buckets (20 points, 19 points, …, 1 point).
Mark which Pokémon are banned, Tera banned, or available.
Track which Pokémon have been drafted and how many points a coach has left.
Teams and schedule / results engine
Team 1 … Team 20Each team sheet contains:
The team’s drafted roster.
Per‑match and per‑Pokémon stats (kills, deaths, appearances, etc.).
DataAggregates all matches and stats across all teams:
Regular season and playoff match results.
Team records and strength of schedule.
Season stats per team and per Pokémon.
Master Data SheetA “dashboard + logic hub” that:
Shows draft results by round and team.
Generates league standings, divisional standings, playoff brackets.
Builds weekly and seasonal views by pulling from Data and team sheets.
League structure / constraints
RulesHuman‑readable specification of how many points, roster size, etc.
DivisionsDefines conferences/divisions and feeds some strength‑of‑schedule and points‑left logic.
From first principles:
Pokémon and costs live in Pokédex.
Draft Board = dynamic catalog + state of which Pokémon are still available.
Teams = where the roster and on‑field results live.
Data & Master Data Sheet = aggregate and visualize what happened.
2. How the draft works, step by step
2.1 Creating the draft pool
Source: PokédexConsumer: Draft Board
On Draft Board, each points section (e.g. 20 Points, 19 Points, …) works like this:
The headers in row 3 define the point tier:
I3 = “20 Points”
L3 = “19 Points”
O3 = “18 Points”
… down to BN3 = “1 Point”.
Under each header, there is a pair of columns:
First column: the point label/lookup helper (e.g. I, L, O, …).
Second column: the Pokémon names (e.g. J, M, P, …).
For example:
J5:J pulls all Pokémon that cost “20 Points” from Pokédex, filtered by that point value:
Formula looks up in 'Pokédex'!$P$3:$P with a condition on 'Pokédex'!$M$3:$M (the points).
I5:I uses VLOOKUP into Pokédex to show the point value / tier for each name (and optionally adjust if drafted).
In plain terms:
“For each points bucket, filter Pokédex for all Pokémon with that point value, and list them as draftable.”
So from a first‑principles view:
Universe = all Pokémon in Pokédex.
Draft Board = “view” of that universe, partitioned by cost.
2.2 Tracking what’s drafted
At the bottom/right of Draft Board:
BS5:BS = a linear list of drafted Pokémon, coming from Master Data Sheet:
Formula in BS5 pulls multiple ranges from Master Data Sheet, e.g.={'Master Data Sheet'!B93:B103; ...; 'Master Data Sheet'!K108:K118}→ That means the draft result table on Master Data Sheet is treated as the canonical list of picks.
BT5:BT is typically a flag (e.g. "X") indicating “this Pokémon is drafted.”
BU5 (and below) uses a formula referencing Divisions!H19 for points left:
BU5 = Divisions!H19 (example in your snapshot shows -33, so that’s probably test data).
That is meant to track a coach’s remaining budget after picks.
Elsewhere in the board:
For each available Pokémon list (e.g. J5:J, M5:M, P5:P, etc.) the point column before it:
Uses a VLOOKUP into Pokédex for cost, but conditional on whether the Pokémon is in BS (drafted).
If count of that name in BS5:BS > 0, then it uses an alternate column (e.g. a “drafted cost” or some marker).
Effectively:
“If this Pokémon appears in the drafted list, treat it as drafted (e.g. greyed, no longer really available).”
So the drafting state is:
Master source of picks = Master Data Sheet draft grids.
Draft Board:
Reads that list.
Marks those Pokémon as drafted.
Updates points left via Divisions.
2.3 Recording the draft results
In Master Data Sheet, you have two mirrored blocks:
A92:L105 labeled “Draft Results (20 Team Draft)”
A107:L120 another “Draft Results (20 Team Draft)”
Both blocks:
Have a Round column (A93:A and A108:A) listing 1, 2, 3, etc.
Have many team columns (B to K):
For A92:L105, B93:K96 each correspond to a team’s Pokémon for that round.
For A107:L120, B108:K111 appear to be a second set (e.g. snake/alt draft, or 2nd half of teams).
These cells are not manually typed; they are formulas pointing to a Schedule block at the bottom:
Example:
B93 = B491
C93 = C491
D93 = D491
etc.
Then down at A489:U501 labeled “Schedule”:
B491, C491, D491, … pull the drafted Pokémon per round per team from an even deeper set of ranges (around B649:B667, etc.), which:
Ultimately depend on user inputs in team sheets (rosters) or a manual draft log.
And the coach/team names from row 490 (these reference B104, C104, etc. which are likely a mapping of team numbers to coaches).
In practice:
You (or a script/human) enter draft picks into a structured area (often per team).
The Schedule block (A489:U501) organizes picks by week / slot / team.
The Draft Results blocks (A92:L120) read from that schedule and present:
“Round 1 – Team 1 took X, Team 2 took Y, …”
Draft Board!BS5:BS then reads these pick names and marks them as drafted.
First‑principles view:Drafting is a transformation from raw inputs (team picks) → a normalized table of (round, team, Pokémon) → a “taken” list used by the Draft Board.
3. How free agency works
There isn’t a single “Free Agency” sheet named that way, but you can infer the mechanics from how data flows.
3.1 What is a free agent in this system?
From first principles:
A free agent is a Pokémon that:
Exists in Pokédex.
Has a valid point value.
Does not appear in the drafted list Draft Board!BS5:BS.
And is not on a team roster in Team 1–Team 20 (practically the same condition, because rosters are what feed Master Data Sheet and from there BS5:BS).
Because Draft Board divides all Pokémon by cost and marks drafted ones, you effectively get:
“Everything still showing as available in the appropriate points section” = free agents.
3.2 Process of making a free‑agent move (conceptual)
A free‑agent move would conceptually be:
Coach drops a Pokémon from their team:
On their team sheet (e.g. Team 1), they either:
Remove it from their roster slots, or
Move it to an “unused” area.
That removal eventually propagates up:
The team sheet no longer counts that Pokémon in the season stats blocks.
The Data sheet, which aggregates from team sheets, no longer sees it in the “current roster” contexts.
The draft result lists in Master Data Sheet may or may not remove it (depending on whether you model free agency as separate from draft results; in many leagues, the draft result is historical and doesn’t change).
Coach adds a new Pokémon:
They pick a valid free agent from Draft Board (i.e. not in Draft Board!BS and within remaining points).
They add it to a slot on their team sheet (or FA move table).
Any “FA moves” area (like an “Extra F/A Moves” section in Data) is updated to log this.
The system updates:
Team’s budget (Draft Board!BU and/or Divisions update).
Team’s roster (team sheet).
League stats (kills/appearances in Data and Master Data Sheet).
Available pool (if you choose, you could also add FA signings into Draft Board!BS so they display as “drafted/signed”).
In your current layout, FA is implied rather than fully formalized:
There is text like “Extra F/A Moves for Uploading Videos” on Data (around X95), suggesting:
You intend to log additional free‑agency moves here.
However, most of the availability logic is still driven by:
Draft Board!BS (drafted list from initial draft), and
How you manually treat rosters on team sheets.
So today, FA works procedurally:
You, as commissioner, update team rosters and possibly the “drafted” list when an FA pickup happens.
The formulas will then treat that Pokémon as belonging to a team and (if you extend BS5:BS to include FA pickups) as no longer available.
A more explicit FA system would:
Have a Free Agency Log table listing:
Date, Team, In Pokémon, Out Pokémon, Net point change.
Feed that into:
Points remaining.
Availability (adding FA pickups to the Draft Board!BS list).
4. How things correlate across sheets (concrete examples)
Here are some end‑to‑end examples showing how one event echoes across the file.
Example 1: A team drafts Mewtwo in Round 1
Assume:
Team “Grand Rapids” drafts Mewtwo in Round 1.
Flow:
Team sheet (e.g. Team 1)
You put “Mewtwo” into some draft slot (say Round 1 pick).
That sheet usually has named areas (like Z14:AA16 for top performers, etc.) which reference rostered Pokémon.
Master Data Sheet – Draft Results
That roster slot is fed into the Schedule block at A489:U501:
For the line corresponding to Gran Rapids’s round/pick, some cell (say B649) becomes “Mewtwo”.
B491 = B649, and B93 = B491.So B93 in the “Draft Results (20 Team Draft)” block shows:
Round 1, Team (Grand Rapids) → “Mewtwo”.
From B93:B103 etc., all drafted Pokémon are read into other logic.
Draft Board
Draft Board!BS5:BS pulls those names from Master Data Sheet!B93:B103, C93:C103, …:
One of those rows is “Mewtwo”.
Any point bucket that lists “Mewtwo” (in this case, M5:M for 19 points or J5:J for 20, depending on your Pokédex data) now:
Sees “Mewtwo” in BS5:BS.
Marks its cost differently or uses COUNTIF to treat it as drafted (e.g. not eligible as a free agent).
Draft Board!BU5 (points left for the coach whose Pokémon list is in BS5:BS) may adjust the team’s remaining budget (if wired to do so).
Stats / Standings
On Data, “Mewtwo”:
Appears in season stats ranges if it gets kills in matches.
Contributes to:
Master Data Sheet!League MVP Race (B201:E...) via aggregated kills.
Season Stats per Team for Pokémon (Q201:T... on Master Data Sheet, CB:CH on Data).
Result:One line of input (“Grand Rapids drafts Mewtwo”) leads to:
Draft result tables on Master Data Sheet showing the pick.
Draft Board marking Mewtwo as drafted and reducing budget.
Team 1 and global stats eventually tracking Mewtwo’s in‑game performance.
Example 2: Drafted Pokémon showing up in league standings
Suppose “Grand Rapids” drafts a full roster, plays some games, and goes 3–1 with +6 differential.
Flow:
Their wins/losses and differential are computed on the team sheet (per match) and rolled into Data:
Data!AC2 = wins, AD2 = losses, AE2 = differential, AF2 = “Record string”.
Data → Master Data Sheet (league standings)
Master Data Sheet!G201:J223 (League Standings Pre Sort) pulls:
Team names from Data!Z2:Z21.
Record/differential from Data!AF2:AF21.
Strength of schedule from Data!AT2:AT21.
Then higher up:
Master Data Sheet!K45:L65 (Overall League Standings) pulls the sorted league table:
K46 = Data!Z22:Z41 (team names).
L46 = XLOOKUP to get record/differential from Data!BR74:BR93.
Meanwhile, Master Data Sheet!Top Performers (Weekly) and League MVP Race use:
Per‑Pokémon stats from Data!CB:CH.
Those stats are only collected because the Pokémon were on someone’s roster (draft or FA).
Result:Drafted Pokémon → team results → Data aggregate → Master Data Sheet standings and MVP race.
Example 3: How a free‑agent pickup would ripple
Imagine mid‑season, Grand Rapids wants to drop “Kingdra” and pick up “Hydreigon” as a free agent.
Eligibility / availability check
On Draft Board, under the relevant points tier (say “16 Points”), you find a list in something like V5:V.
If “Hydreigon” is not in Draft Board!BS5:BS, it appears as available there, with its correct cost from Pokédex.
Point budget
Current remaining points for Grand Rapids are in Draft Board!BU5 (driven by Divisions!H19 or similar).
You check if dropping Kingdra (cost X) and adding Hydreigon (cost Y) keeps the team within its cap.
Roster change
On Team 1, remove Kingdra from the roster area and insert Hydreigon into an empty slot.
Optionally, append a row to an “Extra F/A Moves” section (e.g. around Data!X95) noting:
Week, Team, Dropped, Added, Cost difference.
System effects
If you also update the “drafted list” (Draft Board!BS) to include Hydreigon and remove Kingdra:
Draft Board will treat Hydreigon as unavailable going forward.
Kingdra will now appear as a free agent in the appropriate tier.
Team stats and Data:
From that point on, Hydreigon will accumulate kills/appearances for Grand Rapids.
Kingdra will no longer appear in active stat pulls (unless you keep historical logs).
Result:Even without an explicit FA sheet, you can implement FA by editing rosters and maintaining the BS drafted list so availability updates.
5. What could be improved?
Here are several concrete improvements to make draft and FA more robust, transparent, and maintainable.
5.1 Make a single, structured Draft Log
Current state:
Draft data is scattered:
Team rosters.
Master Data Sheet!A92:L120.
Master Data Sheet!A489:U501 (“Schedule”).
Draft Board!BS5:BS (linear list of drafted Pokémon).
Improvement:
Create one canonical draft table, for example on Master Data Sheet or a new sheet:
Columns:
Round
Pick # (overall pick)
Team
Coach
Pokémon
Points cost
Source (Draft vs FA, optional)
Then:
Have everything else reference this one table:
Draft Board!BS becomes a simple reference to the Pokémon column.
Draft Results tables pull from it via filtered/sorted queries (by round, by team).
Points left are computed by summing points from this table per team.
Benefits:
One truth for who owns what and when they got it.
Easier to debug when a pick looks wrong.
5.2 Formalize a Free Agency Log
Current state:
Free agency is implied via rosters and maybe an “Extra F/A Moves” annotation.
Availability is tied mostly to draft results, not explicit FA events.
Improvement:
Create a Free Agency Log table:
Columns:
Date
Week
Team
Coach
Pokémon In
Pokémon Out
Points In
Points Out
Net Points Change
Then:
Combine Draft Log + FA Log into an Ownership History table:
At any given time, a Pokémon’s current team is the one from the last row concerning that Pokémon.
Draft Board!BS can be replaced by:
“All Pokémon currently owned (draft or FA)” from Ownership History.
Benefits:
A clear, auditable trail:
You can answer “Who owned Hydreigon in Week 7?” instantly.
Easier cap/budget enforcement.
5.3 Reduce deeply nested, repeated formulas
You have many huge ArrayFormula(IF(OR(...), IF(And(...), ...))) blocks that:
Repeat the same pattern for each playoff round and each seed.
Hard‑code references to Data!Z47:Z66 and AG:AJ etc.
Improvements:
Abstract patterns into helper ranges:
Example: a helper table mapping (Team, Week) → Result (“W” or “L”).
Then, playoff cells can do simple lookups instead of 20 nested IF(AND(....
Where supported, use INDEX/MATCH or XLOOKUP instead of LOOKUP(2,1/(...),range) for clarity.
Consider splitting very long formulas into multiple intermediate helper cells/columns rather than one giant formula.
Benefits:
Much more maintainable and debuggable.
Reduced chance of copy‑paste errors.
5.4 Normalize “team identity” and avoid duplicate team name ranges
Team names appear in many places:
Data!D2:D21, Data!Z2:Z21, Master Data Sheet!H203:H223, etc.
Draft Board!G390:G409 also pulls team names as =Data!D2, =Data!D3, etc.
Improvements:
Centralize team identity to a single “Teams” table:
Columns: Team ID, Team Name, Coach, Division, Conference, Logo URL.
All other sheets reference that table:
Team 1 uses Team ID = 1.
Data uses Team ID references instead of retyping names.
Draft Board uses Team ID as the key for points left, draft results, etc.
Benefits:
Renaming a team becomes easy.
Risk of typos or mismatched names disappears.
5.5 Explicit constraints / validations (to support error‑free drafting)
Right now, constraints (cap, banned Pokémon, Tera bans) live partly:
In text (Rules).
In formulas on Draft Board (banned lists, Tera banned lists).
In your own commissioner judgment.
Improvements:
Use data validation where possible:
Make roster slots a dropdown of allowed Pokémon based on:
Not banned.
Not Tera banned (for Tera slots).
Not already owned beyond limit.
Add check columns in the Draft/FA logs:
IsLegal? = formula that checks points cap, banned lists, type rules, etc.
Add a “Cap Remaining” summary per team that uses the canonical Draft + FA logs.
Benefits:
You see at a glance if a pick/FA move is invalid.
Coaches can self‑serve without breaking rules.
6. Summary
Drafting starts from Pokédex (all Pokémon and costs), which is filtered into point tiers on Draft Board.
Actual picks are stored via structured areas on team sheets and a Schedule block on Master Data Sheet, then surfaced as Draft Results (A92:L120).
Draft Board reads those results into BS5:BS, marks Pokémon as drafted, and helps track points left.
Free agency is currently implicit: you adjust rosters and availability manually; the system treats any Pokémon in the drafted/owned lists as unavailable, and everything else as a free agent.
Major improvements would be to introduce a single Draft Log, a formal FA Log, a unified Ownership History, more normalized team metadata, and simpler, more modular formulas for standings and playoff logic.

