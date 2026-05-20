<div align="center">

![League Logo](./public/league-logo.svg)

# POKE MNKY

**A Comprehensive Pokémon Draft League Management Platform**

*Featuring POKE MNKY - Your AI-Powered Virtual Assistant*

[![Next.js 16](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4%2F5-purple)](https://openai.com/)
[![License](https://img.shields.io/badge/license-Private-red)]()

**Transform traditional Discord-based Pokémon draft leagues into a modern, feature-rich web platform**

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 🎯 Overview

POKE MNKY is a sophisticated distributed ecosystem that combines **self-hosted battle infrastructure** with **cloud-based application services** to create a comprehensive Pokémon draft league management platform. Built for competitive trainers who want automation, AI-powered insights, and seamless Discord integration.

### Key Highlights

- **🏗️ Hybrid Architecture**: Self-hosted battle servers + cloud application layer
- **🤖 AI-Powered**: GPT-4.1 & GPT-5.2 integration for insights and automation
- **⚔️ Showdown-Accurate**: Real-time battle simulation with Pokémon Showdown integration
- **📊 Comprehensive Analytics**: Real-time standings, match tracking, and performance metrics
- **🔗 Discord Native**: Seamless integration with Discord workflows and slash commands
- **🎨 Modern UI**: Beautiful, responsive design with Pokémon-inspired theming

### Current Status

**Version**: v3  
**Progress**: ~85% Complete  
**Status**: Production-ready foundation with core functionality operational  
**Last ops update**: May 2026 — in-app Google Sheets team sync, draft pool registry backfill, homepage countdown ([session log](./docs/SESSION-CHANGELOG-2026-05-19.md))

| Component | Status | Completion |
|-----------|--------|------------|
| **Server Infrastructure** | ✅ Operational | 90% |
| **Next.js Application** | ✅ Production-ready | 95% |
| **Database Schema** | ✅ Complete | 100% |
| **AI Features** | ✅ Complete | 100% |
| **Unified AI Assistant** | ✅ Complete | 100% |
| **Mobile/PWA Optimization** | ✅ Complete | 100% |
| **POKE MNKY Character** | ✅ Integrated | 100% |
| **Discord Integration** | ⚠️ Testing Pending | 85% |
| **Battle Engine** | ⚠️ Framework Complete | 70% |
| **Automation** | ⚠️ In Progress | 40% |

---

## ✨ Features

### 🏆 League Management
- **20-Team League Structure** with divisions, conferences, and seasons
- **Google Sheets sync** — import teams from the league **Data** tab (Admin → Google Sheets; [guide](./docs/GOOGLE-SHEETS-SYNC-GUIDE.md))
- **Point-Budget Draft System** with automatic cost calculation and validation
- **In-app draft pool builder** — `pokemon_master` registry, Generate → Publish ([operations](./docs/DRAFT-IN-APP-OPERATIONS.md))
- **Match Scheduling & Results** with weekly views and submission workflow
- **Playoff Bracket Visualization** with tournament tracking
- **Real-Time Standings** with divisional breakdowns and tiebreakers
- **Season draft countdown** on homepage (Admin → League → Countdown)
- **Historical Archives** for past seasons and statistics

![Standings Page](./docs/screenshots/standings-page.png)
*Real-time standings with divisional breakdowns and comprehensive statistics*

### ⚔️ Battle System
- **Showdown-Inspired Engine** using `@pkmn/dex` architecture
- **Turn-by-Turn Logging** with complete battle history
- **AI Opponents** powered by OpenAI GPT-4.1 for legal move selection
- **Legal Move Validation** enforcing format rules and move legality
- **Battle Replay System** (planned) for visual playback

![Showdown Integration](./docs/screenshots/showdown-integration.png)
*Seamless integration with self-hosted Pokémon Showdown battle simulator*

### 🤖 AI-Powered Features

Leveraging **OpenAI GPT-4.1, GPT-5.2 & GPT-5-mini** for intelligent automation:

| Feature | Model | Purpose |
|---------|-------|---------|
| **Unified AI Assistant** | GPT-5.2/GPT-4.1/GPT-5-mini | ChatGPT-style floating assistant with context-aware agent selection |
| **Draft Assistant** | GPT-5.2 | Real-time draft guidance with MCP tool integration |
| **Battle Strategy Coach** | GPT-5.2 | Matchup analysis and strategic recommendations |
| **Free Agency Advisor** | GPT-5.2 | Transaction recommendations and roster optimization |
| **Pokédex Q&A** | GPT-4.1 | Grounded Pokémon queries with function calling |
| **Weekly Recaps** | GPT-5.2 | Commissioner-style narrative summaries |
| **Match Result Parser** | GPT-4.1 | Auto-parse Discord submissions into structured data |
| **AI Predictions** | GPT-5.2 | Matchup predictions with confidence ratings |
| **SQL Generator** | GPT-4.1 | Natural language → SQL queries for analytics |

#### 🎯 Unified AI Assistant Popup

A comprehensive ChatGPT-style floating assistant available throughout the application:

- **Context-Aware**: Automatically detects current page (`/draft`, `/showdown`, `/pokedex`, etc.) and selects appropriate AI agent
- **Multi-Modal Input**: Text, voice (speech-to-text), and file uploads
- **Text-to-Speech**: Optional TTS for AI responses
- **MCP Tool Integration**: Toggle to enable/disable Model Context Protocol tools
- **Model Selection**: Choose between GPT-5.2 (Strategy), GPT-4.1 (Grounded), or GPT-5-mini (Fast)
- **Mobile Optimized**: Full PWA support with safe area handling and touch optimization
- **POKE MNKY Character**: Features our custom virtual assistant character with dual color palettes (red-blue primary, gold-black premium)

### 📱 Discord Integration
- **Slash Commands** for league operations (`/matchups`, `/submit`, `/standings`, `/recap`, `/pokemon`)
- **OAuth Login** with automatic role synchronization
- **Webhook Notifications** for match results, trades, and announcements
- **Role Management** with bidirectional Discord ↔ App sync
- **Result Submission** directly from Discord channels

### 🎨 User Experience

![Homepage](./docs/screenshots/homepage-hero.png)
*Modern homepage with hero section, starter Pokémon showcase, and quick access to key features*

![Team Builder](./docs/screenshots/team-builder.png)
*Intuitive team builder with point budget tracking, type coverage analysis, and AI-powered suggestions*

![Pokédex](./docs/screenshots/pokedex.png)
*Comprehensive Pokédex with search, filtering, and detailed Pokémon information*

![AI Insights](./docs/screenshots/ai-insights.png)
*AI-powered insights dashboard with weekly recaps, power rankings, and strategic predictions*

#### 🐵 POKE MNKY Virtual Assistant

Our custom virtual assistant character enhances the user experience throughout the application:

- **Character Design**: Stylized monkey character with Pokémon-inspired aesthetic
- **Dual Color Palettes**: 
  - **Red/Blue** (Primary): Classic Pokémon colors for general assistant features
  - **Gold/Black** (Premium): Sophisticated palette for admin/premium features
- **Multiple Variants**: 
  - **Avatar** (transparent background): Perfect for UI integration, chat interfaces, empty states
  - **Icon** (with backgrounds): App icons, splash screens, featured displays
- **Responsive**: Automatic light/dark mode support with SVG fallbacks for crisp scaling
- **Integration**: Appears in floating assistant button, chat interfaces, empty states, loading screens, and more

### 🗂️ Data Management
- **Google Sheets Sync** using `node-google-spreadsheet` for legacy data import
- **Supabase Backend** with PostgreSQL, Row Level Security, and real-time updates
- **Pokémon Data Caching** via PokéAPI with 30-day TTL (98% API call reduction)
- **Audit Trails** for all league operations and changes

---

## 🏗️ Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Next.js    │  │   Discord    │  │   Showdown   │         │
│  │   Web App    │  │     Bot      │  │    Client    │         │
│  │  (Vercel)    │  │  (Server)    │  │  (Server)    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────────┘
          │                  │                  │
          │ HTTPS            │ WebSocket        │ HTTPS
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION & INTEGRATION LAYER              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js 16 App Router (React 19 Server Components)     │  │
│  │  ├─ Pages: /, /teams, /matches, /pokedex, /admin       │  │
│  │  ├─ API Routes: /api/ai/*, /api/battle/*, /api/sync/*  │  │
│  │  └─ Middleware: Auth check, session refresh, RLS       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Discord.js Bot (Slash Commands + Webhooks)             │  │
│  │  ├─ Commands: /matchups, /submit, /standings, /recap   │  │
│  │  ├─ Role Sync: Discord roles ↔ App permissions         │  │
│  │  └─ Notifications: Match results, trades, announcements│  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Integration Worker (Event Bridge)                      │  │
│  │  ├─ Battle completion detection                        │  │
│  │  ├─ Replay parsing and result extraction               │  │
│  │  └─ Automatic standings updates                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────┬────────────┬────────────┬────────────┬───────────────┘
          │            │            │            │
          ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Supabase   │  │  Showdown    │  │   PokéAPI   │         │
│  │  PostgreSQL  │  │    Server    │  │   Stack     │         │
│  │   + Auth     │  │  (Docker)    │  │  (Docker)   │         │
│  │  + Realtime  │  │              │  │             │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Google Sheets│  │   Discord    │  │   MinIO     │         │
│  │  (Legacy)    │  │     API      │  │  (Storage)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Server Infrastructure

**Location**: `moodmnky@10.3.0.119` (Homelab/VPS)  
**Status**: **12 Docker services running and healthy**

| Service | Container | Status | Purpose |
|---------|-----------|--------|---------|
| **Showdown Server** | `poke-mnky-showdown-server` | ✅ Healthy | Battle simulation engine |
| **Showdown Client** | `poke-mnky-showdown-client` | ✅ Healthy | Web-based battle UI |
| **Showdown Loginserver** | `poke-mnky-loginserver` | ✅ Healthy | Authentication & team storage |
| **PokéAPI Service** | `poke-mnky-pokeapi` | ✅ Healthy | REST API for Pokémon data |
| **PokéAPI PostgreSQL** | `poke-mnky-pokeapi-db` | ✅ Healthy | Pokémon species database |
| **PokéAPI Redis** | `poke-mnky-pokeapi-redis` | ✅ Healthy | API response caching |
| **Discord Bot** | `poke-mnky-discord-bot` | ✅ Healthy | League operations bot |
| **Integration Worker** | `poke-mnky-integration-worker` | ⚠️ Running | Battle result automation |
| **Damage Calculator** | `poke-mnky-damage-calc` | ✅ Healthy | Damage calculation service |

### Application Layer

**Framework**: Next.js 16 (App Router)  
**React Version**: 19.2  
**Deployment**: Vercel  
**API Routes**: 50+ endpoints  
**Pages**: 30+ routes

**Key Pages**:
- Public: `/`, `/standings`, `/teams`, `/matches`, `/pokedex`, `/insights`, `/showdown`
- Admin: `/admin`, `/admin/teams`, `/admin/matches`, `/admin/users`
- User: `/dashboard`, `/profile`, `/draft`, `/teams/builder`

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 22.x or later
- **pnpm**: 9.x or later (`npm install -g pnpm`)
- **Supabase Account**: [supabase.com](https://supabase.com)
- **OpenAI API Key**: [platform.openai.com](https://platform.openai.com)
- **Discord Application**: [discord.com/developers](https://discord.com/developers/applications)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/poke-mnky-v2.git
cd poke-mnky-v2

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations (see Database Setup below)

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Database Setup

The app uses **48 SQL migration files** in `supabase/migrations/`. Run them in order:

### Seeding Stock Showdown Teams (optional)

If you'd like new users to see preloaded Showdown teams for a fuller experience, run the seed that inserts five \"stock\" teams into `public.showdown_teams`:

- Using the included npm script (reads `POSTGRES_URL` from your environment):

```bash
npm run db:seed:showdown
```

- Or run psql directly:

```bash
psql "$POSTGRES_URL" -f supabase/seeds/seed_showdown_stock_teams.sql
```

This seed is idempotent and marks inserted teams with `is_stock = true`. Run it against your development database only.

**Option A: Supabase SQL Editor (Recommended)**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project → SQL Editor
3. Copy and run each migration file in order

**Option B: Supabase CLI**
```bash
npm install -g supabase
supabase link --project-ref your-project-ref
supabase db push
```

### Environment Variables

Create `.env.local` with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_GUILD_ID=your_discord_server_id

# Google Sheets (admin sync)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Production: NEXT_PUBLIC_APP_URL=https://poke-mnky.moodmnky.com
APP_BASE_URL=http://localhost:3000
# Production: APP_BASE_URL=https://poke-mnky.moodmnky.com
NODE_ENV=development
```

See [Environment Setup](#environment-setup) section for detailed instructions.

---


### OpenClaw Integration

The app includes **direct OpenClaw Gateway integration** via the `openclaw-node` client. This allows the Next.js app to:

- **Start AI agent runs** from UI interactions (draft analysis, matchup breakdowns, scouting)
- **Stream responses** in real-time to the user (token-by-token streaming)
- **Maintain conversation sessions** across page reloads
- **Handle tool calls** (PokéAPI lookups, Supabase queries, Showdown calculations)

#### Setup

1. **Start the Gateway** (if not running):
```bash
openclaw gateway start
```

2. **Environment Variables** (in `poke-mnky.env`):
```bash
OPENCLAW_GATEWAY_URL=ws://localhost:18789
OPENCLAW_GATEWAY_TOKEN=your-gateway-token
```

3. **Use in your app**:
```typescript
import { initOpenClawClient, runOpenClawAgentSync } from @/lib/openclaw;

// Initialize (do once at app startup)
initOpenClawClient();

// Run an agent synchronously
const response = await runOpenClawAgentSync("Analyze this team's type coverage");
console.log(response);
```

#### Agents Available

- `main` - General assistant (default)
- `draft-analyst` - Draft pool analysis, pick value scoring
- `matchup-analyst` - Weekly matchup previews and recaps
- `roster-analyst` - Roster health, depth charts, injury impact
- `league-insights` - Weekly summaries, trends, predictions

#### Current Integration Status

- ✅ Client library installed (`openclaw-node`)
- ✅ Connection utilities (`lib/openclaw.ts`)
- ⚠️ Agent orchestration hooks (in progress)
- ⚠️ Streaming UI components (in progress)
- ⚠️ Session persistence (in progress)

See [`lib/openclaw.ts`](./lib/openclaw.ts) and [`lib/openclaw/http-chat.ts`](./lib/openclaw/http-chat.ts) for implementation details.

---

## 📋 Recent updates (May 2026)

### Google Sheets → teams

- Admin **Google Sheets** page: **Select recommended** (Data tab only), **Sync Now** always visible with clear disabled reasons.
- **Data** tab uses fixed column indices (`lib/google-sheets-data-tab.ts`) — ~24 teams with division, conference, record, SOS.
- Non-standings sheets (Team 1–12, Rules, Pokédex, …) are **skipped** for `teams` sync automatically.

### Draft pool

- **Generate** reads `pokemon_master`; auto-populates registry from `draft_pool` when empty.
- **Populate registry from draft board** on `/admin/draft-pool-rules` (no CLI required for normal ops).
- **Game code** filters via `pokemon_games` — leave empty unless that table is populated.

### Homepage

- Draft countdown **banner under the nav** on `/`; configure in Admin → League → **Countdown**.

### Coach & AI

- Coaches can **claim a team** from the dashboard; admins can release assignments.
- In-app assistant can use **OpenClaw HTTP** completions when the gateway WebSocket path is unavailable.

Full detail: **[docs/SESSION-CHANGELOG-2026-05-19.md](./docs/SESSION-CHANGELOG-2026-05-19.md)**

---

## 📚 Documentation

### Start here (operators & developers)

| Doc | Audience | Contents |
|-----|----------|----------|
| **[Session changelog (May 2026)](./docs/SESSION-CHANGELOG-2026-05-19.md)** | Everyone | What shipped this session: Sheets, draft pool, countdown, coach/AI |
| **[Google Sheets sync](./docs/GOOGLE-SHEETS-SYNC-GUIDE.md)** | Commissioners | Data tab, Select recommended, Sync Now, troubleshooting |
| **[Draft in-app operations](./docs/DRAFT-IN-APP-OPERATIONS.md)** | Commissioners | `pokemon_master`, Generate, Publish, game code |
| **[Data pipeline runbook](./docs/DATA-PIPELINE-RUNBOOK.md)** | DevOps | Sheets vs Notion vs seed; post–DB-reset steps |
| **[Admin config quick reference](./docs/ADMIN-CONFIG-QUICK-REFERENCE.md)** | Commissioners | Admin routes index |

### Core docs (in repo)

- **[Changelog](./CHANGELOG.md)** — Version history and unreleased May 2026 notes
- **[Design System](./docs/DESIGN-SYSTEM.md)** — Tokens, components, motion
- **[RLS and Auth Testing](./docs/RLS-AND-AUTH-TESTING.md)** — RLS test matrix and Discord OAuth
- **[AGENTS.md](./AGENTS.md)** — Cursor/agent conventions and MCP notes
- **[Current status summary](./docs/CURRENT-STATUS-SUMMARY.md)** — Feature completion snapshot

### Detailed guides

- **Database**: `supabase/migrations/` for schema evolution; [DB reset troubleshooting](./docs/SUPABASE-DB-RESET-TROUBLESHOOTING.md)
- **API**: `app/api/` for endpoint implementations; Mintlify API docs under `docs/mint-docs/` if published
- **Components**: `components/` for reusable UI components
- **Draft session wizard**: [CREATE-DRAFT-SESSION-GUIDE.md](./docs/CREATE-DRAFT-SESSION-GUIDE.md)
- **Discord**: [DISCORD-INTEGRATION-GUIDE.md](./docs/DISCORD-INTEGRATION-GUIDE.md), [slash commands](./docs/DISCORD-SLASH-COMMANDS-REFERENCE.md)
- **Handoff / product direction**: [hand-offs/poke-mnky-v2-update.md](./hand-offs/poke-mnky-v2-update.md)

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router with React 19.2)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4 with custom Pokémon-inspired theme
- **UI Components**: Shadcn UI (90+ components) + Radix UI primitives + AI Elements (Vercel)
- **State Management**: React Server Components + SWR for client state
- **AI Chat**: Vercel AI SDK with streaming responses and tool calling
- **PWA**: Full Progressive Web App support with install prompts and offline capabilities

### Backend
- **Runtime**: Node.js 22+ (Vercel Edge Functions)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with Discord OAuth
- **Real-time**: Supabase Realtime subscriptions

### Integrations
- **AI**: OpenAI GPT-4.1 (structured tasks), GPT-5.2 (deep reasoning), GPT-5-mini (fast responses)
- **AI Tools**: Model Context Protocol (MCP) for native tool integration
- **Pokémon Data**: PokéAPI (local Docker instance for development)
- **Discord**: Discord.js v14 with slash commands and webhooks
- **Storage**: MinIO (self-hosted S3-compatible) for sprites and assets
- **Voice**: Web Speech API for speech-to-text and text-to-speech

### Infrastructure
- **Hosting**: Vercel (Next.js app) + Homelab (Docker services)
- **Database**: Supabase cloud PostgreSQL
- **Object Storage**: MinIO (self-hosted on TrueNAS Scale)
- **CDN**: Vercel Edge Network + Cloudflare

---

## 📊 Project Statistics

- **12 Docker Services** running on homelab server
- **48 Database Migrations** defining comprehensive schema
- **50+ API Routes** for comprehensive functionality
- **30+ Pages** across public, admin, and user areas
- **90+ UI Components** from Shadcn UI library
- **5 AI Agents** (Draft, Battle Strategy, Free Agency, Pokédex, General)
- **Unified Assistant Popup** with multi-modal input (text, voice, files)
- **POKE MNKY Character Assets** (8 files: 4 icons, 2 avatars PNG, 2 avatars SVG)
- **OpenClaw Gateway Integration** - Direct agent orchestration from Next.js app
- **98% Cache Hit Rate** for Pokémon data (30-day TTL)
- **100% Mobile/PWA Optimized** with safe area support and touch optimization

---

## 🗺️ Roadmap

### Phase 1: Production Readiness (Weeks 1-4) ✅ Complete
- [x] Complete integration worker implementation
- [x] Unified AI Assistant Popup implementation
- [x] Mobile/PWA optimization
- [x] POKE MNKY character integration
- [ ] Test Discord OAuth and role sync end-to-end
- [ ] Validate all RLS policies with different roles
- [ ] Implement comprehensive error handling
- [ ] Add input validation (Zod schemas)

### Phase 2: Feature Completion (Weeks 5-8) ⚠️ In Progress
- [ ] Complete battle engine mechanics
- [ ] Trading system with approval workflow
- [ ] File upload processing for AI assistant
- [ ] Conversation persistence and history

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Live draft room with timer
- [ ] Advanced analytics dashboard
- [ ] Content management system
- [ ] Enhanced voice input (fallback services)

See [temp/PROJECT-ROADMAP.md](./temp/PROJECT-ROADMAP.md) for detailed roadmap.

---

## 🤝 Contributing

This is currently a private project for the "Average at Best Draft League". Contributions are by invitation only.

### Development Guidelines

1. **Code Style**: TypeScript strict mode, ESLint rules enforced
2. **Component Guidelines**: Use React Server Components by default
3. **Commit Messages**: Follow conventional commit format
4. **Pull Requests**: Create feature branch, write clear PR description

---

## 📝 License

**Private League Software** - All rights reserved.

This project is proprietary software developed for the "Average at Best Draft League". Unauthorized copying, distribution, or modification is prohibited.

---

## 🙏 Acknowledgments

- **PokéAPI**: [pokeapi.co](https://pokeapi.co) for comprehensive Pokémon data
- **Pokémon Showdown**: [play.pokemonshowdown.com](https://play.pokemonshowdown.com) for competitive mechanics reference
- **Shadcn UI**: [ui.shadcn.com](https://ui.shadcn.com) for beautiful component library
- **Vercel AI SDK**: [sdk.vercel.ai](https://sdk.vercel.ai) for AI chat components and streaming
- **AI Elements**: [vercel.com](https://vercel.com) for pre-built AI chat components
- **Next.js Team**: [nextjs.org](https://nextjs.org) for the amazing framework
- **Vercel**: [vercel.com](https://vercel.com) for hosting and developer tools
- **Supabase**: [supabase.com](https://supabase.com) for backend infrastructure
- **OpenAI**: [openai.com](https://openai.com) for AI capabilities and Model Context Protocol
- **Magic UI**: [magicui.design](https://magicui.design) for beautiful animated components

---

<div align="center">

**Built with ❤️ for competitive Pokémon trainers**

*Last Updated: May 2026*

</div>
