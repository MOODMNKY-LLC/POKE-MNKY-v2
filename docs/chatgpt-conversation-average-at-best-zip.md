Skip to content
Chat history





You said:
can you view the average at best draft league zip ?
ChatGPT said:
Yes — I can view and inspect the Average at Best Draft League ZIP.

I’ve successfully opened and reviewed the archive you uploaded (Average at Best Draft League.zip). Here is a clear breakdown of what it contains and how it is usable going forward.

What’s inside the ZIP
The archive is primarily documentation and planning material, not executable code. It includes two major, high-value analytical documents:

POKE MNKY Ecosystem Services: Comprehensive Analysis

A full server + app architecture reference

Detailed breakdown of:

Docker services (Showdown, PokéAPI, Discord bot, workers)

LAN vs production routing (10.3.0.119 vs Cloudflare)

Supabase schema usage

Integration flows (App ↔ Server ↔ Discord ↔ Showdown)

Effectively serves as a systems architecture bible for the league platform

POKE-MNKY-ECOSYSTEM-ANALYSIS


POKE MNKY v3 – First Principles Comprehensive Report

A state-of-the-project audit with:

Completion percentages (~75% overall)

What is built vs missing

Technical debt inventory

Explicit v3 roadmap broken into phases

Includes:

Page inventory

API route inventory (50+ endpoints)

Database migration summary (48 migrations)

Risk assessment and success metrics

POKE-MNKY-V3-FIRST-PRINCIPLES-R…


What this ZIP is (and is not)
This ZIP is:

A strategic + technical reference

Suitable as:

Internal documentation

Onboarding material for contributors

A baseline for refactors, audits, or rewrites

Source material for generating PRDs, READMEs, or diagrams

This ZIP is NOT:

A runnable project

A codebase snapshot

A replacement for the GitHub repos or Docker directories

How we can use this next (practical options)
Given your current POKE MNKY direction, strong next steps could include:

Extracting actionable tickets

Convert the “What’s Missing” and “v3 Roadmap” sections into:

GitHub Issues

Notion tasks

Linear/Jira tickets

Generating derived artifacts

README.md for the repo

Architecture diagrams (Mermaid)

Environment variable templates

Contributor onboarding guide

Validating reality vs document

Cross-check:

What’s described

What’s actually running on 10.3.0.119

What’s deployed on Vercel

Identify drift

Using it as an AI grounding corpus

Ideal candidate to:

Load into a Supabase vector store

Power a league-specific assistant (POKE MNKY / League MNKY)

Enable “ask the system” queries about architecture and flows

If you want, next I can:

Walk file-by-file in more granular detail

Summarize it into a one-page executive brief

Turn it into tasks or a v3 execution checklist

Or help wire it directly into your app or agent knowledge base

Just tell me which direction you want to go.


Sources
You said:
create a comprehensive detailed and thorough notion database schema with apropriate property types of this document
ChatGPT said:

Thought for 19s
According to a document from your “Average at Best Draft League – Backend Data” export, the core dataset you’re trying to represent in Notion is a Pokémon-centric master table that includes: Dex numbers, sprites, base stats, speed benchmarks (0 / 252 / 252+), full type-effectiveness multipliers, abilities, and role/move tags like hazard setters/removers, clerics, pivots/phasing, and priority. 
Average at Best Draft League - …


Average at Best Draft League - …


Below is a comprehensive Notion database schema (with property types, relations, and recommended formulas/rollups) that cleanly models that document while also making it usable for draft-league operations.

1) Database: Pokémon Catalog (Master / Draft Pool Source of Truth)
Purpose: One row per Pokémon form eligible in the league (e.g., “Linoone-Galar”, “Gardevoir-Mega”), holding all “backend data” fields.

Core identity

Name (Title) — display name (include form suffix)

Species Name (Text) — base species (e.g., “Gardevoir”)

Form (Select) — None / Alolan / Galarian / Hisuian / Mega / etc.

Pokédex # (Number) — from “Pokédex Number” column
Average at Best Draft League - …


Internal ID / Slug (Text) — stable key (e.g., gardevoir-mega)

Eligible (Checkbox) — league legality toggle

Typing

Type 1 (Select) — 18-type enum

Type 2 (Select) — allow empty

Types (Multi-select) — optional convenience mirror

Points / tiering

Draft Points (Number) — “Pts.”/points value when present
Average at Best Draft League - …


Tier (Select) — S/A/B/C/D (or your league’s tiers)

Ban / Restriction Notes (Text)

Sprites / assets

Sprite (Primary) (Files & media) — or URL if you prefer

BW Sprite URL (URL) — column referenced in doc header
Average at Best Draft League - …


Serebii Sprite URL (URL)
Average at Best Draft League - …


Home Sprite URL (URL)
Average at Best Draft League - …


Base stats

HP (Number)
Average at Best Draft League - …


Atk (Number)

Def (Number)

SpA (Number)

SpD (Number)

Spe (Number)

BST (Formula)
prop("HP")+prop("Atk")+prop("Def")+prop("SpA")+prop("SpD")+prop("Spe")

Speed benchmarks (as seen in doc)

Speed @ 0 EV (Number)
Average at Best Draft League - …


Speed @ 252 EV (Number)

Speed @ 252+ (Number)

Abilities

Ability 1 (Select)
Average at Best Draft League - …


Ability 2 (Select)

Hidden Ability (Select)

Abilities (All) (Multi-select) — optional convenience mirror

Type-effectiveness multipliers (18 numbers)
Create 18 Number properties (allow decimals like 0, 0.25, 0.5, 1, 2, 4) matching the doc’s type chart columns:

vs Normal (Number)

vs Fire (Number)

…

vs Fairy (Number)
Average at Best Draft League - …


Derived defensive profile (recommended)

# Weaknesses (≥2x) (Formula) — counts how many vs X >= 2

# Resists (≤0.5x) (Formula)

# Immunities (=0) (Formula)

(These formulas are long in Notion; if you want, I can provide copy-paste formula blocks.)

Role / move tags (document-derived)
The header suggests role groupings such as:

Hazard Setters

Hazard Removers

Clerics

Pivots & Phasing

Priority
…and sometimes the move associated with the role (e.g., “Toxic Spikes”, “Volt Switch”, “U-turn”).
Average at Best Draft League - …


Model this properly using relations:

Role Tags (Relation → Role Tags database; many-to-many)

Signature Utility Moves (Relation → Moves database; many-to-many) (optional but clean)

External identity fields (document shows these)

GitHub Name (Text)
Average at Best Draft League - …


Smogon Name (Text)
Average at Best Draft League - …


PokemonDB Name (Text)
Average at Best Draft League - …


Smogon URL (URL)

PokemonDB URL (URL)

2) Database: Role Tags (Competitive Utility Taxonomy)
Purpose: Normalizes the “Hazard Setters / Removers / Clerics / Pivots & Phasing / Priority” blocks into structured tags.

Properties

Role Tag (Title) — e.g., Hazard Setter: Spikes, Pivot: U-turn

Category (Select) — Hazard Setter / Hazard Remover / Cleric / Pivot & Phasing / Priority / Other
Average at Best Draft League - …


Move (Relation → Moves) — optional; supports reuse

Notes (Text)

Pokémon (Relation → Pokémon Catalog) — back-reference

Count (Pokémon) (Rollup) — rollup count of related Pokémon

3) Database: Moves (Optional but recommended)
Purpose: Gives you one canonical record per move so role tags and analysis remain consistent.

Properties

Move Name (Title)

Category (Select) — Status / Physical / Special

Type (Select)

Power (Number)

Accuracy (Number)

PP (Number)

Tags (Multi-select) — Hazard / Removal / Pivot / Priority / Recovery / Cleric / Phasing

Pokémon (Utility Association) (Relation → Pokémon Catalog)

Role Tags (Relation → Role Tags)

4) Database: Coaches (League People Layer)
Your document indicates a coach identity mapping fieldset including “GitHub Name / Smogon Name …”.
Average at Best Draft League - …


Properties

Coach (Title)

Discord Handle (Text)

GitHub Name (Text)
Average at Best Draft League - …


Smogon Name (Text)
Average at Best Draft League - …


Showdown Username (Text)

Timezone (Select)

Active (Checkbox)

Teams (Relation → Teams)

Notes (Text)

5) Database: Teams
Properties

Team Name (Title)

Coach (Relation → Coaches) (one coach to one team per season, or many if you reuse franchise concept)

Franchise Key (Text) — stable identifier

Logo (Files & media)

Home Stadium / Theme (Text)

Seasons (Relation → Seasons)

Current Season (Relation → Seasons) (optional)

Roster Slots (Number) — e.g., 8–10

Draft Budget (Number) — e.g., 120

6) Database: Seasons (and League Config)
Properties

Season (Title) — e.g., “AAB S6 (Gen 9 Draft)”

Generation / Format (Select) — Gen9 / NatDex / etc.

Start Date (Date)

End Date (Date)

Draft Points Budget (Number)

Roster Size Min (Number)

Roster Size Max (Number)

Teams (Season Participants) (Relation → Teams)

Draft Pool Snapshot (Relation → Draft Pools) (see next DB)

7) Database: Draft Pools (Season-specific eligibility)
Purpose: A season may limit forms/banlist/tier set. This DB lets you version your pool.

Properties

Draft Pool (Title) — “S6 Pool v1”

Season (Relation → Seasons)

Pokémon Included (Relation → Pokémon Catalog) (many)

Banned Pokémon (Relation → Pokémon Catalog) (many)

Rules Notes (Text)

Locked (Checkbox)

8) Database: Draft Picks (Roster Transactions)
Properties

Pick (Title) — e.g., “R3 – Coach X – Dragalge”

Season (Relation → Seasons)

Team (Relation → Teams)

Coach (Rollup from Team → Coach) (or direct relation)

Pokémon (Relation → Pokémon Catalog)

Points at Draft (Rollup from Pokémon → Draft Points) (or number snapshot)

Acquisition Type (Select) — Draft / Free Agency / Trade / Waiver

Draft Round (Number)

Pick # (Number)

Status (Select) — Active / Dropped / Traded Away / Injured Reserve (if used)

Start Date (Date)

End Date (Date)

Team totals (recommended rollups on Teams)

Roster (Active Picks) (Relation → Draft Picks filtered view)

Total Points (Roster) (Rollup sum of Points)

Slots Used (Rollup count)

Slots Remaining (Formula)

9) Database: Matches
Properties

Match (Title) — “W4: Team A vs Team B”

Season (Relation → Seasons)

Week (Number)

Home Team (Relation → Teams)

Away Team (Relation → Teams)

Result (Select) — Home Win / Away Win / Forfeit / No Contest

Score (Text) — e.g., “5–1” or “2–0”

Replay URL (URL)

Showdown Room ID (Text)

Scheduled Time (Date)

Completed Time (Date)

Notes (Text)

10) Database: Standings (Optional; can be view-based)
If you prefer a dedicated DB:

Properties

Standing Row (Title) — “S6 – Team A”

Season (Relation → Seasons)

Team (Relation → Teams)

Wins (Number) (or rollup from Matches)

Losses (Number)

Differential (Number)

Points For / Against (Number)

Playoff Seed (Number)

Recommended Notion Views (practical, high-signal)
Pokémon Catalog

“By Points (Tiering)”

“By Type”

“Role: Hazard Setters”

“Role: Pivots”

“Defensive Profile (Weakness Count)”

Season Ops

“Draft Board (Picks by Round)”

“Team Rosters (Active)”

“Budget Watch (Teams over cap)”

“Weekly Matchups”

Implementation notes (so this stays sane)
Store the heavy stat/type chart in Pokémon Catalog, but store roles as relations (Role Tags / Moves). That matches the document while keeping your system extensible.

Consider making Draft Points a “snapshot” on Draft Pick (Number) even if you roll up from Pokémon—this protects history if points change between seasons.

If you ever want to auto-sync from PokéAPI/Showdown later, your stable keys should be Slug + Dex # + Form, not the display name.

If you want, I can also provide:

A Notion “create database” property manifest (JSON-like mapping you can follow manually),

The exact long Notion formulas for weakness/resist/immunity counts,

A recommended import order (so relations resolve cleanly on first import).


Sources
You said:
all of the above please
ChatGPT said:
Understood. Below you’ll find, in one place:

a Notion “create database” property manifest (human-readable, JSON-like mapping you can follow when building DBs)

copy/paste Notion formulas (including weakness/resist/immunity counts and other useful derived fields)

a recommended import/build order to avoid broken relations and to keep the system maintainable

1) Notion database property manifest (schema blueprint)
A) Database: Pokemon Catalog
Purpose: Master index of Pokémon/forms with stats, speed benchmarks, abilities, points, and type-effectiveness multipliers.

{
  "database": "Pokemon Catalog",
  "primary": { "Name": "title" },
  "properties": {
    "Species Name": { "type": "rich_text" },
    "Form": {
      "type": "select",
      "options": ["None", "Alolan", "Galarian", "Hisuian", "Paldean", "Mega", "Primal", "Other"]
    },
    "Pokedex #": { "type": "number", "format": "number" },
    "Internal Slug": { "type": "rich_text" },
    "Eligible": { "type": "checkbox" },

    "Type 1": {
      "type": "select",
      "options": ["Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"]
    },
    "Type 2": {
      "type": "select",
      "options": ["(none)","Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"]
    },

    "Draft Points": { "type": "number", "format": "number" },
    "Tier": { "type": "select", "options": ["S","A","B","C","D","E","F","N/A"] },
    "Ban / Restriction Notes": { "type": "rich_text" },

    "Sprite (Primary)": { "type": "files" },
    "BW Sprite URL": { "type": "url" },
    "Serebii Sprite URL": { "type": "url" },
    "Home Sprite URL": { "type": "url" },

    "HP": { "type": "number" },
    "Atk": { "type": "number" },
    "Def": { "type": "number" },
    "SpA": { "type": "number" },
    "SpD": { "type": "number" },
    "Spe": { "type": "number" },

    "Speed @ 0 EV": { "type": "number" },
    "Speed @ 252 EV": { "type": "number" },
    "Speed @ 252+": { "type": "number" },

    "Ability 1": { "type": "select" },
    "Ability 2": { "type": "select" },
    "Hidden Ability": { "type": "select" },

    "vs Normal": { "type": "number" },
    "vs Fire": { "type": "number" },
    "vs Water": { "type": "number" },
    "vs Electric": { "type": "number" },
    "vs Grass": { "type": "number" },
    "vs Ice": { "type": "number" },
    "vs Fighting": { "type": "number" },
    "vs Poison": { "type": "number" },
    "vs Ground": { "type": "number" },
    "vs Flying": { "type": "number" },
    "vs Psychic": { "type": "number" },
    "vs Bug": { "type": "number" },
    "vs Rock": { "type": "number" },
    "vs Ghost": { "type": "number" },
    "vs Dragon": { "type": "number" },
    "vs Dark": { "type": "number" },
    "vs Steel": { "type": "number" },
    "vs Fairy": { "type": "number" },

    "Role Tags": { "type": "relation", "to": "Role Tags", "relation_type": "many_to_many" },
    "Signature Utility Moves": { "type": "relation", "to": "Moves", "relation_type": "many_to_many" },

    "GitHub Name": { "type": "rich_text" },
    "Smogon Name": { "type": "rich_text" },
    "PokemonDB Name": { "type": "rich_text" },
    "Smogon URL": { "type": "url" },
    "PokemonDB URL": { "type": "url" },

    "BST": { "type": "formula" },
    "# Weaknesses (>=2x)": { "type": "formula" },
    "# Resists (<=0.5x)": { "type": "formula" },
    "# Immunities (=0x)": { "type": "formula" },
    "Defensive Profile": { "type": "formula" }
  }
}
B) Database: Role Tags
Purpose: Normalized roles such as hazards, removal, cleric, pivot/phasing, priority (and optionally which move grants that role).

{
  "database": "Role Tags",
  "primary": { "Role Tag": "title" },
  "properties": {
    "Category": {
      "type": "select",
      "options": ["Hazard Setter","Hazard Remover","Cleric","Pivot","Phasing","Priority","Recovery","Status Utility","Other"]
    },
    "Move": { "type": "relation", "to": "Moves", "relation_type": "many_to_one_optional" },
    "Notes": { "type": "rich_text" },
    "Pokemon": { "type": "relation", "to": "Pokemon Catalog", "relation_type": "many_to_many" },
    "Count (Pokemon)": { "type": "rollup", "relation": "Pokemon", "property": "Name", "aggregation": "count" }
  }
}
C) Database: Moves (optional but recommended)
{
  "database": "Moves",
  "primary": { "Move Name": "title" },
  "properties": {
    "Type": {
      "type": "select",
      "options": ["Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"]
    },
    "Category": { "type": "select", "options": ["Physical","Special","Status"] },
    "Power": { "type": "number" },
    "Accuracy": { "type": "number" },
    "PP": { "type": "number" },
    "Priority": { "type": "number" },
    "Tags": {
      "type": "multi_select",
      "options": ["Hazard","Removal","Pivot","Priority","Recovery","Cleric","Phasing","Screens","Status"]
    },
    "Pokemon (Utility Association)": { "type": "relation", "to": "Pokemon Catalog", "relation_type": "many_to_many" }
  }
}
D) Database: Coaches
{
  "database": "Coaches",
  "primary": { "Coach": "title" },
  "properties": {
    "Discord Handle": { "type": "rich_text" },
    "Showdown Username": { "type": "rich_text" },
    "GitHub Name": { "type": "rich_text" },
    "Smogon Name": { "type": "rich_text" },
    "Timezone": { "type": "select" },
    "Active": { "type": "checkbox" },
    "Teams": { "type": "relation", "to": "Teams", "relation_type": "one_to_many_or_many_to_many" },
    "Notes": { "type": "rich_text" }
  }
}
E) Database: Teams
{
  "database": "Teams",
  "primary": { "Team Name": "title" },
  "properties": {
    "Coach": { "type": "relation", "to": "Coaches", "relation_type": "many_to_one" },
    "Franchise Key": { "type": "rich_text" },
    "Logo": { "type": "files" },
    "Theme": { "type": "rich_text" },
    "Seasons": { "type": "relation", "to": "Seasons", "relation_type": "many_to_many" },

    "Draft Budget": { "type": "number" },
    "Roster Size Min": { "type": "number" },
    "Roster Size Max": { "type": "number" },

    "Draft Picks": { "type": "relation", "to": "Draft Picks", "relation_type": "one_to_many" },
    "Active Picks (Rollup Count)": { "type": "rollup" },
    "Total Points (Active)": { "type": "rollup" },
    "Slots Remaining": { "type": "formula" },
    "Budget Remaining": { "type": "formula" }
  }
}
F) Database: Seasons
{
  "database": "Seasons",
  "primary": { "Season": "title" },
  "properties": {
    "Generation / Format": { "type": "select" },
    "Start Date": { "type": "date" },
    "End Date": { "type": "date" },

    "Draft Points Budget": { "type": "number" },
    "Roster Size Min": { "type": "number" },
    "Roster Size Max": { "type": "number" },

    "Teams": { "type": "relation", "to": "Teams", "relation_type": "many_to_many" },
    "Draft Pool Snapshot": { "type": "relation", "to": "Draft Pools", "relation_type": "one_to_one_optional" },
    "Matches": { "type": "relation", "to": "Matches", "relation_type": "one_to_many" }
  }
}
G) Database: Draft Pools
{
  "database": "Draft Pools",
  "primary": { "Draft Pool": "title" },
  "properties": {
    "Season": { "type": "relation", "to": "Seasons", "relation_type": "many_to_one" },
    "Pokemon Included": { "type": "relation", "to": "Pokemon Catalog", "relation_type": "many_to_many" },
    "Banned Pokemon": { "type": "relation", "to": "Pokemon Catalog", "relation_type": "many_to_many" },
    "Rules Notes": { "type": "rich_text" },
    "Locked": { "type": "checkbox" }
  }
}
H) Database: Draft Picks
{
  "database": "Draft Picks",
  "primary": { "Pick": "title" },
  "properties": {
    "Season": { "type": "relation", "to": "Seasons", "relation_type": "many_to_one" },
    "Team": { "type": "relation", "to": "Teams", "relation_type": "many_to_one" },
    "Pokemon": { "type": "relation", "to": "Pokemon Catalog", "relation_type": "many_to_one" },

    "Acquisition Type": { "type": "select", "options": ["Draft","Free Agency","Trade","Waiver"] },
    "Draft Round": { "type": "number" },
    "Pick #": { "type": "number" },

    "Status": { "type": "select", "options": ["Active","Dropped","Traded Away","IR","Banned"] },
    "Start Date": { "type": "date" },
    "End Date": { "type": "date" },

    "Points at Acquisition (Snapshot)": { "type": "number" },
    "Points (Rollup Current)": { "type": "rollup" }
  }
}
I) Database: Matches (league ops)
{
  "database": "Matches",
  "primary": { "Match": "title" },
  "properties": {
    "Season": { "type": "relation", "to": "Seasons", "relation_type": "many_to_one" },
    "Week": { "type": "number" },
    "Home Team": { "type": "relation", "to": "Teams", "relation_type": "many_to_one" },
    "Away Team": { "type": "relation", "to": "Teams", "relation_type": "many_to_one" },

    "Result": { "type": "select", "options": ["Home Win","Away Win","Forfeit","No Contest","Pending"] },
    "Score": { "type": "rich_text" },
    "Replay URL": { "type": "url" },

    "Showdown Room ID": { "type": "rich_text" },
    "Scheduled Time": { "type": "date" },
    "Completed Time": { "type": "date" },
    "Notes": { "type": "rich_text" }
  }
}
2) Copy/paste Notion formulas (ready to use)
A) BST formula (Pokemon Catalog)
prop("HP") + prop("Atk") + prop("Def") + prop("SpA") + prop("SpD") + prop("Spe")
B) Weakness / Resist / Immunity counts (Pokemon Catalog)
1) # Weaknesses (>=2x)
Counts all matchups with multiplier ≥ 2.

toNumber(prop("vs Normal") >= 2) +
toNumber(prop("vs Fire") >= 2) +
toNumber(prop("vs Water") >= 2) +
toNumber(prop("vs Electric") >= 2) +
toNumber(prop("vs Grass") >= 2) +
toNumber(prop("vs Ice") >= 2) +
toNumber(prop("vs Fighting") >= 2) +
toNumber(prop("vs Poison") >= 2) +
toNumber(prop("vs Ground") >= 2) +
toNumber(prop("vs Flying") >= 2) +
toNumber(prop("vs Psychic") >= 2) +
toNumber(prop("vs Bug") >= 2) +
toNumber(prop("vs Rock") >= 2) +
toNumber(prop("vs Ghost") >= 2) +
toNumber(prop("vs Dragon") >= 2) +
toNumber(prop("vs Dark") >= 2) +
toNumber(prop("vs Steel") >= 2) +
toNumber(prop("vs Fairy") >= 2)
2) # Resists (<=0.5x)
Counts all matchups with multiplier ≤ 0.5 but > 0 (so immunities don’t inflate resists).

toNumber(prop("vs Normal") <= 0.5 and prop("vs Normal") > 0) +
toNumber(prop("vs Fire") <= 0.5 and prop("vs Fire") > 0) +
toNumber(prop("vs Water") <= 0.5 and prop("vs Water") > 0) +
toNumber(prop("vs Electric") <= 0.5 and prop("vs Electric") > 0) +
toNumber(prop("vs Grass") <= 0.5 and prop("vs Grass") > 0) +
toNumber(prop("vs Ice") <= 0.5 and prop("vs Ice") > 0) +
toNumber(prop("vs Fighting") <= 0.5 and prop("vs Fighting") > 0) +
toNumber(prop("vs Poison") <= 0.5 and prop("vs Poison") > 0) +
toNumber(prop("vs Ground") <= 0.5 and prop("vs Ground") > 0) +
toNumber(prop("vs Flying") <= 0.5 and prop("vs Flying") > 0) +
toNumber(prop("vs Psychic") <= 0.5 and prop("vs Psychic") > 0) +
toNumber(prop("vs Bug") <= 0.5 and prop("vs Bug") > 0) +
toNumber(prop("vs Rock") <= 0.5 and prop("vs Rock") > 0) +
toNumber(prop("vs Ghost") <= 0.5 and prop("vs Ghost") > 0) +
toNumber(prop("vs Dragon") <= 0.5 and prop("vs Dragon") > 0) +
toNumber(prop("vs Dark") <= 0.5 and prop("vs Dark") > 0) +
toNumber(prop("vs Steel") <= 0.5 and prop("vs Steel") > 0) +
toNumber(prop("vs Fairy") <= 0.5 and prop("vs Fairy") > 0)
3) # Immunities (=0x)

toNumber(prop("vs Normal") = 0) +
toNumber(prop("vs Fire") = 0) +
toNumber(prop("vs Water") = 0) +
toNumber(prop("vs Electric") = 0) +
toNumber(prop("vs Grass") = 0) +
toNumber(prop("vs Ice") = 0) +
toNumber(prop("vs Fighting") = 0) +
toNumber(prop("vs Poison") = 0) +
toNumber(prop("vs Ground") = 0) +
toNumber(prop("vs Flying") = 0) +
toNumber(prop("vs Psychic") = 0) +
toNumber(prop("vs Bug") = 0) +
toNumber(prop("vs Rock") = 0) +
toNumber(prop("vs Ghost") = 0) +
toNumber(prop("vs Dragon") = 0) +
toNumber(prop("vs Dark") = 0) +
toNumber(prop("vs Steel") = 0) +
toNumber(prop("vs Fairy") = 0)
C) Defensive profile summary label (Pokemon Catalog)
Defensive Profile (quick scouting string)

"WK:" + format(prop("# Weaknesses (>=2x)")) +
" | RS:" + format(prop("# Resists (<=0.5x)")) +
" | IM:" + format(prop("# Immunities (=0x)"))
D) Team budget formulas (Teams)
These assume you set up rollups:

Total Points (Active) = rollup sum of Points at Acquisition (Snapshot) (or rollup current points) from Draft Picks filtered to Status = Active.

Active Picks (Rollup Count) = count of Draft Picks filtered to Status = Active.

Slots Remaining

prop("Roster Size Max") - prop("Active Picks (Rollup Count)")
Budget Remaining

prop("Draft Budget") - prop("Total Points (Active)")
E) Draft Pick: snapshot hygiene (Draft Picks)
Best practice: store points twice:

Points at Acquisition (Snapshot) = manually set once at draft/transaction time

Points (Rollup Current) = rollup of Pokemon → Draft Points (so you can detect changes later)

Optional audit formula:

Points Drift?

if(
  prop("Points (Rollup Current)") != prop("Points at Acquisition (Snapshot)"),
  "DRIFT",
  ""
)
3) Recommended build/import order (to avoid broken relations)
This order prevents “dangling relations,” minimizes rework, and makes your import stable.

Step 0 — Decide on naming rules first (do this once)
Pokémon Name should include form suffix (e.g., “Raichu-Alola”)

Internal Slug should be stable and lowercase (e.g., raichu-alola)

Decide whether you treat Megas as separate rows (recommended: yes)

Step 1 — Create the “taxonomy” databases first
Moves (optional, but do it first if you want it)

Role Tags

Why: Role Tags optionally relate to Moves, and both get referenced by Pokémon later.

Step 2 — Create and import Pokemon Catalog
Create the database with all numeric fields and URLs first.

Import your Pokémon data (CSV recommended).

After import, add:

formulas (BST, weakness/resist/immunity counts, Defensive Profile)

relations to Role Tags / Moves

Tip: If you import from CSV, include a column for Internal Slug immediately. It will save you later.

Step 3 — Create the league people and org layer
Coaches

Teams

Link Teams → Coaches

Step 4 — Create seasons and pool versioning
Seasons

Draft Pools

Link Draft Pools → Seasons and Pokemon Catalog

Step 5 — Create transactional tables (depend on everything above)
Draft Picks (depends on Seasons + Teams + Pokemon Catalog)

Matches (depends on Seasons + Teams)

Step 6 — Add rollups + filtered views
Teams: rollups for active roster points and counts

Draft Picks: views by team, by round, by acquisition type

Pokemon Catalog: views by role category, points, defensive profile

Operational guidance (so Notion doesn’t turn into a swamp)
Never store role info as raw multi-selects on Pokémon if you intend to query it seriously. Use Role Tags relations.

Use Draft Pools per season so the legality snapshot stays consistent.

Always keep points snapshots on Draft Picks; it’s the only way to preserve history cleanly.

If you want the “extra mile” version: I can also provide a prebuilt set of recommended Notion views (exact filters/sorts/groupings) for each database (Draft Board view, Team Roster view, Hazard setters view, etc.) in a format you can implement click-for-click.

You said:
yes please, remember to be comprehensive detailed and thorough
ChatGPT said:
Below is a comprehensive, detailed, and thorough set of recommended Notion views for each database in the schema, including exact grouping, sorting, filters, and the operational intent of each view. This is designed to mirror how commissioners and coaches actually work: draft prep, roster management, matchup prep, and post-week maintenance.

Global View Conventions (use consistently)
Before creating views, establish these conventions so the database behaves predictably:

Common Filters
Eligible = ✅ (for draft pool browsing)

Season = Current Season (for anything operational)

Draft Pick Status = Active (for roster views)

Match Result = Pending (for upcoming schedule workflow)

Common Sort Orders
Draft Points: descending (premium mons at top) or ascending (budget scouting)

Spe or Speed @ 252+: descending (speed control scouting)

Week: ascending (schedule clarity)

Tier: custom order S → A → B → C → D → E → F

Common Grouping Patterns
Group by:

Tier, Draft Points, Type 1, Type 2, Role Category, Team, Week, Acquisition Type

1) Pokémon Catalog — Views (Master Scouting + Draft Prep)
View 1 — “Draft Board (By Points)”
Type: Table
Purpose: Primary draft pool scouting list

Properties to show (recommended):

Name (Title)

Draft Points

Tier

Type 1, Type 2

Ability 1 (and Hidden Ability if you prefer)

HP/Atk/Def/SpA/SpD/Spe

BST

Speed @ 252+

Defensive Profile (WK/RS/IM)

Role Tags (relation)

Filters:

Eligible = ✅

Sort:

Draft Points (descending)

Tier (ascending by your tier order)

Speed @ 252+ (descending)

View 2 — “Budget Steals (Low Cost, High Value)”
Type: Table
Purpose: Identify underpriced Pokémon by raw stats and/or defensive profile

Filters:

Eligible = ✅

Draft Points ≤ (your threshold; e.g., 10 or 12)

Sort:

BST (descending)

Speed @ 252+ (descending)

Resists (descending)
Optional additional formula (if you want):

“Value Index” = BST / Draft Points

View 3 — “By Tier”
Type: Board
Purpose: Visual draft-tier navigation

Group by: Tier
Filters:

Eligible = ✅

Sort within groups:

Draft Points descending

Speed @ 252+ descending

View 4 — “By Primary Type”
Type: Board
Purpose: Build type cores and check type availability

Group by: Type 1
Filters:

Eligible = ✅

Sort:

Draft Points descending

View 5 — “Speed Control (Fastest First)”
Type: Table
Purpose: Identify speed tiers and scarf threats quickly

Filters:

Eligible = ✅

Sort:

Speed @ 252+ (descending)

Speed @ 252 EV (descending)

Speed @ 0 EV (descending)

View 6 — “Bulky Defenders”
Type: Table
Purpose: Defensive picks by bulk and resistances

Filters:

Eligible = ✅

(# Resists (<=0.5x)) ≥ 6 (or your league threshold)

Sort:

HP (descending)

Def (descending)

SpD (descending)

Resists (descending)
View 7 — “Glass Cannons”
Type: Table
Purpose: Identify high-offense, lower-bulk threats

Filters:

Eligible = ✅

(Atk ≥ 120 OR SpA ≥ 120)

Sort:

Atk (descending)

SpA (descending)

Speed @ 252+ (descending)

View 8 — “Defensive Liability Watch”
Type: Table
Purpose: Quick scan for Pokémon with too many weaknesses

Filters:

Eligible = ✅

Weaknesses (>=2x) ≥ 6 (tune threshold)
Sort:

Weaknesses (descending)
Draft Points (descending)

View 9 — “Immunity Index”
Type: Table
Purpose: Find immunities for matchup planning cores

Filters:

Eligible = ✅

Immunities (=0x) ≥ 1
Sort:

Immunities (descending)
Resists (descending)
View 10 — “Role Tags (All)”
Type: Table
Purpose: Use as a cross-reference between Pokémon and roles

Filters:

Eligible = ✅

Sort:

Draft Points descending

Note: This works best once Role Tags are populated and standardized.

2) Role Tags — Views (Role Integrity + Coverage Planning)
View 1 — “Role Library (By Category)”
Type: Board
Group by: Category
Purpose: Ensure tag taxonomy stays clean

Sort within groups:

Count (Pokemon) descending

View 2 — “Most Common Roles”
Type: Table
Purpose: Identify role inflation and redundant tags

Properties:

Role Tag

Category

Count (Pokemon)

Notes

Sort:

Count (Pokemon) descending

View 3 — “Role Tags Missing Move Link”
Type: Table
Purpose: Data quality: enforce consistent move association where desired

Filter:

Move is empty

Sort:

Category ascending

3) Moves — Views (Utility Move Management)
View 1 — “Utility Moves by Tag”
Type: Board
Group by: Tags
Purpose: Quickly navigate hazard moves, removal, pivot, etc.

View 2 — “Priority Moves”
Type: Table
Filter:

Priority > 0

Sort:

Priority descending

Power descending

View 3 — “Hazards & Removal”
Type: Table
Filter:

Tags contains Hazard OR Tags contains Removal

Sort:

Move Name ascending

4) Coaches — Views (Roster Ownership + Operations)
View 1 — “Active Coaches”
Type: Table
Filter:

Active = ✅

Sort:

Coach ascending

View 2 — “Coach Directory”
Type: Gallery
Purpose: Friendly UI directory for commissioners

Show:

Discord Handle

Showdown Username

Teams

5) Teams — Views (Budget, Roster, Compliance)
View 1 — “Team Dashboard (All Teams)”
Type: Table
Properties:

Team Name

Coach

Draft Budget

Total Points (Active)

Budget Remaining

Active Picks (Rollup Count)

Slots Remaining

Sort:

Budget Remaining ascending (teams near cap first)

Slots Remaining ascending (teams near full roster first)

View 2 — “Over Budget / Non-Compliant”
Type: Table
Filters:

Budget Remaining < 0 OR Slots Remaining < 0

Sort:

Budget Remaining ascending

View 3 — “Roster Near Full”
Type: Table
Filters:

Slots Remaining ≤ 1

Sort:

Slots Remaining ascending

View 4 — “Teams by Coach”
Type: Board
Group by: Coach
Purpose: Ownership visibility for commissioners

6) Seasons — Views (League Administration)
View 1 — “Season Control Panel”
Type: Table
Properties:

Season

Generation / Format

Start Date

End Date

Draft Points Budget

Roster Size Min

Roster Size Max

Draft Pool Snapshot

Sort:

Start Date descending

View 2 — “Active Season”
Type: Table
Filter:

Start Date is on or before today

End Date is on or after today (or end empty)

7) Draft Pools — Views (Legality & Versioning)
View 1 — “Pools by Season”
Type: Board
Group by: Season
Purpose: Ensure every season has a pool snapshot

View 2 — “Locked Pools”
Type: Table
Filter:

Locked = ✅

View 3 — “Unlocked / In Progress Pools”
Type: Table
Filter:

Locked is not checked

8) Draft Picks — Views (Draft Board + Rosters + Transactions)
This database is the operational heart. You should build multiple views.

View 1 — “Draft Board (Grouped by Round)”
Type: Table
Filters:

Acquisition Type = Draft

Season = (current season)

Group by: Draft Round
Sort within group:

Pick # ascending

Team ascending

Show:

Pick (title)

Team

Pokémon

Points at Acquisition (Snapshot)

Status

View 2 — “Draft Board (Grouped by Team)”
Type: Table
Filters:

Season = current season

Acquisition Type = Draft

Group by: Team
Sort within group:

Draft Round ascending

Pick # ascending

View 3 — “Active Rosters (All Teams)”
Type: Table
Filters:

Season = current season

Status = Active

Group by: Team
Sort:

Points at Acquisition descending (or by Draft Round)

View 4 — “Free Agency Activity”
Type: Table
Filters:

Season = current season

Acquisition Type = Free Agency

Sort:

Start Date descending

View 5 — “Trades”
Type: Table
Filters:

Season = current season

Acquisition Type = Trade

Sort:

Start Date descending

View 6 — “Dropped / Inactive”
Type: Table
Filters:

Season = current season

Status is Dropped OR Traded Away OR Banned OR IR

Sort:

End Date descending

View 7 — “Points Drift Audit”
Type: Table
Filters:

Points Drift? = DRIFT

Sort:

Start Date descending

9) Matches — Views (Scheduling + Results + Weekly Ops)
View 1 — “Schedule (By Week)”
Type: Table
Filters:

Season = current season

Group by: Week
Sort within group:

Scheduled Time ascending

Show:

Match

Home Team

Away Team

Scheduled Time

Result

Replay URL

View 2 — “Pending Matches”
Type: Table
Filters:

Season = current season

Result = Pending

Sort:

Week ascending

Scheduled Time ascending

View 3 — “Completed Matches”
Type: Table
Filters:

Season = current season

Result is not Pending

Sort:

Completed Time descending

View 4 — “Replay Library”
Type: Gallery
Filters:

Replay URL is not empty

Sort:

Completed Time descending

Card preview:

Show Match title, teams, and replay link

Optional: Commissioner “Ops Hub” Page Structure (Notion UX best practice)
Create a top-level page: AAB League Ops Hub with linked database views:

Section: Draft
Draft Board (By Round)

Teams Over Budget

Active Rosters (Grouped by Team)

Pools by Season

Section: Weekly
Pending Matches

Schedule (By Week)

Replay Library

Section: Admin / Quality Control
Points Drift Audit

Role Tags Missing Move Link

Unlocked Pools

Next step (high leverage)
If you want this to be fully “production-grade” inside Notion, the missing piece is standardizing Role Tags so they are consistent and queryable. If you share:

the exact columns (or a snippet) for the role blocks (hazard setters/removers/clerics/pivots/phasing/priority),
I can give you a canonical taxonomy (exact tag names, category mapping, and move linkage rules) so the entire system stays clean.

All guidance above is based on the “Backend Data” structure you referenced (Dex, sprites, stats, speed tiers, type multipliers, abilities, role groupings).

You said:
yes i want it fully production-grade. you may proceed
ChatGPT said:
Excellent. Below is a fully production-grade role taxonomy and governance layer that locks this system down so it remains queryable, extensible, auditable, and automation-ready. This is the missing piece that prevents Notion Pokémon leagues from collapsing into tag soup.

This response covers, in order:

Canonical Role Taxonomy (authoritative list)

Exact Role Tag naming rules (no ambiguity)

Move → Role mapping rules

Multi-role handling (how one Pokémon gets many roles cleanly)

Governance & data-quality enforcement

Automation-readiness notes (Supabase / API / AI agents)

Final “production readiness” checklist

1. Canonical Role Taxonomy (Authoritative)
This is the only allowed role universe. Every role tag must map cleanly into this structure.

Tier 1: Role Categories (fixed, never renamed)
These are the only Category values allowed in the Role Tags database:

Hazard Setter

Hazard Remover

Cleric

Pivot

Phasing

Priority

Recovery

Screens

Status Utility

Win Condition

Anti-Setup

Disruption

Weather / Terrain

Support (General)

Rationale:

These categories cover all competitive utility without overlap

They map cleanly to analytics, AI prompting, and future automation

No category is flavor-based or vague

2. Canonical Role Tag Naming Rules (Critical)
This is non-negotiable if you want long-term sanity.

Role Tag Format (STRICT)
<Category>: <Specific Mechanism>
Examples (Correct)
Hazard Setter: Stealth Rock

Hazard Setter: Spikes

Hazard Remover: Defog

Hazard Remover: Rapid Spin

Cleric: Heal Bell

Cleric: Aromatherapy

Pivot: U-turn

Pivot: Volt Switch

Pivot: Teleport

Phasing: Roar

Phasing: Whirlwind

Priority: Extreme Speed

Priority: Sucker Punch

Recovery: Recover

Recovery: Roost

Screens: Reflect

Screens: Light Screen

Status Utility: Toxic

Status Utility: Thunder Wave

Win Condition: Dragon Dance

Anti-Setup: Haze

Disruption: Knock Off

Weather: Rain

Terrain: Grassy Terrain

Explicitly Forbidden Patterns
❌ Hazard Setter
❌ Pivot
❌ Utility
❌ Support
❌ Speed Control (derived concept, not a role)

Why:
These collapse meaning when queried, break automation, and cannot be reasoned over by agents.

3. Move → Role Mapping Rules (How Roles Are Assigned)
This prevents subjective tagging.

Rule A — Roles are granted by moves or abilities, never vibes
A Pokémon only receives a Role Tag if:

It commonly and viably runs the move in competitive draft formats

The move defines an actual team function

Example
Skarmory

Gets Hazard Setter: Spikes

Gets Phasing: Whirlwind

Does not get “Wall” or “Tank”

Rule B — One move = one role tag
If a move does two things, you still split roles:

Mortal Spin

Hazard Remover: Rapid Spin

Status Utility: Poison

Rule C — Ability-granted roles are allowed (but explicit)
Examples:

Disruption: Intimidate

Recovery: Regenerator

Weather: Drizzle

Format remains identical:

<Category>: <Ability Name>
Rule D — Win Conditions must be enablers, not stats
Allowed:

Win Condition: Dragon Dance

Win Condition: Calm Mind

Win Condition: Belly Drum

Win Condition: Shell Smash

Forbidden:

❌ Win Condition: Fast

❌ Win Condition: Strong

4. Multi-Role Handling (Clean, Queryable)
A Pokémon will have many Role Tags. That is expected.

Example: Great Tusk
Role Tags:

Hazard Remover: Rapid Spin

Hazard Setter: Stealth Rock

Disruption: Knock Off

Recovery: Protosynthesis (if allowed by ruleset)

This enables:

“Show me all Pokémon that are both hazard removal and Knock Off”

“Find budget hazard removal under 10 points”

“Which teams lack a Cleric or Hazard Remover?”

5. Governance & Data-Quality Enforcement (Production Rules)
A. Mandatory Role Tag Rules
Every Pokémon in Pokemon Catalog must satisfy one of:

Has ≥ 1 Role Tag

OR is explicitly marked:

Tier = N/A

Ban / Restriction Notes populated

This prevents “silent junk rows.”

B. Role Tag Quality Control Views (Required)
Create these in Role Tags:

View: “Unlinked Role Tags”
Filter

Pokemon relation is empty

→ These are invalid and must be fixed or deleted.

View: “Role Tags Missing Move”
Filter

Category ≠ Weather / Ability-based

Move relation is empty

→ Forces discipline.

View: “Overloaded Roles”
Purpose: detect roles that are too broad

Sort

Count (Pokemon) descending

If a single Role Tag appears on 30+ Pokémon, it is probably underspecified.

C. Pokémon Coverage Audits (High-Value Views)
In Pokemon Catalog:

View: “No Hazard Control”
Filter

Role Tags does NOT contain any:

Hazard Setter:*

Hazard Remover:*

View: “No Recovery”
Filter

Role Tags does NOT contain:

Recovery:*

View: “No Speed Control Options”
(Derived via speed tiers + priority roles)

6. Automation-Readiness (Future-Proofing)
Because roles are normalized and explicit, this schema supports:

AI / Agent Queries
“Which Pokémon under 12 points give hazard removal and Knock Off?”

“Does Team X have a Cleric or reliable recovery?”

“Suggest a Stealth Rock setter that doesn’t stack Ice weaknesses.”

API / Supabase Sync
Role Tags become a join table

Moves become a reference table

Pokémon → Roles becomes deterministic

Draft Validation
You can enforce:

“Teams must have ≥1 Hazard Remover”

“Teams may not exceed X Win Conditions”

7. Final Production-Grade Checklist (Use This)
You are production-ready when all of the following are true:

✅ Role Tags follow <Category>: <Mechanism> format

✅ No Role Tags without Pokémon links

✅ No Pokémon without at least one Role Tag (or explicit exclusion)

✅ Draft Picks store points snapshots

✅ Draft Pools are locked per season

✅ Teams compute budget and slot compliance automatically

✅ Views exist for:

Draft Board

Active Rosters

Over-Budget Teams

Hazard Coverage

Cleric Coverage

Points Drift Audit

Where this leaves you
At this point, your Notion system is:

Commissioner-safe

Coach-friendly

AI-queryable

Migration-ready (Supabase / Next.js / agents)

Scalable across seasons

If you want, the next logical step would be:

exporting this schema into a Supabase SQL schema

or designing the exact API contract between Notion → App → Discord bot

Just tell me which direction to take next.

You said:
both please
ChatGPT said:
Below are both deliverables:

a production-grade Supabase (Postgres) SQL schema that mirrors the Notion design (including normalization for roles/moves and season pool versioning)

a production-grade API contract for Notion → App (Next.js) → Discord bot (including auth, sync jobs, webhooks/events, and payload shapes)

1) Supabase SQL schema (production-grade)
Design goals
Normalized: Pokémon, Moves, Role Tags as reference tables; many-to-many join tables.

Season-safe: Draft Pools are snapshots per season; picks store points snapshots to preserve history.

Automation-ready: Sync metadata tables and upserts supported.

RLS-compatible: Ownership columns included for clean policies.

Notes:

Uses pgcrypto for UUIDs.

Uses Postgres enums where helpful (you can convert to lookup tables if you prefer).

Uses citext for case-insensitive usernames.

Assumes Supabase Auth: auth.users.

SQL (copy/paste as a migration)
-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ================
-- ENUMS
-- ================
do $$ begin
  create type pokemon_form as enum ('none','alolan','galarian','hisuian','paldean','mega','primal','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pokemon_type as enum (
    'normal','fire','water','electric','grass','ice','fighting','poison','ground','flying',
    'psychic','bug','rock','ghost','dragon','dark','steel','fairy'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type role_category as enum (
    'hazard_setter','hazard_remover','cleric','pivot','phasing','priority','recovery','screens',
    'status_utility','win_condition','anti_setup','disruption','weather_terrain','support_general'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type acquisition_type as enum ('draft','free_agency','trade','waiver');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pick_status as enum ('active','dropped','traded_away','ir','banned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_result as enum ('pending','home_win','away_win','forfeit','no_contest');
exception when duplicate_object then null; end $$;

-- ================
-- CORE REFERENCE TABLES
-- ================

-- Pokémon (forms are first-class rows)
create table if not exists public.pokemon (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- Display name (with form suffix)
  species_name text not null,         -- Base species
  form pokemon_form not null default 'none',
  dex_number int,
  slug text not null unique,          -- stable key (e.g. gardevoir-mega)
  eligible boolean not null default true,

  type1 pokemon_type not null,
  type2 pokemon_type,                 -- nullable

  draft_points int,                   -- current points (season snapshots happen in draft_picks)
  tier text,                          -- optional: 'S','A','B'...
  restriction_notes text,

  sprite_primary_url text,
  sprite_bw_url text,
  sprite_serebii_url text,
  sprite_home_url text,

  hp int, atk int, def int, spa int, spd int, spe int,
  speed_0_ev int,
  speed_252_ev int,
  speed_252_plus int,

  ability1 text,
  ability2 text,
  hidden_ability text,

  -- Type effectiveness multipliers (defensive multipliers)
  vs_normal numeric(4,2),
  vs_fire numeric(4,2),
  vs_water numeric(4,2),
  vs_electric numeric(4,2),
  vs_grass numeric(4,2),
  vs_ice numeric(4,2),
  vs_fighting numeric(4,2),
  vs_poison numeric(4,2),
  vs_ground numeric(4,2),
  vs_flying numeric(4,2),
  vs_psychic numeric(4,2),
  vs_bug numeric(4,2),
  vs_rock numeric(4,2),
  vs_ghost numeric(4,2),
  vs_dragon numeric(4,2),
  vs_dark numeric(4,2),
  vs_steel numeric(4,2),
  vs_fairy numeric(4,2),

  -- Optional external naming fields (from your document-style mapping)
  github_name text,
  smogon_name text,
  pokemondb_name text,
  smogon_url text,
  pokemondb_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pokemon_dex on public.pokemon(dex_number);
create index if not exists idx_pokemon_points on public.pokemon(draft_points);
create index if not exists idx_pokemon_types on public.pokemon(type1, type2);

-- Moves
create table if not exists public.moves (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type pokemon_type,
  category text,                -- 'physical','special','status'
  power int,
  accuracy int,
  pp int,
  priority int,
  tags text[],                  -- e.g. {'hazard','removal','pivot'}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role Tags (canonical taxonomy)
create table if not exists public.role_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,            -- STRICT: "<Category>: <Mechanism>"
  category role_category not null,
  mechanism text not null,              -- e.g. "Stealth Rock", "Defog", "Intimidate"
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_tag_name_format_chk check (position(': ' in name) > 0)
);

create index if not exists idx_role_tags_category on public.role_tags(category);

-- Join: Pokémon ↔ Role Tags (many-to-many)
create table if not exists public.pokemon_role_tags (
  pokemon_id uuid not null references public.pokemon(id) on delete cascade,
  role_tag_id uuid not null references public.role_tags(id) on delete cascade,
  source text,                          -- 'notion','import','manual','ai'
  created_at timestamptz not null default now(),
  primary key (pokemon_id, role_tag_id)
);

-- Optional join: Role Tag ↔ Move (0..1 move reference; if you want strict move linkage)
create table if not exists public.role_tag_moves (
  role_tag_id uuid not null references public.role_tags(id) on delete cascade,
  move_id uuid not null references public.moves(id) on delete cascade,
  primary key (role_tag_id, move_id)
);

-- Optional join: Pokémon ↔ Moves (utility association, not full learnset)
create table if not exists public.pokemon_moves_utility (
  pokemon_id uuid not null references public.pokemon(id) on delete cascade,
  move_id uuid not null references public.moves(id) on delete cascade,
  notes text,
  primary key (pokemon_id, move_id)
);

-- ================
-- LEAGUE ENTITIES
-- ================

-- Coaches (maps to auth.users optionally)
create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,

  coach_name text not null,
  discord_handle text,
  showdown_username citext,
  github_name text,
  smogon_name text,
  timezone text,
  active boolean not null default true,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coaches_showdown on public.coaches(showdown_username);

-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  franchise_key text unique,                 -- stable across seasons if desired
  coach_id uuid references public.coaches(id) on delete set null,

  logo_url text,
  theme text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teams_coach on public.teams(coach_id);

-- Seasons
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,                        -- e.g. "AAB S6 (Gen9 Draft)"
  generation_format text,                    -- free text or enum
  start_date date,
  end_date date,

  draft_points_budget int not null default 120,
  roster_size_min int not null default 8,
  roster_size_max int not null default 10,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Season participants (Teams ↔ Seasons)
create table if not exists public.season_teams (
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  primary key (season_id, team_id)
);

-- Draft Pools (versioned snapshots)
create table if not exists public.draft_pools (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,                         -- "S6 Pool v1"
  rules_notes text,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(season_id, name)
);

-- Draft Pool contents (many-to-many + inclusion flag)
create table if not exists public.draft_pool_pokemon (
  draft_pool_id uuid not null references public.draft_pools(id) on delete cascade,
  pokemon_id uuid not null references public.pokemon(id) on delete cascade,
  included boolean not null default true,      -- false = banned/excluded
  reason text,
  primary key (draft_pool_id, pokemon_id)
);

create index if not exists idx_draft_pool_pokemon_included on public.draft_pool_pokemon(draft_pool_id, included);

-- Draft Picks (transactional roster records)
create table if not exists public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  pokemon_id uuid not null references public.pokemon(id) on delete restrict,

  acquisition acquisition_type not null default 'draft',
  draft_round int,
  pick_number int,

  status pick_status not null default 'active',
  start_date date default current_date,
  end_date date,

  points_snapshot int not null,               -- critical: preserves history
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- prevent duplicate active ownership in same season
  constraint uq_season_pokemon_unique unique (season_id, pokemon_id)
);

create index if not exists idx_draft_picks_team on public.draft_picks(season_id, team_id);
create index if not exists idx_draft_picks_status on public.draft_picks(status);

-- Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  week int not null,

  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,

  result match_result not null default 'pending',
  score text,                                 -- e.g. "5-1"
  replay_url text,

  showdown_room_id text,
  scheduled_time timestamptz,
  completed_time timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_matches_season_week on public.matches(season_id, week);
create index if not exists idx_matches_result on public.matches(result);

-- Standings (optional materialized table; many leagues compute this via view)
create table if not exists public.standings (
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,

  wins int not null default 0,
  losses int not null default 0,
  differential int not null default 0,
  points_for int not null default 0,
  points_against int not null default 0,
  playoff_seed int,

  updated_at timestamptz not null default now(),
  primary key (season_id, team_id)
);

-- ================
-- SYNC / AUDIT SUPPORT
-- ================

-- Stores the Notion page ID mappings for deterministic upsert
create table if not exists public.notion_mappings (
  notion_page_id text primary key,
  entity_type text not null,              -- 'pokemon','role_tag','move','coach','team', etc.
  entity_id uuid not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_notion_mappings_entity on public.notion_mappings(entity_type, entity_id);

-- Sync job logs (optional but recommended for production)
create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,                 -- 'notion_pull','notion_push','discord_roles','etc'
  status text not null default 'queued',   -- 'queued','running','success','error'
  started_at timestamptz,
  finished_at timestamptz,
  details jsonb,
  error text,
  created_at timestamptz not null default now()
);

-- ================
-- UPDATED_AT TRIGGERS
-- ================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger pokemon_set_updated_at before update on public.pokemon
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger moves_set_updated_at before update on public.moves
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger role_tags_set_updated_at before update on public.role_tags
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger coaches_set_updated_at before update on public.coaches
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger teams_set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger seasons_set_updated_at before update on public.seasons
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger draft_pools_set_updated_at before update on public.draft_pools
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger draft_picks_set_updated_at before update on public.draft_picks
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger matches_set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ================
-- VIEWS (optional but extremely useful)
-- ================

-- Team roster view (active picks only) with points totals
create or replace view public.v_team_rosters as
select
  dp.season_id,
  dp.team_id,
  t.team_name,
  dp.pokemon_id,
  p.name as pokemon_name,
  dp.points_snapshot,
  dp.acquisition,
  dp.status
from public.draft_picks dp
join public.teams t on t.id = dp.team_id
join public.pokemon p on p.id = dp.pokemon_id
where dp.status = 'active';

-- Team budget summary per season
create or replace view public.v_team_budget as
select
  dp.season_id,
  dp.team_id,
  t.team_name,
  coalesce(sum(dp.points_snapshot) filter (where dp.status = 'active'), 0) as points_used,
  s.draft_points_budget,
  (s.draft_points_budget - coalesce(sum(dp.points_snapshot) filter (where dp.status = 'active'), 0)) as budget_remaining,
  coalesce(count(*) filter (where dp.status = 'active'), 0) as slots_used,
  s.roster_size_max,
  (s.roster_size_max - coalesce(count(*) filter (where dp.status = 'active'), 0)) as slots_remaining
from public.draft_picks dp
join public.teams t on t.id = dp.team_id
join public.seasons s on s.id = dp.season_id
group by dp.season_id, dp.team_id, t.team_name, s.draft_points_budget, s.roster_size_max;
RLS policy guidance (high-level, production defaults)
You’ll likely want:

Public read for pokemon, moves, role_tags (and their join tables)

Authenticated read for league tables; coach-scoped write for draft picks belonging to their team; admin-only for season config, pool lock, etc.

Typical patterns:

Add profiles table with role (viewer|coach|admin) keyed by auth.uid()

Add policies:

Coaches can select everything (or season-limited)

Coaches can insert/update only their own draft_picks rows (or only via server routes)

Admins can mutate pools, seasons, standings, and match results

If you want, I can provide the exact RLS SQL once you confirm your profiles table shape (or I’ll assume the one already in your POKE MNKY schema).

2) API contract: Notion → App → Discord bot (production-grade)
Overall architecture
Next.js app is the API gateway and policy enforcement layer.

Notion is the “editor” / CMS-like master interface for league ops.

Supabase is the canonical store (source of truth for runtime).

Discord bot is the workflow surface (commands + notifications).

Key principle
Notion should not write directly to Supabase in production. It should:

trigger a sync job, or

send changes to the App, which validates and writes to Supabase.

Authentication and trust boundaries
1) Notion → App
Use a secret header:

Authorization: Bearer NOTION_SYNC_SECRET

Or verify Notion webhook signature (if you adopt Notion webhooks).

2) Discord bot → App
Use Authorization: Bearer DISCORD_BOT_API_KEY

Bot never receives Supabase service-role keys.

3) App → Supabase
Server routes use Supabase service role for admin operations.

Client routes use anon + RLS.

Event model (recommended)
You will save yourself pain by formalizing events.

Event envelope (shared)
{
  "event_id": "uuid",
  "event_type": "notion.pokemon.upsert",
  "source": "notion",
  "occurred_at": "2026-01-26T05:12:00Z",
  "payload": { }
}
Store events in sync_jobs.details or a dedicated events table.

API endpoints (contract)
A) Notion sync endpoints (App API)
1) Trigger full pull (Notion → Supabase)
POST /api/sync/notion/pull

Auth

Authorization: Bearer NOTION_SYNC_SECRET

Body

{
  "scope": ["pokemon", "role_tags", "moves", "coaches", "teams"],
  "dry_run": false
}
Response

{
  "job_id": "uuid",
  "status": "queued"
}
2) Pull incremental (since last sync)
POST /api/sync/notion/pull/incremental

Body

{
  "scope": ["pokemon"],
  "since": "2026-01-25T00:00:00Z",
  "dry_run": false
}
3) Push Supabase → Notion (optional)
POST /api/sync/notion/push

Use this when Supabase is canonical but Notion needs to reflect updates (e.g., after draft).

B) Notion webhook receiver (optional but ideal)
POST /api/webhooks/notion

Headers

Notion signature header (verify)

or shared secret header

Body (example)

{
  "type": "page.updated",
  "page_id": "notion_page_id",
  "database_id": "notion_db_id",
  "properties_changed": ["Draft Points", "Eligible"]
}
Behavior

enqueue incremental pull for that entity type

upsert mapping into notion_mappings

C) League runtime endpoints (App API) used by web app + bot
1) Query Pokémon with filters (roles, points, types)
GET /api/pokemon?points_lte=12&type1=water&role=Hazard%20Remover:%20Defog

Response

{
  "results": [
    {
      "id": "uuid",
      "name": "Mandibuzz",
      "draft_points": 10,
      "types": ["dark", "flying"],
      "roles": ["Hazard Remover: Defog", "Disruption: Knock Off"]
    }
  ]
}
2) Team roster + budget view (computed)
GET /api/teams/:teamId/roster?seasonId=uuid

Returns v_team_rosters + v_team_budget merged.

3) Draft pick submission (Bot + Web)
POST /api/draft/pick

Auth

Bot key OR user session

Body

{
  "season_id": "uuid",
  "team_id": "uuid",
  "pokemon_id": "uuid",
  "acquisition": "draft",
  "draft_round": 3,
  "pick_number": 21
}
Server behavior

validate: pool inclusion, uniqueness, budget, roster size

write draft_picks.points_snapshot = pokemon.draft_points at time of acquisition

return updated budget status

Response

{
  "ok": true,
  "draft_pick_id": "uuid",
  "points_snapshot": 12,
  "team_budget": {
    "points_used": 78,
    "budget_remaining": 42,
    "slots_used": 6,
    "slots_remaining": 4
  }
}
4) Drop / Add (Free Agency)
POST /api/free-agency/transaction

Body

{
  "season_id": "uuid",
  "team_id": "uuid",
  "drop_pokemon_id": "uuid",
  "add_pokemon_id": "uuid"
}
D) Discord bot integration endpoints
1) Post match result
POST /api/matches/:matchId/result

Body

{
  "result": "home_win",
  "score": "5-1",
  "replay_url": "https://...",
  "reported_by": "discord",
  "reported_by_user": "1234567890"
}
2) Notify role coverage gaps (pre-week scouting)
POST /api/discord/notify/coverage

Body

{
  "season_id": "uuid",
  "team_id": "uuid",
  "channel_id": "discord_channel_id",
  "checks": ["hazard_removal", "cleric", "speed_control"]
}
Data mapping rules: Notion → Supabase (critical)
Entity identifiers
Notion rows should contain:

Internal Slug (pokemon.slug)

Role Tag Name (role_tags.name)

Move Name (moves.name)

App stores notion_page_id ↔ entity_id in notion_mappings.

Upsert strategy
Pokémon: upsert by slug

Role tags: upsert by name

Moves: upsert by name

Join tables: rebuild deterministically:

clear existing joins for an entity, then insert current set

or diff by hash if you want to minimize writes

Discord bot command contract (recommended)
Your bot can be fully deterministic if it uses the App API.

Examples
/draft pick pokemon:<name>

bot calls GET /api/pokemon?name=...

then POST /api/draft/pick

/team roster team:<team>

bot calls GET /api/teams/:teamId/roster

/scout roles team:<team>

bot calls GET /api/teams/:teamId/coverage (you can implement this as a server-side computed endpoint using role joins)

Next: choose implementation path (no need to confirm; here’s the recommended sequence)
If you are executing this immediately, the cleanest build order is:

Apply the SQL schema in Supabase

Implement the Notion pull sync job (server route + worker)

Populate Pokémon + roles + moves and verify joins

Implement /api/draft/pick validation (budget + pool inclusion + uniqueness)

Wire Discord bot to App API (only) for draft + roster + match commands

If you want, I can now produce:

a full OpenAPI 3.1 spec for these endpoints, and/or

the exact Notion database property-to-field mapping sheet for your “Backend Data” columns (so the sync is deterministic on day one).

You said:
yes to both please
ChatGPT said:
Below are both deliverables:

a complete OpenAPI 3.1 specification (YAML) for the Notion sync + league runtime + Discord bot endpoints we defined

a deterministic Notion → Supabase field mapping sheet (including normalization guidance for roles/moves)

1) OpenAPI 3.1 spec (YAML)
openapi: 3.1.0
info:
  title: AAB Draft League API
  version: 1.0.0
  description: >
    Production-grade API contract for Notion ↔ App (Next.js) ↔ Supabase ↔ Discord Bot.
    - Notion sync endpoints are server-to-server only.
    - League runtime endpoints are consumed by Web UI and Discord bot.
    - Sensitive operations require bearer keys.

servers:
  - url: https://poke-mnky.moodmnky.com
    description: Production App
  - url: http://10.3.0.119:3000
    description: LAN Dev App

tags:
  - name: Sync
    description: Notion sync and job control
  - name: Pokemon
    description: Pokemon catalog query
  - name: Teams
    description: Team/roster/budget operations
  - name: Draft
    description: Draft and transaction operations
  - name: Matches
    description: Match scheduling and results
  - name: Discord
    description: Discord bot integration endpoints
  - name: Health
    description: Health and diagnostics

components:
  securitySchemes:
    NotionSyncBearer:
      type: http
      scheme: bearer
      bearerFormat: NOTION_SYNC_SECRET
      description: Server-to-server secret for Notion sync calls.
    DiscordBotBearer:
      type: http
      scheme: bearer
      bearerFormat: DISCORD_BOT_API_KEY
      description: Server-to-server secret for Discord bot calls.
    UserSession:
      type: apiKey
      in: cookie
      name: sb-session
      description: Example session cookie for authenticated users (replace with your auth approach).

  schemas:
    ErrorResponse:
      type: object
      required: [ok, error]
      properties:
        ok:
          type: boolean
          const: false
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              examples: [UNAUTHORIZED, VALIDATION_ERROR, NOT_FOUND, CONFLICT, INTERNAL_ERROR]
            message:
              type: string
            details:
              type: object
              additionalProperties: true

    JobStatus:
      type: object
      required: [job_id, status]
      properties:
        job_id:
          type: string
          format: uuid
        status:
          type: string
          enum: [queued, running, success, error]
        started_at:
          type: string
          format: date-time
          nullable: true
        finished_at:
          type: string
          format: date-time
          nullable: true
        details:
          type: object
          additionalProperties: true
          nullable: true
        error:
          type: string
          nullable: true

    SyncScope:
      type: string
      enum: [pokemon, role_tags, moves, coaches, teams, draft_pools, draft_picks, matches]

    SyncPullRequest:
      type: object
      required: [scope]
      properties:
        scope:
          type: array
          items:
            $ref: '#/components/schemas/SyncScope'
        dry_run:
          type: boolean
          default: false

    SyncPullIncrementalRequest:
      type: object
      required: [scope, since]
      properties:
        scope:
          type: array
          items:
            $ref: '#/components/schemas/SyncScope'
        since:
          type: string
          format: date-time
        dry_run:
          type: boolean
          default: false

    NotionWebhookEvent:
      type: object
      required: [type]
      properties:
        type:
          type: string
          examples: [page.updated, page.created, page.deleted]
        page_id:
          type: string
          nullable: true
        database_id:
          type: string
          nullable: true
        properties_changed:
          type: array
          items:
            type: string
          nullable: true
        raw:
          type: object
          additionalProperties: true
          nullable: true

    PokemonType:
      type: string
      enum:
        - normal
        - fire
        - water
        - electric
        - grass
        - ice
        - fighting
        - poison
        - ground
        - flying
        - psychic
        - bug
        - rock
        - ghost
        - dragon
        - dark
        - steel
        - fairy

    Pokemon:
      type: object
      required: [id, name, slug, eligible, type1]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        species_name:
          type: string
          nullable: true
        form:
          type: string
          nullable: true
        dex_number:
          type: integer
          nullable: true
        slug:
          type: string
        eligible:
          type: boolean
        type1:
          $ref: '#/components/schemas/PokemonType'
        type2:
          $ref: '#/components/schemas/PokemonType'
          nullable: true
        draft_points:
          type: integer
          nullable: true
        tier:
          type: string
          nullable: true
        abilities:
          type: object
          nullable: true
          properties:
            ability1: { type: string, nullable: true }
            ability2: { type: string, nullable: true }
            hidden_ability: { type: string, nullable: true }
        stats:
          type: object
          nullable: true
          properties:
            hp: { type: integer, nullable: true }
            atk: { type: integer, nullable: true }
            def: { type: integer, nullable: true }
            spa: { type: integer, nullable: true }
            spd: { type: integer, nullable: true }
            spe: { type: integer, nullable: true }
            bst: { type: integer, nullable: true }
        speeds:
          type: object
          nullable: true
          properties:
            speed_0_ev: { type: integer, nullable: true }
            speed_252_ev: { type: integer, nullable: true }
            speed_252_plus: { type: integer, nullable: true }
        defensive_profile:
          type: object
          nullable: true
          properties:
            weaknesses_ge_2x: { type: integer, nullable: true }
            resists_le_0_5x: { type: integer, nullable: true }
            immunities_eq_0x: { type: integer, nullable: true }
        roles:
          type: array
          items:
            type: string
          nullable: true

    PokemonSearchResponse:
      type: object
      required: [ok, results]
      properties:
        ok:
          type: boolean
          const: true
        results:
          type: array
          items:
            $ref: '#/components/schemas/Pokemon'

    TeamBudget:
      type: object
      required: [points_used, budget_remaining, slots_used, slots_remaining]
      properties:
        points_used:
          type: integer
        budget_remaining:
          type: integer
        slots_used:
          type: integer
        slots_remaining:
          type: integer
        draft_points_budget:
          type: integer
          nullable: true
        roster_size_max:
          type: integer
          nullable: true

    TeamRosterEntry:
      type: object
      required: [pokemon_id, pokemon_name, points_snapshot, acquisition, status]
      properties:
        pokemon_id:
          type: string
          format: uuid
        pokemon_name:
          type: string
        points_snapshot:
          type: integer
        acquisition:
          type: string
          enum: [draft, free_agency, trade, waiver]
        status:
          type: string
          enum: [active, dropped, traded_away, ir, banned]

    TeamRosterResponse:
      type: object
      required: [ok, team_id, season_id, roster, budget]
      properties:
        ok:
          type: boolean
          const: true
        team_id:
          type: string
          format: uuid
        season_id:
          type: string
          format: uuid
        roster:
          type: array
          items:
            $ref: '#/components/schemas/TeamRosterEntry'
        budget:
          $ref: '#/components/schemas/TeamBudget'

    DraftPickRequest:
      type: object
      required: [season_id, team_id, pokemon_id, acquisition]
      properties:
        season_id:
          type: string
          format: uuid
        team_id:
          type: string
          format: uuid
        pokemon_id:
          type: string
          format: uuid
        acquisition:
          type: string
          enum: [draft, free_agency, trade, waiver]
        draft_round:
          type: integer
          nullable: true
        pick_number:
          type: integer
          nullable: true
        notes:
          type: string
          nullable: true

    DraftPickResponse:
      type: object
      required: [ok, draft_pick_id, points_snapshot, team_budget]
      properties:
        ok:
          type: boolean
          const: true
        draft_pick_id:
          type: string
          format: uuid
        points_snapshot:
          type: integer
        team_budget:
          $ref: '#/components/schemas/TeamBudget'

    FreeAgencyTransactionRequest:
      type: object
      required: [season_id, team_id, drop_pokemon_id, add_pokemon_id]
      properties:
        season_id:
          type: string
          format: uuid
        team_id:
          type: string
          format: uuid
        drop_pokemon_id:
          type: string
          format: uuid
        add_pokemon_id:
          type: string
          format: uuid
        notes:
          type: string
          nullable: true

    MatchResultUpdateRequest:
      type: object
      required: [result]
      properties:
        result:
          type: string
          enum: [home_win, away_win, forfeit, no_contest]
        score:
          type: string
          nullable: true
        replay_url:
          type: string
          nullable: true
        reported_by:
          type: string
          enum: [discord, web, admin]
          nullable: true
        reported_by_user:
          type: string
          nullable: true

    CoverageCheckRequest:
      type: object
      required: [season_id, team_id, channel_id, checks]
      properties:
        season_id:
          type: string
          format: uuid
        team_id:
          type: string
          format: uuid
        channel_id:
          type: string
        checks:
          type: array
          items:
            type: string
            enum: [hazard_removal, hazard_setting, cleric, speed_control, recovery, phasing, screens]
        mention_role:
          type: string
          nullable: true
          description: Optional Discord role mention, e.g. "<@&ROLE_ID>"

    HealthResponse:
      type: object
      required: [ok, status, time]
      properties:
        ok:
          type: boolean
          const: true
        status:
          type: string
          enum: [healthy]
        time:
          type: string
          format: date-time

paths:
  /api/health:
    get:
      tags: [Health]
      summary: Health check
      responses:
        '200':
          description: Healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

  /api/sync/notion/pull:
    post:
      tags: [Sync]
      summary: Trigger full pull from Notion into Supabase
      security:
        - NotionSyncBearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SyncPullRequest'
      responses:
        '200':
          description: Job queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobStatus'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/sync/notion/pull/incremental:
    post:
      tags: [Sync]
      summary: Trigger incremental pull from Notion (since timestamp)
      security:
        - NotionSyncBearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SyncPullIncrementalRequest'
      responses:
        '200':
          description: Job queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobStatus'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/sync/notion/push:
    post:
      tags: [Sync]
      summary: Push Supabase changes to Notion (optional)
      security:
        - NotionSyncBearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SyncPullRequest'
      responses:
        '200':
          description: Job queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobStatus'

  /api/webhooks/notion:
    post:
      tags: [Sync]
      summary: Notion webhook receiver (optional)
      security:
        - NotionSyncBearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NotionWebhookEvent'
      responses:
        '200':
          description: Accepted
          content:
            application/json:
              schema:
                type: object
                required: [ok]
                properties:
                  ok:
                    type: boolean
                    const: true

  /api/pokemon:
    get:
      tags: [Pokemon]
      summary: Search/filter Pokemon catalog (roles, points, types, name)
      parameters:
        - name: q
          in: query
          required: false
          description: Free-text name search
          schema: { type: string }
        - name: name
          in: query
          required: false
          schema: { type: string }
        - name: slug
          in: query
          required: false
          schema: { type: string }
        - name: points_lte
          in: query
          required: false
          schema: { type: integer }
        - name: points_gte
          in: query
          required: false
          schema: { type: integer }
        - name: type1
          in: query
          required: false
          schema: { $ref: '#/components/schemas/PokemonType' }
        - name: type2
          in: query
          required: false
          schema: { $ref: '#/components/schemas/PokemonType' }
        - name: role
          in: query
          required: false
          description: Exact Role Tag name, e.g. "Hazard Remover: Defog"
          schema: { type: string }
        - name: eligible
          in: query
          required: false
          schema: { type: boolean, default: true }
        - name: limit
          in: query
          required: false
          schema: { type: integer, default: 50, minimum: 1, maximum: 200 }
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PokemonSearchResponse'

  /api/teams/{teamId}/roster:
    get:
      tags: [Teams]
      summary: Get team roster + budget (computed) for a season
      parameters:
        - name: teamId
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: seasonId
          in: query
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Roster and budget
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TeamRosterResponse'
        '404':
          description: Not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/draft/pick:
    post:
      tags: [Draft]
      summary: Create a draft pick / acquisition transaction (validated)
      security:
        - DiscordBotBearer: []
        - UserSession: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DraftPickRequest'
      responses:
        '200':
          description: Pick recorded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DraftPickResponse'
        '409':
          description: Conflict (already owned, pool restricted, etc.)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '422':
          description: Validation error (budget/slots rules)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/free-agency/transaction:
    post:
      tags: [Draft]
      summary: Drop + add transaction (free agency / waiver)
      security:
        - DiscordBotBearer: []
        - UserSession: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/FreeAgencyTransactionRequest'
      responses:
        '200':
          description: Transaction recorded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DraftPickResponse'
        '422':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/matches/{matchId}/result:
    post:
      tags: [Matches]
      summary: Record match result + replay link
      security:
        - DiscordBotBearer: []
        - UserSession: []
      parameters:
        - name: matchId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MatchResultUpdateRequest'
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema:
                type: object
                required: [ok]
                properties:
                  ok: { type: boolean, const: true }
        '404':
          description: Not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/discord/notify/coverage:
    post:
      tags: [Discord]
      summary: Ask the App to compute coverage checks and post a message to Discord
      security:
        - DiscordBotBearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CoverageCheckRequest'
      responses:
        '200':
          description: Sent
          content:
            application/json:
              schema:
                type: object
                required: [ok]
                properties:
                  ok: { type: boolean, const: true }
        '422':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
Implementation notes (important)
The OpenAPI spec intentionally leaves database IDs out of the contract. The App maps those internally.

Your Next.js API should implement strict validation and return:

422 for rule failures (budget/slots)

409 for conflicts (already drafted/illegal in pool)

Notion sync endpoints should enqueue a sync_jobs row and run workers via:

a server-side job runner

or an integration-worker container

2) Notion → Supabase mapping sheet (deterministic)
This assumes you are creating Notion databases with the properties we previously defined. The key for deterministic syncing is:

Every Notion record must have an immutable key:

Pokemon Catalog.Internal Slug → pokemon.slug

Role Tags.Role Tag → role_tags.name

Moves.Move Name → moves.name

A) Pokémon Catalog mapping
Notion Property (Pokemon Catalog)	Type	Supabase Column	Transform / Notes
Name (Title)	title	pokemon.name	Display name; include form suffix in Notion to keep UX aligned.
Species Name	text	pokemon.species_name	Optional, but recommended.
Form	select	pokemon.form	Normalize: None → none, Mega → mega, etc.
Pokédex #	number	pokemon.dex_number	Integer.
Internal Slug	text	pokemon.slug	Required; unique; lowercase kebab.
Eligible	checkbox	pokemon.eligible	Required.
Type 1	select	pokemon.type1	Normalize to enum values (fire, water, etc.).
Type 2	select	pokemon.type2	Null if “(none)”.
Draft Points	number	pokemon.draft_points	Current canonical points (picks store snapshots).
Tier	select	pokemon.tier	Keep as text or validate against allowed tiers.
Ban / Restriction Notes	text	pokemon.restriction_notes	Optional but recommended for audit trail.
Sprite (Primary)	files	pokemon.sprite_primary_url	Prefer URL: store hosted asset URL (Supabase Storage or external).
BW Sprite URL	url	pokemon.sprite_bw_url	Direct map.
Serebii Sprite URL	url	pokemon.sprite_serebii_url	Direct map.
Home Sprite URL	url	pokemon.sprite_home_url	Direct map.
HP	number	pokemon.hp	Integer.
Atk	number	pokemon.atk	Integer.
Def	number	pokemon.def	Integer.
SpA	number	pokemon.spa	Integer.
SpD	number	pokemon.spd	Integer.
Spe	number	pokemon.spe	Integer.
Speed @ 0 EV	number	pokemon.speed_0_ev	Integer.
Speed @ 252 EV	number	pokemon.speed_252_ev	Integer.
Speed @ 252+	number	pokemon.speed_252_plus	Integer.
Ability 1	select	pokemon.ability1	Store raw name.
Ability 2	select	pokemon.ability2	Store raw name or null.
Hidden Ability	select	pokemon.hidden_ability	Store raw name or null.
vs Normal ... vs Fairy	number	pokemon.vs_*	Numeric(4,2). Use exact multipliers (0, 0.25, 0.5, 1, 2, 4).
Role Tags (relation)	relation	join table	Populate pokemon_role_tags by resolving Role Tag name → ID.
Signature Utility Moves (relation)	relation	join table	Populate pokemon_moves_utility by resolving Move name → ID.
GitHub Name	text	pokemon.github_name	Optional (keep if you already use).
Smogon Name	text	pokemon.smogon_name	Optional.
PokemonDB Name	text	pokemon.pokemondb_name	Optional.
Smogon URL	url	pokemon.smogon_url	Optional.
PokemonDB URL	url	pokemon.pokemondb_url	Optional.
Required Notion data-quality rules for Pokémon
Internal Slug must exist and be unique

Type 1 must exist

All vs_* multipliers must be numeric if you are using defensive formulas/analytics

B) Role Tags mapping (canonical production taxonomy)
Notion Property (Role Tags DB)	Type	Supabase Column	Transform / Notes
Role Tag (Title)	title	role_tags.name	Must follow: <Category>: <Mechanism> exactly. Unique.
Category	select	role_tags.category	Normalize to enum mapping (below).
Notes	text	role_tags.notes	Optional.
Move (relation → Moves)	relation	join table	Populate role_tag_moves (optional but recommended).
Pokemon (relation → Pokemon Catalog)	relation	join table	Populate pokemon_role_tags.
Category normalization map (Notion → enum):

Hazard Setter → hazard_setter

Hazard Remover → hazard_remover

Cleric → cleric

Pivot → pivot

Phasing → phasing

Priority → priority

Recovery → recovery

Screens → screens

Status Utility → status_utility

Win Condition → win_condition

Anti-Setup → anti_setup

Disruption → disruption

Weather / Terrain → weather_terrain

Support (General) → support_general

Mechanism derivation rule:

role_tags.mechanism should be the substring after ": " in Role Tag name.

Example: Hazard Remover: Defog → mechanism = Defog

C) Moves mapping
Notion Property (Moves DB)	Type	Supabase Column	Transform / Notes
Move Name (Title)	title	moves.name	Unique.
Type	select	moves.type	Normalize to enum.
Category	select	moves.category	Use physical/special/status (lowercase recommended).
Power	number	moves.power	Integer or null.
Accuracy	number	moves.accuracy	Integer or null.
PP	number	moves.pp	Integer or null.
Priority	number	moves.priority	Integer or null.
Tags	multi-select	moves.tags	Store as text[] (lowercase recommended).
D) Teams / Coaches mapping (league ops)
Coaches Notion DB → coaches

Coach (Title) → coaches.coach_name

Discord Handle → coaches.discord_handle

Showdown Username → coaches.showdown_username (case-insensitive)

Active → coaches.active

Notes → coaches.notes

Teams Notion DB → teams

Team Name (Title) → teams.team_name

Franchise Key → teams.franchise_key (unique recommended)

Coach (relation) → teams.coach_id (resolve by coach name or notion mapping)

Deterministic sync algorithm (recommended)
1) Upsert reference tables first
Order:

Moves (upsert by moves.name)

Role Tags (upsert by role_tags.name)

Pokémon (upsert by pokemon.slug)

2) Then rebuild join tables deterministically
For each Pokémon row from Notion:

Resolve Pokémon by slug

Get current set of Role Tag names from relation

Replace rows in pokemon_role_tags for that Pokémon:

delete where pokemon_id = X

insert (pokemon_id, role_tag_id) for each resolved role tag

Repeat similarly for pokemon_moves_utility

For each Role Tag row:

If Move relation exists:

delete where role_tag_id = Y

insert (role_tag_id, move_id) for each linked move (usually 1)

3) Maintain Notion ID mappings
For every Notion page processed:

upsert into notion_mappings:

notion_page_id

entity_type

entity_id

This is what makes incremental syncs reliable.

What I recommend you do next (execution-ready)
If you want this to be truly production-grade end-to-end, the next build artifacts should be:

Validation layer spec for /api/draft/pick and /api/free-agency/transaction

pool inclusion checks

uniqueness checks

budget and roster enforcement

“locked pool” enforcement

Discord message templates for draft confirmations and coverage reports

consistent, readable, and searchable logs

If you tell me whether you want “strict commissioner control” (only admins can mutate picks) or “coach self-service” (coaches can submit transactions), I’ll produce the exact validation logic and RLS policy set accordingly.

You said:
coaches can submit transactions. you may proceed
ChatGPT said:
Below is an execution-ready, production-grade spec for coach self-service transactions, including:

Validation logic for /api/draft/pick and /api/free-agency/transaction

Supabase RLS + helper functions (secure, coach-scoped writes)

Discord message templates (draft, FA, drops, errors, coverage)

This assumes:

Coaches authenticate in the web app (Supabase Auth).

Discord bot uses its own bearer key and calls the same endpoints.

The App API is authoritative for validations (recommended), while RLS provides a strong backstop.

1) Validation Layer Specification (App API)
Core invariants (must hold)
These rules apply to any acquisition that creates or changes a roster state:

A. Season + Team membership
team_id must be registered in season_teams for season_id.

Caller must be the coach of team_id (or an admin).

B. Pool legality
Identify the season’s active pool:

Either draft_pools.locked = true and “current” (most recent locked for season), or if multiple, pick by created_at desc.

Pokémon must exist in draft_pool_pokemon with included = true.

If pool is locked and Pokémon is excluded, reject.

C. Uniqueness
A Pokémon cannot be owned by more than one team in the same season.

Enforced by:

App-level pre-check AND

DB-level unique(season_id, pokemon_id) constraint in draft_picks.

D. Budget compliance (points)
Use points_snapshot (from current pokemon.draft_points) at time of acquisition.

After acquisition:

sum(points_snapshot WHERE status='active' AND season_id AND team_id) <= seasons.draft_points_budget

E. Roster size compliance
After acquisition:

count(active picks) <= seasons.roster_size_max

For acquisitions that are “replace” operations (FA drop+add), enforce:

roster count remains stable (or within min/max if your rules allow temporary overflow).

F. Transaction windows (optional but recommended)
Draft: only allowed during draft window dates/times

Free agency: only allowed when FA is open

Waivers: only allowed after waiver processing windows

Implement via a season_rules table or a JSON config in seasons (if you prefer).

Endpoint: POST /api/draft/pick
Intended usage
Draft pick entry during live draft OR commissioner-run import of picks.

Also usable for “trade” acquisitions if you keep it generalized.

Required request fields
season_id, team_id, pokemon_id, acquisition

Validation steps (ordered)
AuthZ: caller is coach of team_id (or admin)

Season membership: season_teams contains (season_id, team_id)

Pool legality: Pokémon included in active pool (if a pool exists / locked)

Uniqueness:

Check if any row exists in draft_picks with (season_id, pokemon_id)

If exists, return 409 CONFLICT

Budget/roster pre-check (compute hypothetical):

points_snapshot = pokemon.draft_points (must not be null)

points_used = sum(active points_snapshot)

slots_used = count(active)

if points_used + points_snapshot > budget → 422

if slots_used + 1 > roster_size_max → 422

Write:

Insert into draft_picks with points_snapshot

Return:

pick id + updated budget/slots

Failure codes
401 unauthorized

403 caller not coach of team

404 season/team/pokemon not found

409 pokemon already owned in season

422 budget/roster/pool rule failure

Endpoint: POST /api/free-agency/transaction
Intended usage
Atomic “drop + add” in one call, which is critical to prevent roster/budget races.

Required request fields
season_id, team_id, drop_pokemon_id, add_pokemon_id

Validation steps (ordered)
AuthZ: caller is coach of team_id (or admin)

Season membership: team is in season

Drop ownership check:

Must exist an active pick for (season_id, team_id, drop_pokemon_id)

Add legality:

pool inclusion for add_pokemon_id

uniqueness in season for add_pokemon_id (no existing pick in season)

Compute hypothetical budget:

current active total points

subtract dropped Pokémon’s points_snapshot (from the active pick row being dropped)

add new Pokémon pokemon.draft_points as the new snapshot

enforce <= budget

Write atomically (transaction)

Update the dropped pick:

set status='dropped', end_date=today

Insert new pick row:

acquisition='free_agency', status='active', points_snapshot=current pokemon points

Return updated budget/slots

Concurrency and correctness (must)
Use a DB transaction with row-level locks:

lock the team’s active picks for that season (or at minimum lock the dropped pick row)

lock the add Pokémon uniqueness check by relying on the unique constraint + retry handling

If insert fails due to uniqueness constraint, return 409.

2) Supabase RLS + Helper Functions (Coach Self-Service)
Recommended approach
Coaches can write only through RPC functions, not directly to tables.

This lets you enforce atomicity and complex validations in SQL.

RLS then becomes:

Allow coaches to select what they need

Allow execute on RPCs

Disallow direct inserts/updates to draft_picks for non-admins

If you prefer “API-only writes” (service role), you can simplify RLS; but for coach self-service via client, RPC is the safest.

Required supporting tables/columns (minimal)
coaches.user_id references auth.users(id)

teams.coach_id references coaches(id)

season_teams(season_id, team_id) exists

(Optional) profiles table with role for admin; otherwise you can hardcode admin list.

Helper SQL: “Is coach of team?”
create or replace function public.is_coach_of_team(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.teams t
    join public.coaches c on c.id = t.coach_id
    where t.id = p_team_id
      and c.user_id = auth.uid()
  );
$$;
Helper SQL: “Is admin?”
If you already have profiles(role), use it. If not, create a simple table:

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;
RLS policies (recommended baseline)
Enable RLS
alter table public.draft_picks enable row level security;
alter table public.matches enable row level security;
alter table public.teams enable row level security;
alter table public.coaches enable row level security;
alter table public.seasons enable row level security;
alter table public.season_teams enable row level security;
alter table public.draft_pools enable row level security;
alter table public.draft_pool_pokemon enable row level security;
Public read for reference data
alter table public.pokemon enable row level security;
alter table public.moves enable row level security;
alter table public.role_tags enable row level security;
alter table public.pokemon_role_tags enable row level security;

create policy "public read pokemon" on public.pokemon
for select using (true);

create policy "public read moves" on public.moves
for select using (true);

create policy "public read role_tags" on public.role_tags
for select using (true);

create policy "public read pokemon_role_tags" on public.pokemon_role_tags
for select using (true);
Coaches read their own coach record
create policy "coach reads self" on public.coaches
for select using (user_id = auth.uid() or public.is_admin());
Teams readable to authenticated users (or public if desired)
create policy "read teams" on public.teams
for select using (true);
Draft picks readable to all authenticated users (typical league transparency)
create policy "read draft picks" on public.draft_picks
for select using (true);
Prevent direct writes to draft_picks for coaches
Do not create insert/update/delete policies for non-admins. Admin-only if needed:

create policy "admin writes draft picks" on public.draft_picks
for all using (public.is_admin()) with check (public.is_admin());
This forces coaches to use RPCs.

RPC: submit draft pick (coach self-service)
This function:

enforces auth

validates pool legality

validates uniqueness

validates budget/slots

inserts draft_picks

create or replace function public.rpc_submit_draft_pick(
  p_season_id uuid,
  p_team_id uuid,
  p_pokemon_id uuid,
  p_acquisition acquisition_type,
  p_draft_round int default null,
  p_pick_number int default null,
  p_notes text default null
)
returns table (
  draft_pick_id uuid,
  points_snapshot int,
  points_used int,
  budget_remaining int,
  slots_used int,
  slots_remaining int
)
language plpgsql
security definer
as $$
declare
  v_budget int;
  v_roster_max int;
  v_points_snapshot int;
  v_points_used int;
  v_slots_used int;
  v_pool_id uuid;
  v_included boolean;
begin
  -- AuthZ
  if not (public.is_admin() or public.is_coach_of_team(p_team_id)) then
    raise exception 'FORBIDDEN';
  end if;

  -- Membership
  if not exists (select 1 from public.season_teams st where st.season_id = p_season_id and st.team_id = p_team_id) then
    raise exception 'TEAM_NOT_IN_SEASON';
  end if;

  -- Load season rules
  select draft_points_budget, roster_size_max
  into v_budget, v_roster_max
  from public.seasons
  where id = p_season_id;

  if v_budget is null then
    raise exception 'SEASON_NOT_FOUND';
  end if;

  -- Snapshot points from pokemon
  select draft_points into v_points_snapshot from public.pokemon where id = p_pokemon_id;
  if v_points_snapshot is null then
    raise exception 'POKEMON_POINTS_MISSING';
  end if;

  -- Pool check (if there is a locked pool for season)
  select id into v_pool_id
  from public.draft_pools
  where season_id = p_season_id and locked = true
  order by created_at desc
  limit 1;

  if v_pool_id is not null then
    select included into v_included
    from public.draft_pool_pokemon
    where draft_pool_id = v_pool_id and pokemon_id = p_pokemon_id;

    if v_included is distinct from true then
      raise exception 'POKEMON_NOT_IN_POOL';
    end if;
  end if;

  -- Current totals (active)
  select coalesce(sum(points_snapshot),0), coalesce(count(*),0)
  into v_points_used, v_slots_used
  from public.draft_picks
  where season_id = p_season_id and team_id = p_team_id and status = 'active';

  -- Budget/slots validations
  if v_points_used + v_points_snapshot > v_budget then
    raise exception 'BUDGET_EXCEEDED';
  end if;

  if v_slots_used + 1 > v_roster_max then
    raise exception 'ROSTER_FULL';
  end if;

  -- Insert (uniqueness guarded by uq_season_pokemon_unique)
  insert into public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, draft_round, pick_number,
    status, start_date, points_snapshot, notes
  ) values (
    p_season_id, p_team_id, p_pokemon_id,
    p_acquisition, p_draft_round, p_pick_number,
    'active', current_date, v_points_snapshot, p_notes
  )
  returning id into draft_pick_id;

  -- Recompute after insert
  select coalesce(sum(points_snapshot),0), coalesce(count(*),0)
  into v_points_used, v_slots_used
  from public.draft_picks
  where season_id = p_season_id and team_id = p_team_id and status = 'active';

  return query
  select
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

exception
  when unique_violation then
    raise exception 'POKEMON_ALREADY_OWNED';
end $$;

-- Allow authenticated users to execute RPC
revoke all on function public.rpc_submit_draft_pick(uuid,uuid,uuid,acquisition_type,int,int,text) from public;
grant execute on function public.rpc_submit_draft_pick(uuid,uuid,uuid,acquisition_type,int,int,text) to authenticated;
Important: security definer means the function runs with owner privileges. Keep the function body strict and never trust inputs.

RPC: free agency drop+add (atomic)
create or replace function public.rpc_free_agency_transaction(
  p_season_id uuid,
  p_team_id uuid,
  p_drop_pokemon_id uuid,
  p_add_pokemon_id uuid,
  p_notes text default null
)
returns table (
  dropped_pick_id uuid,
  added_pick_id uuid,
  added_points_snapshot int,
  points_used int,
  budget_remaining int,
  slots_used int,
  slots_remaining int
)
language plpgsql
security definer
as $$
declare
  v_budget int;
  v_roster_max int;

  v_drop_pick_id uuid;
  v_drop_points int;

  v_add_points int;

  v_points_used int;
  v_slots_used int;

  v_pool_id uuid;
  v_included boolean;
begin
  if not (public.is_admin() or public.is_coach_of_team(p_team_id)) then
    raise exception 'FORBIDDEN';
  end if;

  if not exists (select 1 from public.season_teams st where st.season_id = p_season_id and st.team_id = p_team_id) then
    raise exception 'TEAM_NOT_IN_SEASON';
  end if;

  select draft_points_budget, roster_size_max
  into v_budget, v_roster_max
  from public.seasons
  where id = p_season_id;

  if v_budget is null then
    raise exception 'SEASON_NOT_FOUND';
  end if;

  -- Lock + locate the active pick being dropped
  select id, points_snapshot
  into v_drop_pick_id, v_drop_points
  from public.draft_picks
  where season_id = p_season_id
    and team_id = p_team_id
    and pokemon_id = p_drop_pokemon_id
    and status = 'active'
  for update;

  if v_drop_pick_id is null then
    raise exception 'DROP_NOT_OWNED';
  end if;

  -- Pool legality for add
  select id into v_pool_id
  from public.draft_pools
  where season_id = p_season_id and locked = true
  order by created_at desc
  limit 1;

  if v_pool_id is not null then
    select included into v_included
    from public.draft_pool_pokemon
    where draft_pool_id = v_pool_id and pokemon_id = p_add_pokemon_id;

    if v_included is distinct from true then
      raise exception 'ADD_NOT_IN_POOL';
    end if;
  end if;

  -- Snapshot points for add
  select draft_points into v_add_points from public.pokemon where id = p_add_pokemon_id;
  if v_add_points is null then
    raise exception 'ADD_POINTS_MISSING';
  end if;

  -- Compute current totals
  select coalesce(sum(points_snapshot),0), coalesce(count(*),0)
  into v_points_used, v_slots_used
  from public.draft_picks
  where season_id = p_season_id and team_id = p_team_id and status = 'active';

  -- Hypothetical budget after swap
  if (v_points_used - v_drop_points + v_add_points) > v_budget then
    raise exception 'BUDGET_EXCEEDED';
  end if;

  -- Execute atomic swap
  update public.draft_picks
  set status = 'dropped',
      end_date = current_date,
      notes = coalesce(notes,'') || case when p_notes is null then '' else E'\n' || p_notes end
  where id = v_drop_pick_id;

  insert into public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, status, start_date, points_snapshot, notes
  ) values (
    p_season_id, p_team_id, p_add_pokemon_id,
    'free_agency', 'active', current_date, v_add_points, p_notes
  )
  returning id into added_pick_id;

  dropped_pick_id := v_drop_pick_id;
  added_points_snapshot := v_add_points;

  -- Return updated totals
  select coalesce(sum(points_snapshot),0), coalesce(count(*),0)
  into v_points_used, v_slots_used
  from public.draft_picks
  where season_id = p_season_id and team_id = p_team_id and status = 'active';

  return query
  select
    dropped_pick_id,
    added_pick_id,
    added_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

exception
  when unique_violation then
    raise exception 'ADD_ALREADY_OWNED';
end $$;

revoke all on function public.rpc_free_agency_transaction(uuid,uuid,uuid,uuid,text) from public;
grant execute on function public.rpc_free_agency_transaction(uuid,uuid,uuid,uuid,text) to authenticated;
How your Next.js endpoints should use these RPCs
Even if you keep App API validation, the cleanest implementation is:

Web client calls your Next.js API

Next.js API calls Supabase RPC using user session (not service role), so RLS/auth.uid() is the coach

For Discord bot, Next.js uses service role but passes an “act as” mechanism only if you want bot-submitted picks on behalf of a coach; otherwise bot endpoints remain separate and admin-only.

If you want the bot to submit on behalf of a coach, do it explicitly:

require team_id

verify bot key

check team coach exists

call an admin-only RPC that bypasses auth.uid and uses team coach linkage carefully

3) Discord Message Templates (Production-Grade)
These templates are intentionally consistent, searchable, and “log friendly.”

A) Draft pick confirmation
Title: Draft Pick Confirmed
Body:

Team: {team_name}

Pick: R{round} · #{pick_number}

Pokémon: {pokemon_name}

Cost: {points_snapshot} pts

Budget: {points_used}/{budget_total} (Remaining: {budget_remaining})

Slots: {slots_used}/{roster_max} (Remaining: {slots_remaining})

Example:

[Draft Pick Confirmed]
Team: Lumiose Legends
Pick: R3 · #21
Pokémon: Mandibuzz
Cost: 10 pts
Budget: 78/120 (Remaining: 42)
Slots: 6/10 (Remaining: 4)
B) Free agency transaction confirmation
Title: Free Agency Transaction Confirmed
Body:

Team: {team_name}

Dropped: {drop_name} (was `{drop_points_snapshot} pts)

Added: {add_name} (`{add_points_snapshot} pts)

Budget Remaining: {budget_remaining}

Slots Remaining: {slots_remaining}

Notes: {optional}

Example:

[Free Agency Transaction Confirmed]
Team: Lumiose Legends
Dropped: Skarmory (14 pts)
Added: Corviknight (15 pts)
Budget Remaining: 27
Slots Remaining: 0
C) Rule failure (human-readable)
Title: Transaction Rejected
Body:

Team: {team_name}

Reason: {friendly_reason}

Details: {structured_details}

Next Step: {suggestion}

Reason map (recommend)

BUDGET_EXCEEDED → “Budget exceeded”

ROSTER_FULL → “Roster is full”

POKEMON_ALREADY_OWNED → “Pokémon already owned this season”

POKEMON_NOT_IN_POOL → “Pokémon not legal in current pool”

DROP_NOT_OWNED → “You do not currently own the Pokémon you tried to drop”

Example:

[Transaction Rejected]
Team: Lumiose Legends
Reason: Budget exceeded
Details: Current 118/120, attempted add cost 5
Next Step: Drop a higher-cost Pokémon or choose a cheaper add.
D) Coverage report (pre-week)
Title: Roster Coverage Report
Sections (only show failures):

Hazard Removal: ✅/❌

Hazard Setting: ✅/❌

Cleric: ✅/❌

Recovery: ✅/❌

Screens: ✅/❌

Phasing: ✅/❌

Speed Control: ✅/❌ (computed via priority roles + speed thresholds)

Include “Suggested Fix” lines (optional):

“Cheapest legal hazard removal under 10 pts: …”

“Top 3 available clerics: …”

Example:

[Roster Coverage Report]
Team: Lumiose Legends
Season: AAB S6 (Gen9)

Hazard Removal: ❌
Cleric: ❌
Recovery: ✅

Suggested Adds (available):
- Mandibuzz (Hazard Remover: Defog) — 10 pts
- Tsareena (Hazard Remover: Rapid Spin) — 9 pts
- Sylveon (Cleric: Heal Bell) — 13 pts
4) What you should implement next (concrete build steps)
Step 1 — Add the RPCs + RLS policies
Apply the helper functions + admin_users + RPCs

Ensure draft_picks has admin-only direct write policies

Step 2 — Update Next.js endpoints
/api/draft/pick should call rpc_submit_draft_pick

/api/free-agency/transaction should call rpc_free_agency_transaction

Map RPC exceptions to:

403/409/422 consistently

include a friendly message + machine code

Step 3 — Discord bot formatting
Centralize message builders (one file)

Always include Team, Season, Budget, Slots

Log the raw transaction payload server-side for audit

If you want, I can also provide the exact TypeScript request validation (zod) and the Next.js route handlers for these endpoints using @supabase/ssr patterns you already standardized, plus a minimal Discord.js v14 command scaffold that calls them.

You said:
yes please
ChatGPT said:
Below is an implementation-ready scaffold for:

Zod request validation

Next.js App Router route handlers for:

POST /api/draft/pick

POST /api/free-agency/transaction

A minimal Discord.js v14 command scaffold that calls those endpoints and posts formatted messages.

This is aligned with your @supabase/ssr + awaited cookies + getAll/setAll pattern.

A) Shared server utilities
src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // When called from a Server Component, `set` can throw.
            // Route handlers are OK; components may not be.
          }
        },
      },
    }
  );
}
src/lib/api/errors.ts
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RULE_VIOLATION"
  | "INTERNAL_ERROR";

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return Response.json(
    { ok: false, error: { code, message, details } },
    { status }
  );
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}
B) Zod schemas + validation helpers
src/lib/validation/draft.ts
import { z } from "zod";

export const AcquisitionType = z.enum(["draft", "free_agency", "trade", "waiver"]);

export const DraftPickRequestSchema = z.object({
  season_id: z.string().uuid(),
  team_id: z.string().uuid(),
  pokemon_id: z.string().uuid(),
  acquisition: AcquisitionType,
  draft_round: z.number().int().positive().optional().nullable(),
  pick_number: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type DraftPickRequest = z.infer<typeof DraftPickRequestSchema>;

export const FreeAgencyTransactionRequestSchema = z.object({
  season_id: z.string().uuid(),
  team_id: z.string().uuid(),
  drop_pokemon_id: z.string().uuid(),
  add_pokemon_id: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
});

export type FreeAgencyTransactionRequest = z.infer<
  typeof FreeAgencyTransactionRequestSchema
>;
src/lib/validation/parse.ts
import { ZodSchema } from "zod";

export async function parseJson<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const raw = await req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    const err = new Error("VALIDATION_ERROR");
    (err as any).issues = issues;
    throw err;
  }
  return result.data;
}
C) RPC error mapping (Supabase function exceptions → HTTP)
Your RPCs raise exceptions like:

FORBIDDEN

TEAM_NOT_IN_SEASON

POKEMON_NOT_IN_POOL

POKEMON_ALREADY_OWNED

BUDGET_EXCEEDED

ROSTER_FULL

DROP_NOT_OWNED

ADD_ALREADY_OWNED
etc.

src/lib/supabase/rpc-error-map.ts
import { jsonError } from "@/lib/api/errors";

type RpcErr = { message?: string; code?: string; details?: unknown; hint?: string };

function normalize(msg?: string) {
  return (msg ?? "").trim();
}

export function mapRpcError(err: RpcErr) {
  const msg = normalize(err.message);

  // You can make this more robust by standardizing exception messages.
  switch (msg) {
    case "FORBIDDEN":
      return jsonError(403, "FORBIDDEN", "You are not allowed to submit transactions for this team.");
    case "TEAM_NOT_IN_SEASON":
      return jsonError(422, "RULE_VIOLATION", "Team is not registered for this season.");
    case "POKEMON_NOT_IN_POOL":
    case "ADD_NOT_IN_POOL":
      return jsonError(409, "CONFLICT", "That Pokémon is not legal in the current draft pool.");
    case "POKEMON_ALREADY_OWNED":
    case "ADD_ALREADY_OWNED":
      return jsonError(409, "CONFLICT", "That Pokémon is already owned in this season.");
    case "BUDGET_EXCEEDED":
      return jsonError(422, "RULE_VIOLATION", "Budget exceeded.");
    case "ROSTER_FULL":
      return jsonError(422, "RULE_VIOLATION", "Roster is full.");
    case "DROP_NOT_OWNED":
      return jsonError(422, "RULE_VIOLATION", "You do not currently own the Pokémon you tried to drop.");
    case "SEASON_NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "Season not found.");
    case "POKEMON_POINTS_MISSING":
    case "ADD_POINTS_MISSING":
      return jsonError(422, "RULE_VIOLATION", "Pokémon points are not configured for this entry.");
    default:
      return jsonError(500, "INTERNAL_ERROR", "Unexpected server error.", {
        message: err.message,
        code: err.code,
        hint: err.hint,
      });
  }
}
D) Next.js route handlers (App Router)
src/app/api/draft/pick/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseJson } from "@/lib/validation/parse";
import { DraftPickRequestSchema } from "@/lib/validation/draft";
import { jsonError, jsonOk } from "@/lib/api/errors";
import { mapRpcError } from "@/lib/supabase/rpc-error-map";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Must be authenticated (coach self-service)
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    const body = await parseJson(req, DraftPickRequestSchema);

    const { data, error } = await supabase.rpc("rpc_submit_draft_pick", {
      p_season_id: body.season_id,
      p_team_id: body.team_id,
      p_pokemon_id: body.pokemon_id,
      p_acquisition: body.acquisition,
      p_draft_round: body.draft_round ?? null,
      p_pick_number: body.pick_number ?? null,
      p_notes: body.notes ?? null,
    });

    if (error) return mapRpcError(error);

    // RPC returns a table; Supabase JS returns array for set-returning functions
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.draft_pick_id) {
      return jsonError(500, "INTERNAL_ERROR", "RPC returned no result.");
    }

    return jsonOk({
      draft_pick_id: row.draft_pick_id,
      points_snapshot: row.points_snapshot,
      team_budget: {
        points_used: row.points_used,
        budget_remaining: row.budget_remaining,
        slots_used: row.slots_used,
        slots_remaining: row.slots_remaining,
      },
    });
  } catch (e: any) {
    if (e?.message === "VALIDATION_ERROR") {
      return jsonError(422, "VALIDATION_ERROR", "Invalid request body.", {
        issues: e.issues ?? [],
      });
    }
    return jsonError(500, "INTERNAL_ERROR", "Unhandled error.", { message: String(e?.message ?? e) });
  }
}
src/app/api/free-agency/transaction/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseJson } from "@/lib/validation/parse";
import { FreeAgencyTransactionRequestSchema } from "@/lib/validation/draft";
import { jsonError, jsonOk } from "@/lib/api/errors";
import { mapRpcError } from "@/lib/supabase/rpc-error-map";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    const body = await parseJson(req, FreeAgencyTransactionRequestSchema);

    const { data, error } = await supabase.rpc("rpc_free_agency_transaction", {
      p_season_id: body.season_id,
      p_team_id: body.team_id,
      p_drop_pokemon_id: body.drop_pokemon_id,
      p_add_pokemon_id: body.add_pokemon_id,
      p_notes: body.notes ?? null,
    });

    if (error) return mapRpcError(error);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.added_pick_id) {
      return jsonError(500, "INTERNAL_ERROR", "RPC returned no result.");
    }

    return jsonOk({
      dropped_pick_id: row.dropped_pick_id,
      added_pick_id: row.added_pick_id,
      points_snapshot: row.added_points_snapshot,
      team_budget: {
        points_used: row.points_used,
        budget_remaining: row.budget_remaining,
        slots_used: row.slots_used,
        slots_remaining: row.slots_remaining,
      },
    });
  } catch (e: any) {
    if (e?.message === "VALIDATION_ERROR") {
      return jsonError(422, "VALIDATION_ERROR", "Invalid request body.", {
        issues: e.issues ?? [],
      });
    }
    return jsonError(500, "INTERNAL_ERROR", "Unhandled error.", { message: String(e?.message ?? e) });
  }
}
E) Client-side calling pattern (coach self-service)
Because these endpoints use the user session cookie, calls should be same-origin:

export async function submitDraftPick(payload: {
  season_id: string;
  team_id: string;
  pokemon_id: string;
  acquisition: "draft" | "free_agency" | "trade" | "waiver";
  draft_round?: number | null;
  pick_number?: number | null;
  notes?: string | null;
}) {
  const res = await fetch("/api/draft/pick", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Request failed");
  return json;
}
F) Discord.js v14 minimal command scaffold
This assumes the bot calls your App API server-to-server. Since you want coach self-service, you have two common patterns:

Pattern 1 (recommended): bot only assists; coach submits in-app
Bot posts links/buttons and status, but doesn’t execute transactions.

Pattern 2: bot submits transactions on behalf of a coach
Requires a mapping: discord_user_id → coach/team_id, plus explicit authorization.

This is doable; if you want it, add a coach_discord_user_id column and a bot-only RPC.

Below is Pattern 1 + a “report” command, and a Pattern 2-ready “submit pick” example that expects the user to provide team_id and season_id explicitly (still not perfect auth, but scaffolds the wiring).

Bot HTTP client
src/bot/http.ts
export async function appPost<T>(
  path: string,
  body: unknown,
  botKey: string
): Promise<T> {
  const res = await fetch(`${process.env.APP_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}
Slash command example: /coverage
src/bot/commands/coverage.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { appPost } from "../http";

export const data = new SlashCommandBuilder()
  .setName("coverage")
  .setDescription("Run roster coverage checks and post results to this channel.")
  .addStringOption((opt) =>
    opt.setName("season_id").setDescription("Season UUID").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("team_id").setDescription("Team UUID").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const season_id = interaction.options.getString("season_id", true);
  const team_id = interaction.options.getString("team_id", true);

  try {
    await appPost(
      "/api/discord/notify/coverage",
      {
        season_id,
        team_id,
        channel_id: interaction.channelId,
        checks: ["hazard_removal", "hazard_setting", "cleric", "recovery", "speed_control"],
      },
      process.env.DISCORD_BOT_API_KEY!
    );

    await interaction.editReply("Coverage report posted.");
  } catch (e: any) {
    await interaction.editReply(`Failed: ${String(e?.message ?? e)}`);
  }
}
(Optional) Slash command example: /draftpick (Pattern 2 wiring)
This assumes you implement a bot-auth endpoint variant (or a bot-only RPC). If you haven’t yet, keep this command disabled.

src/bot/commands/draftpick.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { appPost } from "../http";

export const data = new SlashCommandBuilder()
  .setName("draftpick")
  .setDescription("Submit a draft pick (requires bot-enabled transactions).")
  .addStringOption((opt) => opt.setName("season_id").setDescription("Season UUID").setRequired(true))
  .addStringOption((opt) => opt.setName("team_id").setDescription("Team UUID").setRequired(true))
  .addStringOption((opt) => opt.setName("pokemon_id").setDescription("Pokemon UUID").setRequired(true))
  .addIntegerOption((opt) => opt.setName("round").setDescription("Draft round").setRequired(false))
  .addIntegerOption((opt) => opt.setName("pick").setDescription("Pick number").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const season_id = interaction.options.getString("season_id", true);
  const team_id = interaction.options.getString("team_id", true);
  const pokemon_id = interaction.options.getString("pokemon_id", true);
  const draft_round = interaction.options.getInteger("round");
  const pick_number = interaction.options.getInteger("pick");

  try {
    const result = await appPost<any>(
      "/api/draft/pick",
      {
        season_id,
        team_id,
        pokemon_id,
        acquisition: "draft",
        draft_round,
        pick_number,
        notes: `Submitted via Discord by ${interaction.user.tag}`,
      },
      process.env.DISCORD_BOT_API_KEY!
    );

    await interaction.editReply(
      `Recorded. Remaining budget: ${result.team_budget.budget_remaining}, slots remaining: ${result.team_budget.slots_remaining}`
    );
  } catch (e: any) {
    await interaction.editReply(`Rejected: ${String(e?.message ?? e)}`);
  }
}
G) Add bot-key auth to your Next.js endpoints (only if you enable bot-submitted transactions)
Right now the route handlers require a user session cookie. If you want bot writes too, add:

If Authorization: Bearer DISCORD_BOT_API_KEY header matches, allow RPC call using service role and an admin/bot-only RPC (recommended)

Do not reuse the same coach RPC unless you have an impersonation design you trust.

If you tell me which exact pattern you want:

bot can submit picks only during draft and only for registered coaches, or

bot never submits picks, only reports + links,
I’ll provide the cleanest secure implementation for that path (including the bot-only RPC and the minimal discord_user_id → coach_id/team_id mapping table + policies).

You said:
lets go with 1
ChatGPT said:
Understood. Below is a production-grade Pattern 1 implementation:

The bot can submit picks only during the draft window

Only for registered coaches

Only for the coach’s own team

With auditable logs

Without exposing service-role keys to the bot

This approach uses:

a coach_discord_id mapping

a draft_window config (per season)

a bot-only RPC that validates everything and writes atomically

strict RLS: bot never directly writes tables; it only executes the RPC

1) Database additions (mapping + season draft window + audit)
A) Add discord user id to coaches
alter table public.coaches
add column if not exists discord_user_id text;

create index if not exists idx_coaches_discord_user_id
on public.coaches(discord_user_id);
Store Discord snowflake as text.

B) Add draft window fields to seasons
alter table public.seasons
add column if not exists draft_open_at timestamptz,
add column if not exists draft_close_at timestamptz;

create index if not exists idx_seasons_draft_window
on public.seasons(draft_open_at, draft_close_at);
C) Add an audit table for all transactions (recommended)
create table if not exists public.transaction_audit (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_type text not null,               -- 'coach_web' | 'discord_bot'
  actor_user_id uuid,                     -- auth.uid if web
  actor_discord_id text,                  -- discord user snowflake if bot
  action text not null,                   -- 'draft_pick'
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transaction_audit_season_team
on public.transaction_audit(season_id, team_id);
2) Bot-only auth model (secure)
A) Create a bot key table
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  name text not null,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
You will store a hash of the bot key here (never plaintext).

Helper: hash function
create or replace function public.sha256_hex(p text)
returns text
language sql
immutable
as $$
  select encode(digest(p, 'sha256'), 'hex')
$$;
Requires pgcrypto (already enabled earlier).

Helper: validate bot key
create or replace function public.is_valid_api_key(p_plaintext text, p_scope text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.api_keys k
    where k.is_active = true
      and k.key_hash = public.sha256_hex(p_plaintext)
      and (p_scope = any(k.scopes))
  );
$$;
3) Bot-only RPC: submit draft pick via Discord
This function:

validates bot key scope draft:submit

checks draft window

resolves coach by discord id

resolves coach’s team in that season

enforces pool legality, uniqueness, budget, roster size

inserts pick with points snapshot

writes audit record

returns updated budget info

RPC function
create or replace function public.rpc_discord_submit_draft_pick(
  p_bot_key text,
  p_season_id uuid,
  p_discord_user_id text,
  p_pokemon_id uuid,
  p_draft_round int default null,
  p_pick_number int default null,
  p_notes text default null
)
returns table (
  team_id uuid,
  draft_pick_id uuid,
  points_snapshot int,
  points_used int,
  budget_remaining int,
  slots_used int,
  slots_remaining int
)
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_open timestamptz;
  v_close timestamptz;

  v_coach_id uuid;
  v_team_id uuid;

  v_budget int;
  v_roster_max int;

  v_points_snapshot int;
  v_points_used int;
  v_slots_used int;

  v_pool_id uuid;
  v_included boolean;
begin
  -- Bot key validation
  if not public.is_valid_api_key(p_bot_key, 'draft:submit') then
    raise exception 'BOT_UNAUTHORIZED';
  end if;

  -- Draft window validation
  select draft_open_at, draft_close_at, draft_points_budget, roster_size_max
  into v_open, v_close, v_budget, v_roster_max
  from public.seasons
  where id = p_season_id;

  if v_budget is null then
    raise exception 'SEASON_NOT_FOUND';
  end if;

  if v_open is null or v_close is null then
    raise exception 'DRAFT_WINDOW_NOT_CONFIGURED';
  end if;

  if not (v_now >= v_open and v_now <= v_close) then
    raise exception 'DRAFT_WINDOW_CLOSED';
  end if;

  -- Resolve coach by discord id
  select id into v_coach_id
  from public.coaches
  where discord_user_id = p_discord_user_id
    and active = true;

  if v_coach_id is null then
    raise exception 'COACH_NOT_FOUND_FOR_DISCORD';
  end if;

  -- Resolve the coach's team for this season
  select t.id into v_team_id
  from public.teams t
  join public.season_teams st on st.team_id = t.id
  where st.season_id = p_season_id
    and t.coach_id = v_coach_id
  limit 1;

  if v_team_id is null then
    raise exception 'TEAM_NOT_FOUND_FOR_COACH_IN_SEASON';
  end if;

  -- Pool check (locked pool only)
  select id into v_pool_id
  from public.draft_pools
  where season_id = p_season_id and locked = true
  order by created_at desc
  limit 1;

  if v_pool_id is not null then
    select included into v_included
    from public.draft_pool_pokemon
    where draft_pool_id = v_pool_id and pokemon_id = p_pokemon_id;

    if v_included is distinct from true then
      raise exception 'POKEMON_NOT_IN_POOL';
    end if;
  end if;

  -- Snapshot points
  select draft_points into v_points_snapshot
  from public.pokemon
  where id = p_pokemon_id;

  if v_points_snapshot is null then
    raise exception 'POKEMON_POINTS_MISSING';
  end if;

  -- Current totals (active)
  select coalesce(sum(points_snapshot),0), coalesce(count(*),0)
  into v_points_used, v_slots_used
  from public.draft_picks
  where season_id = p_season_id and team_id = v_team_id and status = 'active';

  if v_points_used + v_points_snapshot > v_budget then
    raise exception 'BUDGET_EXCEEDED';
  end if;

  if v_slots_used + 1 > v_roster_max then
    raise exception 'ROSTER_FULL';
  end if;

  -- Insert pick (uniqueness guarded by uq_season_pokemon_unique)
  insert into public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, draft_round, pick_number,
    status, start_date, points_snapshot, notes
  ) values (
    p_season_id, v_team_id, p_pokemon_id,
    'draft', p_draft_round, p_pick_number,
    'active', current_date, v_points_snapshot, p_notes
  )
  returning id into draft_pick_id;

  -- Audit
  insert into public.transaction_audit (
    season_id, team_id,
    actor_type, actor_discord_id,
    action, payload
  ) values (
    p_season_id, v_team_id,
    'discord_bot', p_discord_user_id,
    'draft_pick',
    jsonb_build_object(
      'pokemon_id', p_pokemon_id,
      'draft_round', p_draft_round,
      'pick_number', p_pick_number,
      'notes', p_notes
    )
  );

  -- Recompute totals after insert
  select coalesce(sum(points_snapshot),0), coalesce(count(*),0)
  into v_points_used, v_slots_used
  from public.draft_picks
  where season_id = p_season_id and team_id = v_team_id and status = 'active';

  team_id := v_team_id;

  return query
  select
    team_id,
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

exception
  when unique_violation then
    raise exception 'POKEMON_ALREADY_OWNED';
end $$;

revoke all on function public.rpc_discord_submit_draft_pick(text,uuid,text,uuid,int,int,text) from public;
grant execute on function public.rpc_discord_submit_draft_pick(text,uuid,text,uuid,int,int,text) to anon, authenticated;
Note: we grant execute broadly because authorization is enforced by the bot key check inside the function. If you prefer, grant only to anon and force bot calls without a user session.

4) Next.js API endpoint for bot submissions
We will add a dedicated endpoint:

POST /api/discord/draft/pick

This endpoint:

verifies Authorization: Bearer DISCORD_BOT_API_KEY (plaintext)

calls rpc_discord_submit_draft_pick and passes that same key as p_bot_key

maps errors to user-friendly responses

src/app/api/discord/draft/pick/route.ts
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/errors";
import { mapRpcError } from "@/lib/supabase/rpc-error-map";

const BodySchema = z.object({
  season_id: z.string().uuid(),
  discord_user_id: z.string().min(5),
  pokemon_id: z.string().uuid(),
  draft_round: z.number().int().positive().optional().nullable(),
  pick_number: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!token || token !== process.env.DISCORD_BOT_API_KEY) {
    return jsonError(401, "UNAUTHORIZED", "Invalid bot credentials.");
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid request body.", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  // Use anon key; RPC enforces bot key internally.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const body = parsed.data;

  const { data, error } = await supabase.rpc("rpc_discord_submit_draft_pick", {
    p_bot_key: token,
    p_season_id: body.season_id,
    p_discord_user_id: body.discord_user_id,
    p_pokemon_id: body.pokemon_id,
    p_draft_round: body.draft_round ?? null,
    p_pick_number: body.pick_number ?? null,
    p_notes: body.notes ?? null,
  });

  if (error) return mapRpcError(error);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.draft_pick_id) {
    return jsonError(500, "INTERNAL_ERROR", "RPC returned no result.");
  }

  return jsonOk({
    team_id: row.team_id,
    draft_pick_id: row.draft_pick_id,
    points_snapshot: row.points_snapshot,
    team_budget: {
      points_used: row.points_used,
      budget_remaining: row.budget_remaining,
      slots_used: row.slots_used,
      slots_remaining: row.slots_remaining,
    },
  });
}
5) Update RPC error mapper for bot-specific cases
Add these cases to mapRpcError:

case "BOT_UNAUTHORIZED":
  return jsonError(401, "UNAUTHORIZED", "Bot key is not authorized for this action.");
case "DRAFT_WINDOW_NOT_CONFIGURED":
  return jsonError(422, "RULE_VIOLATION", "Draft window is not configured for this season.");
case "DRAFT_WINDOW_CLOSED":
  return jsonError(409, "CONFLICT", "Draft window is closed.");
case "COACH_NOT_FOUND_FOR_DISCORD":
  return jsonError(404, "NOT_FOUND", "No active coach is linked to that Discord account.");
case "TEAM_NOT_FOUND_FOR_COACH_IN_SEASON":
  return jsonError(404, "NOT_FOUND", "No team found for that coach in this season.");
6) Discord bot command: /pick
This command:

takes Pokémon identifier

uses your own lookup strategy (UUID recommended)

submits to /api/discord/draft/pick with the invoking user’s discord id

src/bot/commands/pick.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { appPost } from "../http";

export const data = new SlashCommandBuilder()
  .setName("pick")
  .setDescription("Submit your draft pick (during draft window).")
  .addStringOption((opt) =>
    opt.setName("season_id").setDescription("Season UUID").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("pokemon_id").setDescription("Pokemon UUID").setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName("round").setDescription("Draft round").setRequired(false)
  )
  .addIntegerOption((opt) =>
    opt.setName("pick").setDescription("Pick number").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const season_id = interaction.options.getString("season_id", true);
  const pokemon_id = interaction.options.getString("pokemon_id", true);
  const draft_round = interaction.options.getInteger("round");
  const pick_number = interaction.options.getInteger("pick");

  try {
    const result = await appPost<any>(
      "/api/discord/draft/pick",
      {
        season_id,
        discord_user_id: interaction.user.id,
        pokemon_id,
        draft_round,
        pick_number,
        notes: `Submitted via Discord by ${interaction.user.tag}`,
      },
      process.env.DISCORD_BOT_API_KEY!
    );

    await interaction.editReply(
      `Confirmed. Remaining budget: ${result.team_budget.budget_remaining}, slots remaining: ${result.team_budget.slots_remaining}`
    );
  } catch (e: any) {
    await interaction.editReply(`Rejected: ${String(e?.message ?? e)}`);
  }
}
7) Bot key provisioning (how to create the API key row)
Generate a strong random string for DISCORD_BOT_API_KEY (32+ chars).

Insert its hash:

insert into public.api_keys (key_hash, name, scopes)
values (
  public.sha256_hex('YOUR_DISCORD_BOT_API_KEY_PLAINTEXT'),
  'discord-bot',
  array['draft:submit']
);
Put plaintext into:

Bot env: DISCORD_BOT_API_KEY=...

App env: DISCORD_BOT_API_KEY=...

8) Minimal operational checklist
Set coaches.discord_user_id for each coach (once).

Set seasons.draft_open_at and draft_close_at.

Lock the pool (draft_pools.locked=true) and ensure draft_pool_pokemon.included=true for legal mons.

Run draft: coaches use /pick in Discord.

If something goes wrong, you have:

uniqueness constraints

transaction audit log

deterministic error responses

If you want the last mile: I can add a Pokemon lookup UX for Discord so coaches can run /search pokemon:<name> and the bot returns the correct UUID(s), then they /pick without ever seeing raw IDs.

You said:
proceed with the last mile
ChatGPT said:
Below is the “last mile” so coaches never have to touch UUIDs:

Discord slash command autocomplete for Pokémon selection

A /search command that returns a short list with IDs + points (as backup)

A /pick command that accepts a Pokémon option (autocomplete) and submits the pick

The App endpoints the bot calls (pool-aware, draft-window-aware, and fast)

Everything below is designed to be production-grade: caching, rate limiting hooks, and deterministic responses.

1) App API: Pokémon search for Discord (pool-aware)
Create a bot-only endpoint that returns legal Pokémon for a season (optionally only those in the locked pool, optionally exclude already-owned). This is what autocomplete will call.

src/app/api/discord/pokemon/search/route.ts
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/errors";

const QuerySchema = z.object({
  season_id: z.string().uuid(),
  q: z.string().min(1).max(50),
  limit: z.coerce.number().int().min(1).max(25).default(10),
  only_pool: z.coerce.boolean().default(true),
  exclude_owned: z.coerce.boolean().default(true),
});

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!token || token !== process.env.DISCORD_BOT_API_KEY) {
    return jsonError(401, "UNAUTHORIZED", "Invalid bot credentials.");
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    season_id: url.searchParams.get("season_id"),
    q: url.searchParams.get("q"),
    limit: url.searchParams.get("limit") ?? undefined,
    only_pool: url.searchParams.get("only_pool") ?? undefined,
    exclude_owned: url.searchParams.get("exclude_owned") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid query params.", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const { season_id, q, limit, only_pool, exclude_owned } = parsed.data;
  const query = normalizeQuery(q);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Find latest locked pool (if any)
  let poolId: string | null = null;
  if (only_pool) {
    const { data: pool, error: poolErr } = await supabase
      .from("draft_pools")
      .select("id")
      .eq("season_id", season_id)
      .eq("locked", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (poolErr) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load pool.", { message: poolErr.message });
    }
    poolId = pool?.id ?? null;
  }

  // Base pokemon search: name/slug prefix and contains
  // NOTE: This assumes you have pokemon.slug and pokemon.name indexed reasonably.
  // If you need better fuzzy search, we can add pg_trgm + ILIKE ordering later.
  let pokemonQuery = supabase
    .from("pokemon")
    .select("id,name,slug,draft_points,eligible,type1,type2")
    .eq("eligible", true)
    .limit(200); // filter further after joins/ownership rules

  // Prefer starts-with behavior but allow contains
  // Supabase doesn't support complex OR ordering cleanly in one line; use ilike both ways.
  pokemonQuery = pokemonQuery.or(`name.ilike.${query}%,slug.ilike.${query}%`)
    .or(`name.ilike.%${query}%,slug.ilike.%${query}%`);

  const { data: mons, error: monErr } = await pokemonQuery;
  if (monErr) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to search pokemon.", { message: monErr.message });
  }

  let candidates = (mons ?? []).filter((m) => m.draft_points !== null);

  // Pool filter
  if (only_pool && poolId) {
    const ids = candidates.map((c) => c.id);
    const { data: poolRows, error: poolRowsErr } = await supabase
      .from("draft_pool_pokemon")
      .select("pokemon_id,included")
      .eq("draft_pool_id", poolId)
      .in("pokemon_id", ids);

    if (poolRowsErr) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to filter by pool.", { message: poolRowsErr.message });
    }

    const includedSet = new Set((poolRows ?? []).filter(r => r.included).map(r => r.pokemon_id));
    candidates = candidates.filter((c) => includedSet.has(c.id));
  }

  // Exclude already-owned in season
  if (exclude_owned) {
    const ids = candidates.map((c) => c.id);
    if (ids.length) {
      const { data: owned, error: ownedErr } = await supabase
        .from("draft_picks")
        .select("pokemon_id")
        .eq("season_id", season_id)
        .in("pokemon_id", ids);

      if (ownedErr) {
        return jsonError(500, "INTERNAL_ERROR", "Failed to filter owned.", { message: ownedErr.message });
      }

      const ownedSet = new Set((owned ?? []).map((o) => o.pokemon_id));
      candidates = candidates.filter((c) => !ownedSet.has(c.id));
    }
  }

  // Basic ranking: starts-with name/slug first, then lowest points (optional), then alpha
  candidates.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(query) || a.slug.toLowerCase().startsWith(query);
    const bStarts = b.name.toLowerCase().startsWith(query) || b.slug.toLowerCase().startsWith(query);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;

    const ap = a.draft_points ?? 999;
    const bp = b.draft_points ?? 999;
    if (ap !== bp) return ap - bp;

    return a.name.localeCompare(b.name);
  });

  const results = candidates.slice(0, limit).map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    points: m.draft_points,
    type1: m.type1,
    type2: m.type2,
  }));

  return jsonOk({ results });
}
Notes
This endpoint is pool-aware and excludes already-owned by default.

It’s suitable for Discord autocomplete: small payload, consistent shape.

2) Discord bot: caching + API helper
Autocomplete can be spammy. Add an in-memory TTL cache.

src/bot/cache.ts
type CacheEntry<T> = { value: T; expiresAt: number };

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private ttlMs: number) {}

  get(key: string): T | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  set(key: string, value: T) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
src/bot/app.ts
import { TTLCache } from "./cache";

export const pokemonSearchCache = new TTLCache<any>(10_000); // 10s TTL

export async function appGet<T>(pathWithQuery: string, botKey: string): Promise<T> {
  const res = await fetch(`${process.env.APP_BASE_URL}${pathWithQuery}`, {
    headers: { Authorization: `Bearer ${botKey}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json as T;
}
3) Discord command: /pick with autocomplete Pokémon option
We’ll make the Pokémon option a string that stores the pokemon_id (UUID). The user sees a friendly label; Discord sends the underlying value.

src/bot/commands/pick.ts
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { appGet } from "../app";
import { pokemonSearchCache } from "../app";
import { appPost } from "../http";

type SearchResp = {
  ok: boolean;
  results: Array<{ id: string; name: string; slug: string; points: number; type1: string; type2: string | null }>;
};

export const data = new SlashCommandBuilder()
  .setName("pick")
  .setDescription("Submit your draft pick (during draft window).")
  .addStringOption((opt) =>
    opt
      .setName("season_id")
      .setDescription("Season UUID")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("pokemon")
      .setDescription("Search Pokémon (autocomplete)")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addIntegerOption((opt) => opt.setName("round").setDescription("Draft round").setRequired(false))
  .addIntegerOption((opt) => opt.setName("pick").setDescription("Pick number").setRequired(false));

export async function autocomplete(interaction: AutocompleteInteraction) {
  const season_id = interaction.options.getString("season_id") ?? "";
  const focused = interaction.options.getFocused(true);

  if (focused.name !== "pokemon") return interaction.respond([]);

  const q = String(focused.value ?? "").trim();
  if (!season_id || q.length < 1) return interaction.respond([]);

  const cacheKey = `s:${season_id}:q:${q.toLowerCase()}`;
  const cached = pokemonSearchCache.get(cacheKey);
  if (cached) return interaction.respond(cached);

  try {
    const resp = await appGet<SearchResp>(
      `/api/discord/pokemon/search?season_id=${encodeURIComponent(season_id)}&q=${encodeURIComponent(q)}&limit=10&only_pool=true&exclude_owned=true`,
      process.env.DISCORD_BOT_API_KEY!
    );

    const choices = resp.results.map((m) => ({
      name: `${m.name} (${m.points} pts) — ${m.type1}${m.type2 ? "/" + m.type2 : ""}`,
      value: m.id, // IMPORTANT: actual selection value is pokemon_id
    }));

    pokemonSearchCache.set(cacheKey, choices);
    return interaction.respond(choices);
  } catch {
    return interaction.respond([]);
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const season_id = interaction.options.getString("season_id", true);
  const pokemon_id = interaction.options.getString("pokemon", true); // value is UUID
  const draft_round = interaction.options.getInteger("round");
  const pick_number = interaction.options.getInteger("pick");

  try {
    const result = await appPost<any>(
      "/api/discord/draft/pick",
      {
        season_id,
        discord_user_id: interaction.user.id,
        pokemon_id,
        draft_round,
        pick_number,
        notes: `Submitted via Discord by ${interaction.user.tag}`,
      },
      process.env.DISCORD_BOT_API_KEY!
    );

    await interaction.editReply(
      `Confirmed. Remaining budget: ${result.team_budget.budget_remaining}, slots remaining: ${result.team_budget.slots_remaining}`
    );
  } catch (e: any) {
    await interaction.editReply(`Rejected: ${String(e?.message ?? e)}`);
  }
}
4) Discord command: /search (backup UX)
This is useful when autocomplete is ambiguous or you want to show “top 10 legal results” in-channel.

src/bot/commands/search.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { appGet } from "../app";

type SearchResp = {
  ok: boolean;
  results: Array<{ id: string; name: string; slug: string; points: number; type1: string; type2: string | null }>;
};

export const data = new SlashCommandBuilder()
  .setName("search")
  .setDescription("Search legal Pokémon for the current pool (shows IDs as fallback).")
  .addStringOption((opt) =>
    opt.setName("season_id").setDescription("Season UUID").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("q").setDescription("Name or slug").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const season_id = interaction.options.getString("season_id", true);
  const q = interaction.options.getString("q", true);

  try {
    const resp = await appGet<SearchResp>(
      `/api/discord/pokemon/search?season_id=${encodeURIComponent(season_id)}&q=${encodeURIComponent(q)}&limit=10&only_pool=true&exclude_owned=true`,
      process.env.DISCORD_BOT_API_KEY!
    );

    if (!resp.results.length) {
      return interaction.editReply("No legal results found (pool-legal and unowned).");
    }

    const lines = resp.results.map((m) => {
      const types = `${m.type1}${m.type2 ? "/" + m.type2 : ""}`;
      return `• ${m.name} — ${m.points} pts — ${types}\n  id: ${m.id}`;
    });

    await interaction.editReply(lines.join("\n"));
  } catch (e: any) {
    await interaction.editReply(`Search failed: ${String(e?.message ?? e)}`);
  }
}
5) Wire autocomplete in your interaction router
Where you handle interactionCreate, add:

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "pick") {
      const mod = await import("./commands/pick");
      return mod.autocomplete(interaction);
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "pick") {
      const mod = await import("./commands/pick");
      return mod.execute(interaction);
    }
    if (interaction.commandName === "search") {
      const mod = await import("./commands/search");
      return mod.execute(interaction);
    }
  }
});
6) Operational details you must set once
A) Link coaches to Discord IDs
Populate coaches.discord_user_id for each coach. Example:

update public.coaches
set discord_user_id = '123456789012345678'
where coach_name = 'Simeon';
B) Ensure seasons.draft_open_at / draft_close_at are set
update public.seasons
set draft_open_at = '2026-02-01T18:00:00-05:00',
    draft_close_at = '2026-02-01T22:00:00-05:00'
where id = '...';
7) Recommended “nice finish” (optional but valuable)
If you want to make it feel truly premium:

Add /api/discord/draft/status?season_id=... so the bot can answer:

“Draft is OPEN until 9:00 PM”

“You have 3 slots remaining, 22 points remaining”

Add /whoami command to show the coach’s linked team(s) for the season (reduces confusion)

If you want that, I’ll provide those endpoints + commands next, but the core “search + autocomplete pick” flow above is the full last mile for daily use.

You said:
yes please
ChatGPT said:
Below are the “premium finish” additions:

App endpoints:

GET /api/discord/draft/status

GET /api/discord/coach/whoami

Discord commands:

/draftstatus

/whoami

These remove the remaining friction (no guessing season windows, no guessing whether Discord is linked, no guessing budget/slots).

1) App API: Draft status (window + coach budget snapshot)
src/app/api/discord/draft/status/route.ts
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/errors";

const QuerySchema = z.object({
  season_id: z.string().uuid(),
  discord_user_id: z.string().min(5),
});

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!token || token !== process.env.DISCORD_BOT_API_KEY) {
    return jsonError(401, "UNAUTHORIZED", "Invalid bot credentials.");
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    season_id: url.searchParams.get("season_id"),
    discord_user_id: url.searchParams.get("discord_user_id"),
  });

  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid query params.", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const { season_id, discord_user_id } = parsed.data;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load season window + budgets
  const { data: season, error: seasonErr } = await supabase
    .from("seasons")
    .select("id,name,draft_open_at,draft_close_at,draft_points_budget,roster_size_max")
    .eq("id", season_id)
    .maybeSingle();

  if (seasonErr) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to load season.", { message: seasonErr.message });
  }
  if (!season) return jsonError(404, "NOT_FOUND", "Season not found.");

  const now = new Date();
  const openAt = season.draft_open_at ? new Date(season.draft_open_at) : null;
  const closeAt = season.draft_close_at ? new Date(season.draft_close_at) : null;

  let windowStatus: "not_configured" | "open" | "closed" = "not_configured";
  if (openAt && closeAt) {
    windowStatus = now >= openAt && now <= closeAt ? "open" : "closed";
  }

  // Resolve coach
  const { data: coach, error: coachErr } = await supabase
    .from("coaches")
    .select("id,coach_name,discord_user_id,active")
    .eq("discord_user_id", discord_user_id)
    .eq("active", true)
    .maybeSingle();

  if (coachErr) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to load coach.", { message: coachErr.message });
  }

  // If coach isn't linked yet, still return season window info
  if (!coach) {
    return jsonOk({
      season: {
        id: season.id,
        name: season.name ?? null,
        draft_open_at: season.draft_open_at ?? null,
        draft_close_at: season.draft_close_at ?? null,
        window_status: windowStatus,
      },
      coach_linked: false,
    });
  }

  // Resolve team for season
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id,team_name")
    .eq("coach_id", coach.id)
    .limit(25);

  if (teamErr) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to load team.", { message: teamErr.message });
  }

  // Determine which of coach's teams are in this season
  const teamIds = (team ?? []).map((t) => t.id);
  let seasonTeamId: string | null = null;
  let seasonTeamName: string | null = null;

  if (teamIds.length) {
    const { data: st, error: stErr } = await supabase
      .from("season_teams")
      .select("team_id")
      .eq("season_id", season_id)
      .in("team_id", teamIds)
      .limit(1);

    if (stErr) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to resolve season team.", { message: stErr.message });
    }

    seasonTeamId = st?.[0]?.team_id ?? null;
    seasonTeamName = (team ?? []).find((t) => t.id === seasonTeamId)?.team_name ?? null;
  }

  if (!seasonTeamId) {
    return jsonOk({
      season: {
        id: season.id,
        name: season.name ?? null,
        draft_open_at: season.draft_open_at ?? null,
        draft_close_at: season.draft_close_at ?? null,
        window_status: windowStatus,
      },
      coach_linked: true,
      coach: { id: coach.id, coach_name: coach.coach_name },
      in_season: false,
    });
  }

  // Budget snapshot from active picks
  const { data: picks, error: picksErr } = await supabase
    .from("draft_picks")
    .select("points_snapshot")
    .eq("season_id", season_id)
    .eq("team_id", seasonTeamId)
    .eq("status", "active");

  if (picksErr) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to load picks.", { message: picksErr.message });
  }

  const pointsUsed = (picks ?? []).reduce((sum, p) => sum + (p.points_snapshot ?? 0), 0);
  const slotsUsed = (picks ?? []).length;

  return jsonOk({
    season: {
      id: season.id,
      name: season.name ?? null,
      draft_open_at: season.draft_open_at ?? null,
      draft_close_at: season.draft_close_at ?? null,
      window_status: windowStatus,
      budget_total: season.draft_points_budget,
      roster_max: season.roster_size_max,
    },
    coach_linked: true,
    coach: { id: coach.id, coach_name: coach.coach_name },
    in_season: true,
    team: { id: seasonTeamId, name: seasonTeamName },
    budget: {
      points_used: pointsUsed,
      budget_remaining: (season.draft_points_budget ?? 0) - pointsUsed,
      slots_used: slotsUsed,
      slots_remaining: (season.roster_size_max ?? 0) - slotsUsed,
    },
  });
}
2) App API: /whoami (link check + season team resolution)
src/app/api/discord/coach/whoami/route.ts
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/errors";

const QuerySchema = z.object({
  discord_user_id: z.string().min(5),
  season_id: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!token || token !== process.env.DISCORD_BOT_API_KEY) {
    return jsonError(401, "UNAUTHORIZED", "Invalid bot credentials.");
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    discord_user_id: url.searchParams.get("discord_user_id"),
    season_id: url.searchParams.get("season_id") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid query params.", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const { discord_user_id, season_id } = parsed.data;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: coach, error: coachErr } = await supabase
    .from("coaches")
    .select("id,coach_name,discord_user_id,active")
    .eq("discord_user_id", discord_user_id)
    .eq("active", true)
    .maybeSingle();

  if (coachErr) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to load coach.", { message: coachErr.message });
  }

  if (!coach) {
    return jsonOk({
      linked: false,
      message: "Your Discord account is not linked to an active coach profile yet.",
    });
  }

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id,team_name")
    .eq("coach_id", coach.id)
    .order("team_name", { ascending: true });

  if (teamsErr) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to load teams.", { message: teamsErr.message });
  }

  let seasonTeam: { id: string; team_name: string } | null = null;

  if (season_id && teams?.length) {
    const teamIds = teams.map((t) => t.id);
    const { data: st, error: stErr } = await supabase
      .from("season_teams")
      .select("team_id")
      .eq("season_id", season_id)
      .in("team_id", teamIds)
      .limit(1);

    if (stErr) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to resolve season team.", { message: stErr.message });
    }

    const stTeamId = st?.[0]?.team_id ?? null;
    if (stTeamId) {
      const found = teams.find((t) => t.id === stTeamId);
      if (found) seasonTeam = { id: found.id, team_name: found.team_name };
    }
  }

  return jsonOk({
    linked: true,
    coach: { id: coach.id, coach_name: coach.coach_name },
    teams: (teams ?? []).map((t) => ({ id: t.id, team_name: t.team_name })),
    season_team: seasonTeam,
  });
}
3) Discord commands
A) /draftstatus
src/bot/commands/draftstatus.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { appGet } from "../app";

type DraftStatusResp = any;

export const data = new SlashCommandBuilder()
  .setName("draftstatus")
  .setDescription("Show draft window status and your current budget/slots.")
  .addStringOption((opt) =>
    opt.setName("season_id").setDescription("Season UUID").setRequired(true)
  );

function fmt(ts: string | null) {
  if (!ts) return "N/A";
  // Discord supports <t:unix:R> but we need unix seconds.
  const unix = Math.floor(new Date(ts).getTime() / 1000);
  return `<t:${unix}:f> (<t:${unix}:R>)`;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const season_id = interaction.options.getString("season_id", true);

  try {
    const resp = await appGet<DraftStatusResp>(
      `/api/discord/draft/status?season_id=${encodeURIComponent(season_id)}&discord_user_id=${encodeURIComponent(interaction.user.id)}`,
      process.env.DISCORD_BOT_API_KEY!
    );

    const s = resp.season;
    const lines: string[] = [];

    lines.push(`Season: ${s.name ?? s.id}`);
    lines.push(`Draft Open: ${fmt(s.draft_open_at ?? null)}`);
    lines.push(`Draft Close: ${fmt(s.draft_close_at ?? null)}`);
    lines.push(`Window: ${String(s.window_status).toUpperCase()}`);

    if (!resp.coach_linked) {
      lines.push("");
      lines.push("Your Discord account is not linked to a coach profile yet.");
      return interaction.editReply(lines.join("\n"));
    }

    if (!resp.in_season) {
      lines.push("");
      lines.push(`Linked Coach: ${resp.coach?.coach_name ?? "Unknown"}`);
      lines.push("No team found for you in this season.");
      return interaction.editReply(lines.join("\n"));
    }

    lines.push("");
    lines.push(`Coach: ${resp.coach.coach_name}`);
    lines.push(`Team: ${resp.team.name ?? resp.team.id}`);
    lines.push(
      `Budget: ${resp.budget.points_used}/${s.budget_total} (Remaining: ${resp.budget.budget_remaining})`
    );
    lines.push(
      `Slots: ${resp.budget.slots_used}/${s.roster_max} (Remaining: ${resp.budget.slots_remaining})`
    );

    return interaction.editReply(lines.join("\n"));
  } catch (e: any) {
    return interaction.editReply(`Failed: ${String(e?.message ?? e)}`);
  }
}
B) /whoami
src/bot/commands/whoami.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { appGet } from "../app";

type WhoAmIResp = any;

export const data = new SlashCommandBuilder()
  .setName("whoami")
  .setDescription("Show your linked coach profile and teams.")
  .addStringOption((opt) =>
    opt.setName("season_id").setDescription("Optional season UUID to resolve your season team").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const season_id = interaction.options.getString("season_id") ?? undefined;

  try {
    const url = new URL(`${process.env.APP_BASE_URL}/api/discord/coach/whoami`);
    url.searchParams.set("discord_user_id", interaction.user.id);
    if (season_id) url.searchParams.set("season_id", season_id);

    const resp = await appGet<WhoAmIResp>(
      `${url.pathname}?${url.searchParams.toString()}`,
      process.env.DISCORD_BOT_API_KEY!
    );

    if (!resp.linked) {
      return interaction.editReply(resp.message ?? "Not linked.");
    }

    const lines: string[] = [];
    lines.push(`Coach: ${resp.coach.coach_name}`);
    lines.push(`Coach ID: ${resp.coach.id}`);
    lines.push("");
    lines.push("Teams:");
    for (const t of resp.teams ?? []) {
      lines.push(`• ${t.team_name} (${t.id})`);
    }

    if (season_id) {
      lines.push("");
      lines.push(
        resp.season_team
          ? `Season Team: ${resp.season_team.team_name} (${resp.season_team.id})`
          : "Season Team: none found for this season."
      );
    }

    return interaction.editReply(lines.join("\n"));
  } catch (e: any) {
    return interaction.editReply(`Failed: ${String(e?.message ?? e)}`);
  }
}
4) Register commands + autocomplete wiring
Add draftstatus + whoami to your command registration list.

Ensure /pick autocomplete is routed (as previously shown).

Example command export index:

export const commands = [
  require("./commands/pick"),
  require("./commands/search"),
  require("./commands/draftstatus"),
  require("./commands/whoami"),
];
5) Final UX flow (what coaches do)
/whoami season_id:<uuid>

Confirms they’re linked and which team is theirs for that season.

/draftstatus season_id:<uuid>

Confirms window is OPEN and shows budget/slots remaining.

/pick season_id:<uuid> pokemon:<type to search>

Autocomplete shows legal, unowned Pokémon with points and types.

Coach selects the Pokémon, submits pick.

Bot replies with remaining budget/slots.

Optional but strongly recommended hardening
If you want to fully eliminate “season_id” typing:

Add a guild_config table with default_season_id per Discord guild.

Then make season_id optional in commands; bot fills it automatically.

If you want that, I can provide the schema + endpoints + command modifications in the same style as above.

You said:
yes please
ChatGPT said:
Below is the fully production-grade “no season_id typing” enhancement:

A discord_guild_config table with a default_season_id

A bot-only endpoint to set/get the default season for a Discord server

Command updates so /pick, /search, /draftstatus, /whoami can omit season_id

Sensible permission gating: only admins (or a configured role) can change defaults

1) Database: discord_guild_config
create table if not exists public.discord_guild_config (
  guild_id text primary key,                           -- Discord server ID (snowflake)
  default_season_id uuid references public.seasons(id) on delete set null,
  admin_role_ids text[] not null default '{}',          -- optional: allowed Discord role IDs
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_discord_guild_config_updated_at on public.discord_guild_config;
create trigger trg_discord_guild_config_updated_at
before update on public.discord_guild_config
for each row execute function public.set_updated_at();
admin_role_ids is optional but useful if you want “Draft Admin” role gating in Discord.

RLS: this table should be bot-controlled only (or admin-only). Easiest: no direct policies, and only access via bot RPC/endpoint using your bot key.

2) App API: set/get default season for a guild
We’ll implement two endpoints:

GET /api/discord/guild/config?guild_id=...

POST /api/discord/guild/config to set default_season_id and optional admin_role_ids

Both are bot-auth protected by DISCORD_BOT_API_KEY.

src/app/api/discord/guild/config/route.ts
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/errors";

const GetSchema = z.object({
  guild_id: z.string().min(5),
});

const PostSchema = z.object({
  guild_id: z.string().min(5),
  default_season_id: z.string().uuid().nullable(),
  admin_role_ids: z.array(z.string().min(5)).optional(), // Discord role IDs
});

function requireBot(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!token || token !== process.env.DISCORD_BOT_API_KEY) return null;
  return token;
}

export async function GET(req: Request) {
  if (!requireBot(req)) return jsonError(401, "UNAUTHORIZED", "Invalid bot credentials.");

  const url = new URL(req.url);
  const parsed = GetSchema.safeParse({ guild_id: url.searchParams.get("guild_id") });

  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid query params.", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("discord_guild_config")
    .select("guild_id,default_season_id,admin_role_ids,created_at,updated_at")
    .eq("guild_id", parsed.data.guild_id)
    .maybeSingle();

  if (error) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to load guild config.", { message: error.message });
  }

  return jsonOk({
    guild_id: parsed.data.guild_id,
    config: data ?? null,
  });
}

export async function POST(req: Request) {
  if (!requireBot(req)) return jsonError(401, "UNAUTHORIZED", "Invalid bot credentials.");

  const raw = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid request body.", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { guild_id, default_season_id, admin_role_ids } = parsed.data;

  const payload: any = {
    guild_id,
    default_season_id,
  };
  if (admin_role_ids) payload.admin_role_ids = admin_role_ids;

  const { data, error } = await supabase
    .from("discord_guild_config")
    .upsert(payload, { onConflict: "guild_id" })
    .select("guild_id,default_season_id,admin_role_ids,created_at,updated_at")
    .maybeSingle();

  if (error) {
    return jsonError(500, "INTERNAL_ERROR", "Failed to save guild config.", { message: error.message });
  }

  return jsonOk({ config: data });
}
3) Discord bot: helper to resolve season_id from guild default
src/bot/guildConfig.ts
import { TTLCache } from "./cache";
import { appGet } from "./app";
import { appPost } from "./http";

export const guildConfigCache = new TTLCache<any>(30_000); // 30s TTL

type GuildConfigResp = { ok: boolean; config: { default_season_id: string | null; admin_role_ids: string[] } | null };

export async function getGuildDefaultSeasonId(guildId: string): Promise<string | null> {
  const cached = guildConfigCache.get(`g:${guildId}`);
  if (cached) return cached;

  const resp = await appGet<GuildConfigResp>(
    `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`,
    process.env.DISCORD_BOT_API_KEY!
  );

  const seasonId = resp.config?.default_season_id ?? null;
  guildConfigCache.set(`g:${guildId}`, seasonId);
  return seasonId;
}

export async function setGuildDefaultSeasonId(guildId: string, seasonId: string | null, adminRoleIds?: string[]) {
  const resp = await appPost<any>(
    "/api/discord/guild/config",
    { guild_id: guildId, default_season_id: seasonId, admin_role_ids: adminRoleIds },
    process.env.DISCORD_BOT_API_KEY!
  );
  guildConfigCache.set(`g:${guildId}`, seasonId);
  return resp;
}
4) Discord permission gating for config changes
Two options (you can support both):

Discord built-in: Administrator permission

Role-based: guild config admin_role_ids

We’ll implement: allow if Administrator OR has any role listed.

src/bot/permissions.ts
import { ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { appGet } from "./app";

type GuildConfigResp = { ok: boolean; config: { admin_role_ids: string[] } | null };

export async function canManageDraftConfig(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (!interaction.guildId) return false;

  // Admin perm always allowed
  const member = await interaction.guild?.members.fetch(interaction.user.id);
  if (member?.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  // Role-based
  const resp = await appGet<GuildConfigResp>(
    `/api/discord/guild/config?guild_id=${encodeURIComponent(interaction.guildId)}`,
    process.env.DISCORD_BOT_API_KEY!
  );

  const allowed = resp.config?.admin_role_ids ?? [];
  if (!allowed.length) return false;

  return member?.roles.cache.some((r) => allowed.includes(r.id)) ?? false;
}
5) Discord command: /setseason (guild default season)
This command sets the server default season used by the other commands.

src/bot/commands/setseason.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { canManageDraftConfig } from "../permissions";
import { setGuildDefaultSeasonId } from "../guildConfig";

export const data = new SlashCommandBuilder()
  .setName("setseason")
  .setDescription("Set the default season for this Discord server (admins only).")
  .addStringOption((opt) =>
    opt.setName("season_id").setDescription("Season UUID (or 'clear')").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) return interaction.editReply("This command must be used in a server (not DMs).");

  const ok = await canManageDraftConfig(interaction);
  if (!ok) return interaction.editReply("You do not have permission to change draft configuration for this server.");

  const seasonInput = interaction.options.getString("season_id", true).trim();
  const seasonId = seasonInput.toLowerCase() === "clear" ? null : seasonInput;

  try {
    await setGuildDefaultSeasonId(interaction.guildId, seasonId);
    return interaction.editReply(
      seasonId ? `Default season set to: ${seasonId}` : "Default season cleared."
    );
  } catch (e: any) {
    return interaction.editReply(`Failed: ${String(e?.message ?? e)}`);
  }
}
Optional: add /getseason to show current default.

src/bot/commands/getseason.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getGuildDefaultSeasonId } from "../guildConfig";

export const data = new SlashCommandBuilder()
  .setName("getseason")
  .setDescription("Show the default season for this Discord server.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) return interaction.editReply("This command must be used in a server (not DMs).");

  const seasonId = await getGuildDefaultSeasonId(interaction.guildId);
  return interaction.editReply(seasonId ? `Default season: ${seasonId}` : "No default season configured yet.");
}
6) Update existing commands to make season_id optional
A) Update /pick
Make season_id optional

Resolve from guild default if omitted

If still missing, instruct to run /setseason

Changes to pick builder (season option no longer required)
.addStringOption((opt) =>
  opt.setName("season_id").setDescription("Season UUID (optional if server default is set)").setRequired(false)
)
In execute/autocomplete, resolve like:
import { getGuildDefaultSeasonId } from "../guildConfig";

const seasonFromArg = interaction.options.getString("season_id") ?? null;
const season_id =
  seasonFromArg ??
  (interaction.guildId ? await getGuildDefaultSeasonId(interaction.guildId) : null);

if (!season_id) {
  // In autocomplete: return []
  // In execute: reply with instruction
}
Pick autocomplete: if season_id missing, return no choices
Autocomplete has to be fast; do not call DB if no season. Return empty.

B) Update /search, /draftstatus, /whoami similarly
season optional

if season needed but missing: instruct /setseason or pass season_id

7) Concrete patches (core snippets)
/draftstatus update (season optional)
If missing, resolve from guild default

If still missing, tell them to set it

const seasonArg = interaction.options.getString("season_id");
const season_id = seasonArg ?? (interaction.guildId ? await getGuildDefaultSeasonId(interaction.guildId) : null);
if (!season_id) return interaction.editReply("No season configured. Ask an admin to run /setseason <season_uuid>.");
/whoami update
If season omitted, still works (shows coach + teams)

If season present or default present, also shows season_team

8) Registration list update
Add commands:

setseason

getseason

And update existing command schemas for optional season_id.

9) Recommended final UX (what your league sees)
Admin runs once:

/setseason <season_uuid>

Coaches run daily:

/draftstatus (no args)

/pick pokemon:<type to search> (no args)

/whoami (no args)

Commissioners:

/getseason to confirm server is pointed at the right season

10) One more hardening recommendation (worth doing)
Because /setseason accepts any UUID string, you should validate the season exists before saving. Easiest:

In the App endpoint POST, select seasons.id where id=default_season_id; if not found, return 404.

If you want, I can provide that patch too—but the above is already functional.

If you confirm you want the “validate season exists before setting default” behavior, I’ll provide the exact endpoint update.

yes please
