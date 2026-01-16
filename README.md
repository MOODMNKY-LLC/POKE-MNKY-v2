<div align="center">

![League Logo](./public/league-logo.svg)

# POKE MNKY

**A Comprehensive Pokémon Draft League Management Platform**

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

**Version**: v2 → v3 Transition  
**Progress**: ~75% Complete  
**Status**: Production-ready foundation with core functionality operational

| Component | Status | Completion |
|-----------|--------|------------|
| **Server Infrastructure** | ✅ Operational | 90% |
| **Next.js Application** | ✅ Production-ready | 95% |
| **Database Schema** | ✅ Complete | 100% |
| **AI Features** | ✅ Complete | 100% |
| **Discord Integration** | ⚠️ Testing Pending | 85% |
| **Battle Engine** | ⚠️ Framework Complete | 70% |
| **Automation** | ⚠️ In Progress | 40% |

---

## ✨ Features

### 🏆 League Management
- **20-Team League Structure** with divisions, conferences, and seasons
- **Point-Budget Draft System** with automatic cost calculation and validation
- **Match Scheduling & Results** with weekly views and submission workflow
- **Playoff Bracket Visualization** with tournament tracking
- **Real-Time Standings** with divisional breakdowns and tiebreakers
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

Leveraging **OpenAI GPT-4.1 & GPT-5.2** for intelligent automation:

| Feature | Model | Purpose |
|---------|-------|---------|
| **Pokédex Q&A** | GPT-4.1 | Grounded Pokémon queries with function calling |
| **Weekly Recaps** | GPT-5.2 | Commissioner-style narrative summaries |
| **Strategic Coach** | GPT-5.2 | Deep team analysis and competitive advice |
| **Match Result Parser** | GPT-4.1 | Auto-parse Discord submissions into structured data |
| **AI Predictions** | GPT-5.2 | Matchup predictions with confidence ratings |
| **SQL Generator** | GPT-4.1 | Natural language → SQL queries for analytics |

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

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

See [Environment Setup](#environment-setup) section for detailed instructions.

---

## 📚 Documentation

### Comprehensive Documentation

- **[v3 First Principles Report](./POKE-MNKY-V3-FIRST-PRINCIPLES-REPORT.md)** - Complete ecosystem analysis
- **[Project Roadmap](./PROJECT-ROADMAP.md)** - Development roadmap and vision
- **[Local Development Guide](./LOCAL-DEVELOPMENT.md)** - Local setup instructions
- **[Scripts Guide](./SCRIPTS-GUIDE.md)** - Utility scripts documentation

### Detailed Guides

- **Database**: See `supabase/migrations/` for schema evolution
- **API**: See `app/api/` for endpoint implementations
- **Components**: See `components/` for reusable UI components
- **Server Services**: See `docs/` for server infrastructure details

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router with React 19.2)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4 with custom Pokémon-inspired theme
- **UI Components**: Shadcn UI (90+ components) + Radix UI primitives
- **State Management**: React Server Components + SWR for client state

### Backend
- **Runtime**: Node.js 22+ (Vercel Edge Functions)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with Discord OAuth
- **Real-time**: Supabase Realtime subscriptions

### Integrations
- **AI**: OpenAI GPT-4.1 (structured tasks), GPT-5.2 (deep reasoning)
- **Pokémon Data**: PokéAPI (local Docker instance for development)
- **Discord**: Discord.js v14 with slash commands and webhooks
- **Storage**: MinIO (self-hosted S3-compatible) for sprites and assets

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
- **98% Cache Hit Rate** for Pokémon data (30-day TTL)

---

## 🗺️ Roadmap

### Phase 1: Production Readiness (Weeks 1-4) ⚠️ In Progress
- [ ] Complete integration worker implementation
- [ ] Test Discord OAuth and role sync end-to-end
- [ ] Validate all RLS policies with different roles
- [ ] Implement comprehensive error handling
- [ ] Add input validation (Zod schemas)

### Phase 2: Feature Completion (Weeks 5-8)
- [ ] Complete battle engine mechanics
- [ ] Trading system with approval workflow
- [ ] UX polish (loading states, mobile optimization)

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Live draft room with timer
- [ ] Advanced analytics dashboard
- [ ] Content management system

See [PROJECT-ROADMAP.md](./PROJECT-ROADMAP.md) for detailed roadmap.

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
- **Next.js Team**: [nextjs.org](https://nextjs.org) for the amazing framework
- **Vercel**: [vercel.com](https://vercel.com) for hosting and developer tools
- **Supabase**: [supabase.com](https://supabase.com) for backend infrastructure
- **OpenAI**: [openai.com](https://openai.com) for AI capabilities

---

<div align="center">

**Built with ❤️ for competitive Pokémon trainers**

*Last Updated: January 2026*

</div>
