# Pokémon Showdown Integration - Comprehensive Discussion Transcription

**Date**: January 2026  
**Context**: Discussion about integrating Pokémon Showdown into the Average at Best Draft League platform  
**Source**: ChatGPT conversation transcript

---

## Overview

This document transcribes a comprehensive discussion about integrating Pokémon Showdown into a self-hosted draft league application. The conversation covers architecture decisions, integration strategies, deployment approaches, and ecosystem expansion.

---

## Initial Discussion: Showdown Integration Strategy

### User's Initial Proposal

The user wanted to discuss integrating Pokémon Showdown into a self-hosted app for their Pokémon draft league. They noted that:

- Team files for Showdown are simple markdown files
- Showdown has a battle simulator and several APIs
- They considered it might be a great way to incorporate and integrate Showdown into their app comprehensively

They requested investigation of the following repositories:
- `smogon/pokemon-showdown-client` - The web client
- `smogon/pokemon-showdown` - The core server/simulator
- `smogon/damage-calc` - Damage calculator
- `smogon/pokemon-showdown-loginserver` - Login server
- `smogon/RSBot-Archive` - Archived bot collection

### Core Recommendation: Use Showdown as Battle Engine, Not Whole App

The key insight was to treat Pokémon Showdown as the **battle correctness authority** while the Next.js + Supabase app remains the **league system of record** for:
- Draft state
- Rosters
- Schedules
- Results
- Standings
- Content
- User accounts

---

## Repository-by-Repository Analysis

### 1. `smogon/pokemon-showdown` - ✅ YES, Must-Have

**What it provides:**
- Authoritative battle simulator + validation + formats + replays
- Documented protocol (SockJS) for clients/bots
- Team format documentation (export/JSON/packed)

**Integration approach:**
- Run as a separate service (Docker container) in homelab
- Two modes of operation:
  1. **Human battles mode**: Users battle on your Showdown instance; ingest results/replays back into your app
  2. **Headless simulation mode**: Backend runs "bot" connections for simulations/analytics (draft prep, win-prob modeling, matchup scouting)

**Why it's worth it:**
- Get correctness "for free" (relative to building your own simulator)
- Can enforce draft rules at the validator level
- Provides battle-level accuracy without rebuilding battle mechanics

### 2. `smogon/pokemon-showdown-client` - ⚠️ Usually NO (AGPL Implications)

**What it is:**
- Most of the client code that runs play.pokemonshowdown.com
- Licensed under AGPL-3.0

**Practical impact:**
- If you ship a modified, network-served client as part of your product, AGPL can impose reciprocal source-availability obligations
- May be fine if you plan to open-source relevant pieces
- May be unacceptable if you want to keep your app closed

**Recommended approach:**
- Do not embed or fork the client initially
- Stand up the server and let users connect with:
  - The standard web client pointed at your server (common self-host approach), OR
  - A minimal "battle launch" experience in your app that deep-links users to your Showdown instance
- If later you want a fully integrated UI, build a custom lightweight client that speaks the protocol (more work, but avoids inheriting licensing constraints)

### 3. `smogon/damage-calc` - ✅ YES, Great for Analytics

**What it provides:**
- Official damage calculator codebase
- Maintained and widely used

**How it fits:**
- Use as a backend library/service to power:
  - "Damage ranges" in matchup views
  - Team scouting overlays
  - "What-if" tools (tera type toggles, items, spreads)
- Complementary to Showdown (Showdown sim is for full battles; damage-calc is for fast evals and UI)

**Implementation pattern:**
- Put it behind a small internal API (Next.js route handler or separate Node service)
- Frontend never directly executes heavy calc code

### 4. `smogon/pokemon-showdown-loginserver` - ⚠️ Only if Needed

**What it provides:**
- PS loginserver exposing endpoints via `/action.php` or `/api/[action]`

**When it's worth integrating:**
- If you want a single identity that maps cleanly between:
  - Your Supabase Auth account, AND
  - Your Showdown server identity (for moderation, laddering, permissions, etc.)

**When it's not worth it:**
- If you're fine with Showdown local accounts (separate login), OR
- Running Showdown in a "league room" context where identity is lighter-weight and your app remains the source of truth

**Recommendation:**
- Start without loginserver
- Only add it if user friction and identity mismatch becomes a real problem

### 5. `smogon/RSBot-Archive` - ❌ NO, Not Relevant

**What it is:**
- Archived bot/script collection (largely .ini/mIRC-related artifacts)
- Not tied to modern Showdown integration

**Verdict:**
- Does not help with battle simulation, team parsing, or draft enforcement
- Low priority unless mining historical patterns

---

## Deep Integration Strategy for Draft Leagues

### 3.1 Draft Legality Enforcement (Most Important Integration)

**Requirements:**
- Each rostered Pokémon can only be used by its drafter
- No illegal substitutions
- Potential clauses (species clauses, bans, tera rules, etc.)

**Best place to enforce:**
- Showdown server validation layer (rulesets/formats)
- This way:
  - Battles cannot start with illegal teams
  - Results are trustworthy
  - You avoid building parallel validation logic that drifts over time

**Pattern:**
1. Your app maintains draft state in Supabase
2. Before a match, your app generates a team in:
   - Export format for humans, AND/OR
   - Packed/JSON for automation
3. Showdown format validator checks:
   - "Is every mon on this team in the user's drafted roster?"
   - "Are banned moves/items/tera types excluded?"
   - "Are level caps / clauses respected?"

**This is the "comprehensive" integration lever that creates real value.**

### 3.2 Match Workflow: Schedule → Battle → Results Ingestion

**Integration loop:**
1. Schedule match in your app (Supabase tables)
2. Generate battle link / room code on your Showdown instance
3. Users battle (with enforced legality)
4. Your app ingests replay/results:
   - By parsing server events (protocol), OR
   - By consuming saved replay artifacts your server stores

**This gives you automated:**
- Win/loss recording
- Usage stats per player
- "MVP mon" tracking
- Standings updates

**Future enhancement:**
- "Spectator mode" embedded in your app by consuming the room feed

### 3.3 Analytics Layer: damage-calc + Showdown Logs

**Use damage-calc for:**
- Instant matchup widgets
- "Prep" tools

**Use Showdown battle logs/replays for:**
- Usage stats
- Lead frequencies
- Winrate by matchup
- "Banned threat" detection

**Additional resources:**
- Smogon maintains scripts for usage stats compilation (not in your list, but relevant for Smogon-like reporting)

---

## Pragmatic Integration Plan (Phased)

### Phase 1 — Stand Up Your Private Showdown Service

**Deliverables:**
- Deploy pokemon-showdown as a Docker service behind your existing homelab routing
- Configure a dedicated format for your league
- Don't touch the client repo

**Outcome:** Your league can battle on your server with your rules.

### Phase 2 — App ↔ Showdown Handshake

**Deliverables:**
- Add "Launch Battle" from your app:
  - Creates match record
  - Generates room identifier
  - Provides team import/export text to the user (Showdown export format is the standard UX)

### Phase 3 — Rules + Roster Enforcement Inside Showdown

**Deliverables:**
- Implement drafted-roster enforcement so illegal teams cannot be used
- Your Supabase data becomes the rules input (via a signed endpoint or periodic sync job)

### Phase 4 — Results Ingestion + Dashboard

**Deliverables:**
- Parse room events to auto-record match outcomes (protocol-driven integration)
- Add per-week standings and player dashboards

### Phase 5 — "Draft Prep" Tooling

**Deliverables:**
- Integrate damage-calc for matchup views and "range" widgets
- Add scouting reports powered by your accumulated replay data

---

## Refined Architecture: LXC/VM + Docker + Cloudflare Tunnel

### User's Refinement

The user clarified their deployment approach:
- Currently league members use the Pokémon Showdown website for conducting battles and report results in Discord
- They want to host non-in-app portions on an LXC container or VM with Docker
- Offer services in their homelab and make them publicly accessible via Cloudflare Tunnel
- With their own self-hosted Showdown infrastructure, they can make more programmatic use in various other apps and integrate them at a deeper level than if using the publicly accessible one

### Target State: App as Control Plane, Showdown as Battle Plane

**Today (current workflow):**
- Battles happen on the public Showdown site
- Results are manually reported in Discord

**Tomorrow (self-hosted, deep integration):**
- Battles happen on your Showdown instance (still "the Showdown website" UX, just your domain)
- Your app provides:
  - Match scheduling + "launch battle"
  - Roster legality enforcement (draft rules)
  - Automatic result capture
  - Replay indexing + analytics
  - Discord posting automation

**Key point:** You do not need to embed the Showdown client in your app to get 80–90% of the value. You just need your own server + a tight integration layer.

---

## Deployment Approach: LXC/VM + Docker + Cloudflare Tunnel

### Recommended Service Separation

**Run Showdown as its own small "battle cluster" on an LXC or VM:**

```
Container/VM Host
├── Docker Engine
├── pokemon-showdown container
├── (Optional) damage-calc service container
└── (Optional) a tiny "integration worker" container (Node) that:
    ├── Listens to Showdown events / polls replays
    ├── Calls your Supabase / app APIs
    └── Posts to Discord
```

### Cloudflare Tunnel Pattern

**Expose Showdown publicly via Cloudflare Tunnel:**
- Public hostname: `showdown.moodmnky.com` (example)
- Tunnel routes traffic to `http://pokemon-showdown:8000` (or your chosen port)
- TLS terminates at Cloudflare; origin is tunnel-protected

**Benefits:**
- Stable URL for league members
- No firewall pinholes
- Ability to layer Cloudflare Access/WAF later if needed

---

## Deep Integration Without Rewriting Battle UI

### 3.1 Match Creation + Launch (App-Side)

**Your app adds a "Battle this week" button per matchup:**
- Creates a match record in Supabase
- Produces a unique battle room identifier
- Provides a deep link to your instance such as:
  - `https://showdown.yourdomain.tld/` and instructions "Join room: …"
  - Or a direct room join link (if you choose to support it)

### 3.2 Draft Legality Enforcement (Showdown-Side)

**This is where self-hosting pays off most.**

**Enforce rules at the simulator boundary:**
- "Only Pokémon drafted by this coach"
- No banned mons/moves/items/tera rules
- Any house clauses for your league format

**Practically:**
- Your app remains source-of-truth for rosters
- Showdown reads a "roster allowlist" per coach/match

### 3.3 Automatic Results Capture + Discord Posting

**With your own Showdown:**
- You can capture room outcomes and replay IDs reliably
- Your app can auto-update standings
- Your integration worker can post a formatted match result into Discord

**This replaces manual reporting entirely.**

---

## Architecture Options for "How Does Showdown Know What's Legal"

### Option A (Fastest, Least Invasive): Pre-Match Team Submission in Your App

**Flow:**
1. Coaches submit their team text (Showdown export) into your app before battle
2. Your backend validates against roster + rules
3. Your app generates a "validated team token" or "approved team pack"
4. Coaches import that into Showdown to battle

**Pros:**
- Minimal Showdown code modifications
- Clean audit trail ("this is what you submitted")

**Cons:**
- Requires users to do the submit step in-app

### Option B (Best UX + Strongest Enforcement): Custom Showdown Format Validator Reads Your League Data

**Flow:**
- Modify Showdown's format/validator logic to check:
  1. User identity → coach identity
  2. Coach identity → drafted roster allowlist
- Provide roster data to Showdown via:
  - Periodic sync file export (JSON) from your app, OR
  - A signed API endpoint your Showdown server can query (less ideal operationally)

**Pros:**
- Seamless: users just battle
- Impossible to "accidentally" cheat

**Cons:**
- You maintain a small Showdown patch (but this is manageable if scoped)

### Option C (Hybrid): Sync Rosters into Showdown as "Custom Rulesets" + Require Team Validation Command

**Similar to B, but enforcement is "gated" by a command or room setting**

**Useful if:** You want to keep code changes minimal

---

## Cloudflare + Public Exposure: Security Posture

### Minimum Protections (Recommended)

**Keep the Showdown service isolated:**
- On an internal Docker network
- Cloudflare Tunnel is the only ingress

**Turn on basic Cloudflare protections:**
- Bot fight mode / WAF managed rules (lightweight)
- Rate limiting if you see abuse

### Do You Need Cloudflare Access?

**Not necessarily at first.**

**If league members are fine using a shared URL without login gating:** Keep it open.

**If abuse becomes a problem, or you want to limit to league members:**
- Put Cloudflare Access in front of `showdown.*`
- Note: Access can add friction because Showdown uses websocket-ish behavior; it generally works via Tunnel, but you want to test thoroughly.

**Pragmatic path:**
- Launch open with WAF basics
- Add Access only if needed

---

## What Your App Gains Immediately from Self-Hosting

**Once you own the server, you unlock:**

1. **Reliable replay capture** (build replay index + stats)
2. **Automated match results** (no Discord manual reporting)
3. **Draft enforcement at battle time**
4. **Future multi-app reuse:**
   - Scouting dashboards
   - Power rankings
   - AI-assisted draft prep
   - Match prediction models
   - "Coach profile" performance analytics

**This is exactly the "deep integration" advantage you're aiming for.**

---

## Recommended Next Step: MVP Integration Slice

**If you want the fastest path to value without over-engineering:**

**MVP Slice:**
1. Host Showdown in homelab with Cloudflare Tunnel
2. Add app-side "Match Launch" and "Replay Link Submit"
3. Auto-post result in Discord once replay link is submitted
4. Add roster validation either:
   - Option A (team submission) for immediate enforcement, OR
   - Option B (validator patch) if you're ready to maintain a small patch

**This gets you out of "manual Discord reporting" quickly, while setting the stage for full automation.**

---

## Expanded Ecosystem: Discord Bot + Notion + PokéAPI + Ditto

### User's Expanded Vision

The user wanted to flesh out the ecosystem further with:
- Discord bot integration (perhaps Notion via API key on the backend if there's a reason for creative use, but not mandatory)
- Discord bot run in a Docker container
- Self-hosted version of the PokéAPI as well as their documentation website
- Make use of Ditto for the PokéAPI on their VPS
- Research additional repos and/or Docker containers to flesh out the ecosystem for the league and battling as much as possible
- Take a good look at what may be worthwhile to integrate/embed directly into the app in a dedicated "battle simulator" or "showdown" section
- They want their ecosystem to be a one-stop shop for all things Pokémon for the league
- They've already got the full Poképedia/Pokédex from the API uploaded into Supabase
- Their sprite files are served via MinIO along with other S3-related components

### High-Level Platform Architecture

**Core services (must-have):**
1. **Pokémon Showdown Server** (`smogon/pokemon-showdown`)
   - Provides the authoritative battle simulator, formats/rules, and web API

2. **League App** (Next.js + Supabase)
   - Your system of record: rosters, draft, schedules, results, standings, Poképedia DB, sprite MinIO

3. **Discord Bot** (Node/TS in Docker)
   - Automates match ops: scheduling pings, result posting, replay indexing, "legal roster" reminders

**Extended services (recommended):**
4. **PokéAPI** (self-hosted) (`pokeapi/pokeapi` Docker image + backing Postgres + Redis)
   - Good for internal service stability and rate/latency control

5. **PokéAPI docs site** (self-hosted) (`PokeAPI/pokeapi.co`)
   - Lets your league have an internal "developer hub" (and you can add league-specific docs adjacent to it)

6. **Ditto** (`PokeAPI/ditto`)
   - For mirroring/crawling an API instance, generating schema, and rewriting base URLs so your league tools can point to your domain cleanly

**Programmatic integration backbone (strongly recommended):**
7. **Integration Worker / Event Bridge** (small Node service, containerized)
   - Watches Showdown events/replays, updates Supabase, notifies Discord, schedules reminders

---

## Discord Bot Integration: What It Should Do

### Bot Responsibilities (High Value, Low Friction)

#### A. Match Operations

**Create "Match Thread"** (channel thread or forum post):
- Post: matchup, deadline, rules reminder, links:
  - "Launch battle" link to your Showdown instance
  - "Submit replay" link (or automatic capture if you implement it)
- Scheduled nudges: 72h/48h/24h remaining

#### B. Results + Standings Automation

**When a replay is detected/submitted:**
- Validate participants
- Update Supabase match record
- Post formatted result + replay link + quick stats
- Update standings and optionally post weekly summaries

#### C. Roster Enforcement UX

**On match start (or pre-match):**
- Provide each coach's drafted roster link
- Provide "Export team" / "Import team" helper
- If you implement roster enforcement at Showdown level, the bot can help users debug "why did my team fail validation?"

#### D. Poképedia Utilities

**Even though you've already loaded your Poképedia into Supabase, the bot is still valuable for quick lookups:**
- `/mon garchomp` => stats, abilities, type chart, common items, sprite
- `/move earthquake` => power/accuracy/learnsets (depending on what you stored)

### Implementation Note: Showdown Protocol + Replay Parsing

**Showdown has a documented protocol and simulator protocol.**

**You can either:**
- Subscribe to room events (more complex but fully automated), OR
- Do a simpler "replay link submission" MVP and then parse the replay/log

**There are existing projects wrapping Showdown in Discord contexts** (useful for inspiration and patterns).

---

## Notion on the Backend: Optional, But There Are Real Reasons to Use It

**If you want a "creative control surface" for yourself as commissioner/developer, Notion is useful for human-friendly configuration and content workflows that don't belong in Supabase tables.**

### Worthwhile Notion Use Cases (Commissioner-Facing)

1. **League rules CMS**
   - Rules pages, format notes, seasonal changes, banlists, house rulings
   - Publish into the app as a "Rulebook" section

2. **Content calendar + announcements**
   - Draft day announcements, weekly recaps, award posts
   - Bot can post scheduled Notion-authored content to Discord

3. **Commissioner ops**
   - Trade approvals, dispute logs, exception handling, penalties
   - A private "audit trail" you can search and reference

**Not mandatory, but it's a pragmatic "commissioner cockpit," while Supabase remains the source of truth for app features.**

---

## Self-Hosting PokéAPI + Docs + Ditto: Where It Fits

### Why Self-Host PokéAPI When You Already Have Poképedia in Supabase?

**You already ingested "full Poképedia/Pokédex" into Supabase and serve sprites via MinIO. That means you don't need PokéAPI for core reads inside your app.**

### Reasons It Can Still Be Valuable

1. **Compatibility layer for third-party tools**
   - A lot of community tools assume "PokéAPI-compatible endpoints"
   - Running your own instance lets you:
     - Keep the ecosystem local
     - Avoid external dependencies
     - Support tools that don't speak your Supabase schema

2. **A standard integration target for bots and utilities**
   - Discord bot can query your local PokéAPI instance for certain endpoints
   - Future services can rely on consistent REST resources

### Ditto's Role

**Ditto can:**
- Crawl/mirror a PokéAPI instance ("clone")
- Generate schema ("analyze")
- Rewrite base URLs so you can re-host content under your domain ("transform")

**That makes it a good "data plumbing" tool for:**
- Migrating from public PokéAPI to your instance
- Ensuring references inside the mirrored dataset point to your endpoints

### PokéAPI Containers

**The official image expects:**
- A Postgres DB and Redis cache via env vars

**The docs site source exists and can be served internally.**

---

## Additional Repos/Containers Worth Adding

### A. Modular Showdown Libraries for Embedding In-App (Highly Relevant)

**If you want to embed simulator-like experiences inside your Next.js app without pulling in the full Showdown client, look at `pkmn/ps` and its published packages:**

- `pkmn/ps` is a modularized packaging of Showdown components under MIT for many pieces
- `@pkmn/sim` exists as an extracted simulator package
- `@pkmn/dex` provides a unified data layer

**This is the cleanest path to an in-app "Battle Tools" section that still aligns with your "Showdown-correctness" goal.**

### B. Replay Tooling

**There are libraries/projects focused on generating or handling replays from logs.**

**Even if you don't adopt them directly, this is the ecosystem area to mine for patterns if you implement replay ingestion.**

### C. Bot Frameworks / Patterns for Showdown

**Showdown protocol bots are a known category; the protocol is documented.**

**Even if you don't write "battle AI," these projects show robust handling of the protocol.**

---

## What to Embed Directly in Your App Under "Showdown / Battle Simulator"

**You want "one-stop shop," but you also don't want to recreate an entire battle UI prematurely.**

### Embed Tier 1 (High Value, Low Risk)

#### Match Lobby (League-Native)
- Upcoming matches
- "Launch battle" link to your self-hosted Showdown
- Roster + rules reminders
- "Submit replay" (until fully automated)

#### Team Builder + Draft Legality Checker
- Paste Showdown export text
- Parse + validate against:
  - Drafted roster (Supabase)
  - League rules
- Show exact errors ("you used X but didn't draft it")

**You can do this with `@pkmn/sim`/`@pkmn/dex` style tooling rather than embedding the official client.**

#### Replay Library + Viewer
- Match history
- Replay links
- Stats extraction (turn count, KOs, leads, tera usage if applicable)

### Embed Tier 2 (Useful, But Secondary)

#### Damage Calculator Panel
- Either embed `smogon/damage-calc` server-side
- Or provide quick "range cards" for common matchups (draft prep)

#### Scouting & Analytics
- Per-coach tendencies
- Mon usage
- Winrate by matchup
- "Ban radar" / threat detection

### Embed Tier 3 (Only If You Want to Go All-In)

#### Full In-App Battle Client
- This is the heaviest lift and has licensing considerations if you embed the official client
- I would only do this after the platform is stable and you've proven that users will actually use the in-app client instead of the regular Showdown UI

---

## Suggested Service Inventory (Your "League Platform Stack")

**A practical final lineup, all containerized:**

### Battle Plane
- `pokemon-showdown` server
- (optional) `loginserver`

### League Plane
- Next.js app (your main UI)
- Supabase (DB/Auth/Realtime)
- MinIO (sprites/assets)

### Data Plane
- Self-hosted PokéAPI + Postgres + Redis
- `pokeapi.co` docs site
- Ditto tool (run as job container)

### Comms Plane
- Discord bot container (league ops)
- (optional) Worker container for Showdown replay ingestion + automation

### Edge Plane
- Cloudflare Tunnel routing for:
  - `showdown.*`
  - `pokeapi.*`
  - `docs.pokeapi.*` (or combined)
  - `league.*` (your app)

---

## KoffingJS Integration

### User's Question

"Is this relevant for us? https://github.com/itsjavi/koffingjs"

### Answer: Yes, Highly Relevant

**koffingjs is relevant, and it fits specifically into the "teamfile pipeline" side of your ecosystem:** parsing Pokémon Showdown importable team text into structured JSON (and optionally normalizing/prettifying it).

**That said, it's not a battle engine and it won't replace Showdown; it's a team export parser.**

### Where koffingjs Helps in POKE MNKY

#### 1. In-App Team Import/Export (High ROI)

**If league members paste Showdown team exports, koffingjs can turn that into machine-readable JSON so you can:**
- Store teams cleanly in Supabase
- Diff versions ("week 5 team vs week 6 team")
- Render a proper UI team builder / viewer
- Generate a normalized Showdown export for users

#### 2. Draft Legality Checking (Very High ROI)

**Once you can parse the export into structured objects, you can enforce your league rules in-app:**
- "This Pokémon is not on your drafted roster"
- Banned items/moves/tera rules
- Level caps / clause compliance

**This is a strong "one-stop shop" feature even before you enforce legality at the Showdown server validator layer.**

#### 3. Bot and Automation Glue

**Discord bot commands become easy:**
- `/teamcheck <paste>` → bot replies with legality errors and a cleaned export
- `/teamjson <paste>` → bot returns structured JSON or stores it against the match

### Where koffingjs Does NOT Help

- Running battles
- Parsing full replays/battle logs (different problem domain)
- Enforcing rules at battle-time on the Showdown server (that's Showdown format/validator work)

### "Should We Adopt It?" Recommendation

**Adopt koffingjs if you want a fast, clean way to parse Showdown exports.** It is explicitly built for that and includes an online parser use case that mirrors your needs (sanitize/prettify/convert to JSON).

**However, I would treat it as one of two candidate parsers, not the only option, because you are already building a deeper Showdown-aligned ecosystem.**

**Decision criteria:**

**Choose koffingjs if:**
- You want a focused parser with a simple API surface for export text → JSON
- You want quick wins in Next.js route handlers / bot commands
- You're not trying to perfectly mirror Showdown's internal "packed team" formats

**Consider alternatives if:**
- You want maximum alignment with Showdown internals (same parsing rules as the sim uses)
- You intend to generate "packed" teams or interface deeply with sim tooling

**(Practically: koffingjs is great for user-facing inputs; Showdown-aligned tooling is great for battle-time correctness.)**

### How to Integrate It Cleanly

**Add a backend-only "Team Parsing Service" module in your app (or shared package) that:**
- Accepts raw Showdown export text
- Returns normalized JSON + a canonical re-export string
- Runs league legality checks against Supabase rosters

**Use that module in:**
- Your "Battle Simulator" section (Team Builder / Team Check)
- Your Discord bot commands
- Match flow (pre-match team submission, if you choose that UX)

### Bottom Line

**koffingjs is absolutely relevant as a team export ingestion layer.** It helps you turn "paste Showdown team text" into a first-class object you can validate, store, and automate around.

---

## Comprehensive Ecosystem Rundown

### North Star

**You are building a one-stop shop for your draft league:**
- League operations (draft, rosters, schedule, standings, disputes)
- Battle operations (launch, validate, record, replay library)
- Pokémon knowledge (Poképedia, sprites, move/mon lookup)
- Automation (Discord-first workflows; optionally Notion-assisted commissioner ops)
- Self-hosted infrastructure (homelab/VPS), exposed safely via Cloudflare Tunnel
- "Showdown-level correctness" as the battle authority

### What You Already Have "In Platform"

#### A. League App (POKE MNKY)
- Next.js + TypeScript frontend and backend (your primary UI and API surface)
- Supabase as the system-of-record for league data
- A full Poképedia/Pokédex dataset already loaded into Supabase
- Sprites and bulk assets served via MinIO/S3-compatible storage

**The intent is:** App becomes the canonical league hub; external services become "capabilities," not silos.

#### B. Storage Strategy
- Supabase is used for relational state and some assets
- Bulk/large media (sprites, etc.) are intended to be offloaded to MinIO to avoid Supabase free-tier storage limits

### The Battle Plane (Showdown as First-Class Infrastructure)

#### Core: Self-Hosted Pokémon Showdown Server

**You plan to run `smogon/pokemon-showdown` in Docker on an LXC container or VM in your homelab/VPS.**

**You expose it publicly via Cloudflare Tunnel (no inbound port exposure).**

**This unlocks "deep integration" that you cannot reliably do against public Showdown:**
- League-specific formats/rulesets
- Stronger automation hooks
- Consistent replay availability
- Deterministic behavior across your platform

#### Client Strategy (User UX)

**League members already like the "Showdown website" UX, so you keep that familiar:**
- Primary UX: they continue battling in a Showdown web client
- Difference: it's your hosted instance under your domain, not the public one

**You have two good patterns:**
- Host the official client (`smogon/pokemon-showdown-client`) separately under `play.*` and link/iframe it in-app
- Keep the client separate and deep-link from your app into it for battles

#### Rule Enforcement Vision

**The big "commissioner win" is draft legality enforcement:**
- Short-term: validate teams in-app (pre-battle "team check")
- Long-term: enforce legality at the Showdown validator/format level so illegal teams cannot be used in battles at all

### Discord as the Operations Layer (Bot-First Workflow)

#### Discord Bot (Containerized)

**The bot becomes the league's workflow engine, moving you away from manual reporting:**

**Match ops:**
- Create match threads/posts
- Post matchup cards (week, opponent, deadline)
- Provide buttons/links:
  - Launch battle on your Showdown instance
  - Submit replay (fallback)
  - View rosters / rules / matchup page in your app
- Automated reminders (time-based nudges)

**Results ops:**
- Capture match outcomes and post them automatically:
  - Update Supabase standings
  - Post result summaries and replay links
  - Optional weekly recap generation

**This is the "glue" that turns your ecosystem into a system, not a set of websites.**

### Pokémon Data Plane (Supabase-First, PokéAPI Optional)

#### What's Already True

**Your app already has the Pokédex/Poképedia dataset in Supabase.**

**Your sprites are served from MinIO.**

**So internally, your app does not need PokéAPI to function.**

#### Why You Still Might Self-Host PokéAPI

**Self-hosting `PokeAPI/pokeapi` plus its docs site can still be useful as an ecosystem capability:**
- Standard REST endpoints for external tools and future integrations
- A stable local dependency (latency/rate limits controlled by you)
- A separate "public developer API" if you ever want to expose Pokémon data without exposing your Supabase schema

#### Ditto on the VPS

**Using `PokeAPI/ditto` is a data-ops tool to:**
- Mirror/crawl
- Rewrite base URLs
- Help operate a "your-domain" PokéAPI mirror cleanly

**Given your current Supabase-first architecture, PokéAPI + Ditto are best framed as:**
- Nice-to-have ecosystem services, unless you have a concrete feature that demands them

### The "Showdown Section" Inside POKE MNKY (What to Embed vs. Link)

**You want a dedicated in-app section like "Battle Simulator / Showdown." The strongest ROI features are:**

#### Tier 1: Must-Have In-App (High Value, Low Complexity)

**Match Lobby:**
- Schedule, deadlines, launch battle link, roster links

**Team Import / Team Validator:**
- Paste Showdown export text → parse → validate against:
  - Drafted roster
  - League rules (items/moves/clauses/tera policy)
- Generate cleaned export back to the user

**Replay Library:**
- Match history
- Replay links
- Search/filter by coach, week, Pokémon used

#### Tier 2: Competitive Advantage Features

**Damage calculator / prep tools:**
- Embed a damage calc panel (or server-side service)
- Integrate with saved teams and matchup context

**Analytics:**
- Usage stats, leads, KOs, winrate by mon
- Scouting dashboards ("what does Coach X tend to bring?")

#### Tier 3: Only If You Want to Go All-In

**Full embedded battle client:**
- Iframe/proxy your hosted Showdown client in-app
- Keep it separate deployable to avoid turning your app into a fork of Showdown

### Team Parsing and "Teamfile Pipeline" Capability

**This is now an explicit ecosystem component, because it powers:**
- In-app team tools
- Bot commands
- Pre-battle legality checks
- Storage of canonical team objects

#### Candidate Parser/Tooling

**koffingjs is relevant specifically for converting Showdown export text → structured JSON, then back again (clean UX for "paste team").** This is a great building block for your "Team Check" feature.

**Strategically, you want a shared internal module:**
- `parseTeam(text) -> { teamJson, canonicalText, errors }`
- Used by both the Next.js app and the Discord bot

### Infrastructure and Exposure Model (Homelab/VPS)

#### Compute

**LXC container or VM hosting Docker services:**
- Showdown server
- (optional) Showdown client
- Discord bot
- Integration worker
- (optional) PokéAPI + docs + Ditto

#### Edge / Routing

**Cloudflare Tunnel provides public access without opening inbound ports.**

**You can assign subdomains per service:**
- `showdown.*` (server)
- `play.*` (client)
- `pokeapi.*` (optional)
- `league.*` (your app)

#### Security Posture

**Keep internal service networks private; tunnel is the only ingress.**

**Add Cloudflare WAF/rate limiting as needed.**

**Cloudflare Access is optional (only add if abuse becomes a problem or you want member-only gating).**

### Integration Backbone (The Missing "Muscle" That Makes It All Automatic)

**To turn "services" into "platform," you add a small integration worker (containerized Node service):**

**Responsibilities:**
- Observe battles (initially via replay link submission, later via event/log capture)
- Parse results → update Supabase
- Trigger Discord posts and reminders
- Generate/refresh analytics caches

**This worker is what converts Showdown into "programmable league infrastructure."**

### What This Ecosystem Enables (End-State User Experience)

**A league member can:**
1. Open POKE MNKY → see their weekly matchup
2. Click "Launch Battle" → battles on your Showdown instance
3. After battle ends → result is recorded automatically
4. Discord gets an automatic results post
5. Standings update immediately
6. Replay is searchable in the app
7. Members can run team checks, prep tools, scouting insights, and view Poképedia—all in one place

### Immediate Next Concrete Build Targets

**If you want the fastest path to "platform value," the next deliverables should be:**

1. Self-host Showdown server + client + tunnel routing
2. Discord bot: match thread + launch link + replay submit
3. Team parser module (koffingjs-backed) + legality checks
4. Replay ingestion v1 (from replay link)
5. Supabase schema + policies for matches/results/replays
6. In-app "Showdown" section: Lobby + Team Check + Replays

---

## Conclusion

This comprehensive discussion outlines a complete ecosystem for integrating Pokémon Showdown into a draft league platform. The key insights are:

1. **Self-hosting Showdown unlocks deep integration** that's impossible with the public instance
2. **The app remains the system of record** while Showdown becomes the battle authority
3. **Discord bot automation** eliminates manual reporting workflows
4. **Modular integration** allows incremental value delivery without over-engineering
5. **Ecosystem thinking** creates a one-stop shop for league operations

The phased approach allows for incremental implementation while maintaining a clear vision of the end-state platform.
