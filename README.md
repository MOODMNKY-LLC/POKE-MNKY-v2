# Average at Best Draft League - Pokemon League Operating System

A comprehensive Pokemon Draft League management platform with Showdown-accurate battle simulation, AI-powered insights, and Discord integration.

## Features

### League Management
- **Team & Coach Management** - 20-team league with divisions and conferences
- **Draft System** - Point-budget drafting with cost validation
- **Match Center** - Schedule tracking, result submission, and history
- **Standings & Rankings** - Real-time standings with divisional breakdowns
- **Playoff Bracket** - Tournament visualization and tracking

### Battle System
- **Showdown-Accurate Engine** - Battle simulation using @pkmn/engine
- **AI Opponents** - OpenAI-powered battle decisions
- **Turn-by-Turn Logging** - Complete battle history and replay system
- **Legal Move Validation** - Enforces format rules and move legality

### AI Features (OpenAI GPT-4/5)
- **Pokédex Q&A** - Grounded Pokemon queries using GPT-4.1
- **Weekly Recaps** - Commissioner-style summaries with GPT-5.2
- **Strategic Coach** - Deep team analysis and advice with GPT-5.2
- **Match Result Parser** - Auto-parse Discord submissions with GPT-4.1
- **AI Predictions** - Matchup predictions and power rankings

### Pokemon Data
- **PokéAPI Integration** - Full Pokemon data via Pokenode-TS
- **Cached Lookups** - Supabase caching for fast access
- **Team Builder** - Interactive roster creation with type analysis
- **Draft Cost System** - Automated point calculation by stats

### Discord Integration
- **Slash Commands** - `/matchups`, `/submit`, `/standings`, `/recap`, `/pokemon`
- **Webhook Notifications** - Auto-post match results, recaps, trades
- **Result Submission** - Submit directly from Discord

### Data Management
- **Google Sheets Sync** - Import league data using node-google-spreadsheet
- **Supabase Database** - PostgreSQL with Row Level Security
- **Real-time Updates** - Live standings and stats
- **Audit Trails** - Complete history of all changes

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **UI**: Shadcn UI components, Radix UI primitives
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **AI**: OpenAI GPT-4.1, GPT-5.2, GPT-5 mini
- **Pokemon Data**: Pokenode-TS, @pkmn/engine, @pkmn/dex
- **Discord**: Discord.js with slash commands
- **Data Sync**: node-google-spreadsheet for Sheets integration

## Environment Variables

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Google Sheets
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# Discord
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=

# App
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
```

## Database Setup

1. Run the SQL migration scripts in order:
   ```bash
   # In Supabase SQL Editor:
   scripts/001_create_schema.sql
   scripts/002_enhanced_schema.sql
   ```

2. (Optional) Sync initial data from Google Sheets:
   ```bash
   POST /api/sync/google-sheets
   ```

## Running Locally

```bash
# Install dependencies
pnpm install

# Run Next.js app
pnpm dev

# Run Discord bot (separate terminal)
node scripts/start-discord-bot.js
```

## Deployment

### Vercel (Next.js App)
1. Connect your repo to Vercel
2. Add all environment variables
3. Deploy

### Discord Bot
Deploy the Discord bot to a long-running service:
- Railway
- Render
- Heroku
- VPS with PM2

## Key Pages

- `/` - Home dashboard
- `/standings` - League standings
- `/teams` - Team directory
- `/teams/builder` - Team builder
- `/matches` - Match center
- `/matches/submit` - Submit results
- `/pokedex` - Pokemon lookup with AI
- `/schedule` - Weekly schedule
- `/playoffs` - Playoff bracket
- `/mvp` - MVP leaderboard
- `/insights` - AI-powered insights
- `/admin` - Admin panel (protected)

## API Routes

### Battle Engine
- `POST /api/battle/create` - Create battle
- `POST /api/battle/[id]/step` - Apply turn choice
- `GET /api/battle/[id]/step` - Get battle state

### AI Features
- `POST /api/ai/pokedex` - Pokédex Q&A
- `POST /api/ai/weekly-recap` - Generate recap
- `POST /api/ai/coach` - Strategic advice
- `POST /api/ai/parse-result` - Parse match text

### Data Sync
- `POST /api/sync/google-sheets` - Import from Sheets
- `GET /api/sync/google-sheets` - View sync history

## Discord Commands

- `/matchups week:14` - View week's matchups
- `/submit result:"Team A beat Team B 6-4"` - Submit result
- `/standings` - View standings
- `/recap week:14` - Generate AI recap
- `/pokemon name:pikachu` - Pokemon lookup

## Architecture

### Battle Flow
1. User creates battle via UI or API
2. Battle engine initializes using @pkmn/engine
3. Each turn: get legal actions → AI/user chooses → apply to engine
4. Log all events to battle_events table
5. Finalize and update match record

### AI Model Selection
- **GPT-4.1**: Structured tasks (Pokédex, move selection, parsing)
- **GPT-5.2**: Strategic reasoning (coach mode, recaps, disputes)
- **GPT-5 mini**: Quick tasks (summaries, simple responses)

### Data Sync Flow
1. Admin triggers sync in UI
2. API fetches from Google Sheets
3. Parse and validate data
4. Upsert to Supabase tables
5. Log sync status

## Future Enhancements

- Real-time battle spectating
- Trade approval workflow
- Advanced analytics dashboard
- Mobile app (React Native)
- Tournament bracket generator
- Email notifications
- Playoff seeding calculator
- Historical season archive

## License

Private league software - All rights reserved
