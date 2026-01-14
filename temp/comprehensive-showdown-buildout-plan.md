# Comprehensive Showdown Integration Buildout Plan

**Date**: January 2026  
**Project**: POKE MNKY v2 - Average at Best Draft League  
**Purpose**: Detailed implementation plan for integrating Pokémon Showdown and expanding the ecosystem

---

## Executive Summary

This document provides a comprehensive, codebase-aware implementation plan for integrating Pokémon Showdown into the POKE MNKY platform. Based on analysis of the current codebase structure, database schema, and existing integrations, this plan outlines specific steps to transform the platform into a complete "one-stop shop" for draft league operations.

**Current State**: The app has a solid foundation with Next.js, Supabase, Discord bot infrastructure, battle engine foundations, and Poképedia data. This plan builds upon that foundation to add Showdown integration, enhanced automation, and expanded ecosystem services.

---

## Current Codebase Analysis

### Architecture Overview

**Technology Stack:**
- **Frontend**: Next.js 16 (App Router) with React 19.2
- **Backend**: Next.js API routes + Supabase PostgreSQL
- **Database**: Supabase with comprehensive schema (15+ tables)
- **Discord**: Discord.js v14 bot (containerized)
- **Storage**: MinIO for sprites/assets, Supabase Storage for relational data
- **AI**: OpenAI GPT-4.1/5.2 integration
- **Deployment**: Vercel (app), Coolify/Docker (bot)

### Existing Components

#### 1. Database Schema (Supabase)

**League Management Tables:**
- `teams` - Team information with division/conference
- `team_rosters` - Draft picks with `draft_points` field
- `matches` - Match records with status, replay_url, differential
- `battle_sessions` - Battle state management
- `battle_events` - Turn-by-turn event logging
- `draft_budgets` - Point tracking per team per season
- `league_config` - Parsed rules and configuration

**Pokémon Data Tables:**
- `pokepedia_pokemon` - Comprehensive Pokémon projection table
- `pokepedia_moves` - Move data
- `pokepedia_assets` - Sprite metadata + MinIO paths
- `pokeapi_resources` - Canonical JSONB storage
- `pokemon_cache` - Legacy cache table (may be deprecated)

**Sync & Jobs:**
- `sync_jobs` - Sync job tracking with phases, chunks, heartbeat
- `items`, `berries`, `natures`, `evolution_triggers` - Additional endpoint tables

#### 2. Battle Engine Foundation

**Location**: `lib/battle-engine.ts`

**Current Implementation:**
- Basic `BattleEngine` class structure
- Battle session management in Supabase
- Turn-by-turn event logging
- Legal move validation framework
- Battle state persistence

**API Endpoints:**
- `POST /api/battle/create` - Initialize new battle
- `POST /api/battle/[id]/step` - Execute battle turn
- `GET /api/battle/[id]/step` - Get current battle state

**Gaps Identified:**
- No Showdown protocol integration
- No replay parsing/ingestion
- No automatic result capture
- Limited battle UI components

#### 3. Discord Bot

**Location**: `lib/discord-bot.ts`, `scripts/start-discord-bot.ts`

**Current Implementation:**
- Slash commands framework
- Basic command handlers (matchups, submit, standings, recap, pokemon)
- Docker containerization ready (`Dockerfile.discord-bot`, `docker-compose.discord-bot.yml`)

**Gaps Identified:**
- No Showdown integration (match launch, replay capture)
- No automated result posting
- No team validation commands
- Limited match thread creation

#### 4. Team Builder

**Location**: `app/teams/builder/page.tsx`

**Current Implementation:**
- Draft budget tracking (120 points default)
- Pokemon search and filtering
- Type coverage analysis
- Roster validation (6-10 Pokemon)
- Save/load team functionality

**Gaps Identified:**
- No Showdown export/import
- No team legality checking against drafted roster
- No moveset/item configuration
- No EV/IV customization

#### 5. Match Management

**Location**: `app/matches/`, `app/api/matches/`

**Current Implementation:**
- Match list with status badges
- Result submission form (`app/matches/submit/page.tsx`)
- AI-powered result parsing (`app/api/ai/parse-result/route.ts`)
- Differential auto-calculation

**Gaps Identified:**
- No Showdown battle launch integration
- No automatic replay capture
- No match thread creation in Discord
- Limited replay library/viewer

#### 6. Poképedia Integration

**Current Implementation:**
- Comprehensive sync system (`supabase/functions/sync-pokepedia/`)
- GraphQL and REST clients
- Offline-first architecture with IndexedDB
- MinIO sprite serving

**Strengths:**
- Complete Pokémon data in Supabase
- Efficient caching and sync
- Sprite assets in MinIO

---

## Implementation Plan: Phase-by-Phase

### Phase 1: Self-Hosted Showdown Infrastructure

**Goal**: Deploy Showdown server and client in homelab with Cloudflare Tunnel exposure.

#### 1.1 Docker Compose Setup

**Create**: `docker-compose.showdown.yml`

```yaml
version: '3.8'

services:
  pokemon-showdown:
    image: node:20-alpine
    container_name: poke-mnky-showdown-server
    restart: unless-stopped
    working_dir: /app
    volumes:
      - ./showdown-server:/app
      - showdown-config:/app/config
      - showdown-replays:/app/replays
    command: node app.js
    environment:
      - NODE_ENV=production
      - PS_PORT=8000
    networks:
      - poke-mnky-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8000"]
      interval: 30s
      timeout: 10s
      retries: 3

  pokemon-showdown-client:
    image: nginx:alpine
    container_name: poke-mnky-showdown-client
    restart: unless-stopped
    volumes:
      - ./showdown-client:/usr/share/nginx/html
      - ./nginx-showdown.conf:/etc/nginx/conf.d/default.conf
    networks:
      - poke-mnky-network
    depends_on:
      - pokemon-showdown

volumes:
  showdown-config:
  showdown-replays:

networks:
  poke-mnky-network:
    external: true
```

#### 1.2 Showdown Server Setup

**Steps:**
1. Clone `smogon/pokemon-showdown` into `tools/showdown-server/`
2. Configure custom format for league rules
3. Set up roster validation endpoint (Option B approach)
4. Configure replay storage
5. Set up logging for integration worker

**Custom Format Configuration** (`tools/showdown-server/config/formats.ts`):

```typescript
export const Formats: {[k: string]: FormatData} = {
  'gen9avgatbest': {
    mod: 'gen9',
    ruleset: ['Draft League Rules'],
    // Custom validator will check roster against Supabase
    validateTeam: async (team: Team, user: User) => {
      // Call Supabase API to validate roster
      const response = await fetch(`${process.env.APP_URL}/api/showdown/validate-team`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SHOWDOWN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          team: team.export(),
          user_id: user.id,
          match_id: user.currentMatchId
        })
      });
      return response.ok;
    }
  }
};
```

#### 1.3 Cloudflare Tunnel Configuration

**Create**: `cloudflare-tunnel-config.yml`

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: showdown.moodmnky.com
    service: http://pokemon-showdown:8000
  - hostname: play.moodmnky.com
    service: http://pokemon-showdown-client:80
  - service: http_status:404
```

#### 1.4 Integration Worker Setup

**Create**: `docker-compose.integration-worker.yml`

```yaml
version: '3.8'

services:
  integration-worker:
    build:
      context: .
      dockerfile: Dockerfile.integration-worker
    container_name: poke-mnky-integration-worker
    restart: unless-stopped
    environment:
      - SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - SHOWDOWN_SERVER_URL=http://pokemon-showdown:8000
      - APP_URL=${NEXT_PUBLIC_APP_URL}
    networks:
      - poke-mnky-network
    volumes:
      - ./showdown-replays:/app/replays:ro
```

**Create**: `Dockerfile.integration-worker`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

COPY scripts/integration-worker ./scripts/integration-worker
COPY lib ./lib
COPY tsconfig.json ./

CMD ["pnpm", "exec", "tsx", "scripts/integration-worker/index.ts"]
```

---

### Phase 2: Showdown ↔ App Integration Layer

**Goal**: Create bidirectional communication between Showdown and the app.

#### 2.1 API Endpoints for Showdown

**Create**: `app/api/showdown/validate-team/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  // Verify Showdown API key
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (apiKey !== process.env.SHOWDOWN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { team, user_id, match_id } = await request.json();
  
  const supabase = createClient();
  
  // Get user's drafted roster
  const { data: roster } = await supabase
    .from('team_rosters')
    .select('pokemon_id, pokemon_name')
    .eq('team_id', user_id)
    .eq('season_id', match_id); // Assuming match_id contains season context
  
  // Parse Showdown team export
  const teamPokemon = parseTeamExport(team);
  
  // Validate each Pokemon is in roster
  const invalid = teamPokemon.filter(
    p => !roster.some(r => r.pokemon_id === p.id || r.pokemon_name === p.name)
  );
  
  if (invalid.length > 0) {
    return NextResponse.json({
      valid: false,
      errors: invalid.map(p => `${p.name} is not on your drafted roster`)
    }, { status: 400 });
  }
  
  // Validate league rules (items, moves, tera types)
  const ruleViolations = await validateLeagueRules(teamPokemon, match_id);
  
  if (ruleViolations.length > 0) {
    return NextResponse.json({
      valid: false,
      errors: ruleViolations
    }, { status: 400 });
  }
  
  return NextResponse.json({ valid: true });
}
```

**Create**: `app/api/showdown/create-room/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  const { match_id, team1_id, team2_id } = await request.json();
  
  // Create room on Showdown server
  const response = await fetch(`${process.env.SHOWDOWN_SERVER_URL}/api/create-room`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SHOWDOWN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      format: 'gen9avgatbest',
      match_id,
      team1_id,
      team2_id
    })
  });
  
  const { room_id, room_url } = await response.json();
  
  // Update match record with room info
  const supabase = createClient();
  await supabase
    .from('matches')
    .update({
      showdown_room_id: room_id,
      showdown_room_url: room_url,
      status: 'in_progress'
    })
    .eq('id', match_id);
  
  return NextResponse.json({ room_id, room_url });
}
```

#### 2.2 Team Parsing Module

**Create**: `lib/team-parser.ts`

```typescript
import { parseTeam, exportTeam } from 'koffingjs';

export interface ParsedTeam {
  pokemon: Array<{
    name: string;
    item?: string;
    ability?: string;
    moves: string[];
    nature?: string;
    evs?: Record<string, number>;
    ivs?: Record<string, number>;
    teraType?: string;
  }>;
  errors: string[];
  canonicalText: string;
}

export async function parseShowdownTeam(teamText: string): Promise<ParsedTeam> {
  try {
    const parsed = parseTeam(teamText);
    const canonical = exportTeam(parsed);
    
    return {
      pokemon: parsed.team,
      errors: [],
      canonicalText: canonical
    };
  } catch (error) {
    return {
      pokemon: [],
      errors: [error.message],
      canonicalText: teamText
    };
  }
}

export async function validateTeamAgainstRoster(
  team: ParsedTeam,
  roster: Array<{ pokemon_id: number; pokemon_name: string }>,
  leagueRules: any
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Check each Pokemon is in roster
  for (const pokemon of team.pokemon) {
    const inRoster = roster.some(
      r => r.pokemon_name.toLowerCase() === pokemon.name.toLowerCase() ||
           r.pokemon_id === parseInt(pokemon.name.match(/\d+/)?.[0] || '0')
    );
    
    if (!inRoster) {
      errors.push(`${pokemon.name} is not on your drafted roster`);
    }
  }
  
  // Check league rules (items, moves, tera)
  // Implementation depends on league rules structure
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

#### 2.3 Integration Worker Implementation

**Create**: `scripts/integration-worker/index.ts`

```typescript
import { Client } from 'discord.js';
import { createClient } from '@/lib/supabase/service';
import { watchShowdownRooms, parseReplay } from './showdown-watcher';

const discordClient = new Client({
  intents: ['Guilds', 'GuildMessages']
});

const supabase = createClient();

async function main() {
  await discordClient.login(process.env.DISCORD_BOT_TOKEN);
  
  // Watch Showdown rooms for completed battles
  watchShowdownRooms(async (roomId, replayData) => {
    // Parse replay
    const result = await parseReplay(replayData);
    
    // Find match record
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('showdown_room_id', roomId)
      .single();
    
    if (!match) {
      console.warn(`No match found for room ${roomId}`);
      return;
    }
    
    // Update match record
    await supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_id: result.winner_id,
        team1_score: result.team1_score,
        team2_score: result.team2_score,
        differential: result.differential,
        replay_url: result.replay_url
      })
      .eq('id', match.id);
    
    // Post to Discord
    const channel = await discordClient.channels.fetch(process.env.DISCORD_RESULTS_CHANNEL_ID!);
    if (channel?.isTextBased()) {
      await channel.send({
        embeds: [{
          title: `Match Result: ${result.team1_name} vs ${result.team2_name}`,
          description: `**Winner:** ${result.winner_name} (${result.winner_score}-${result.loser_score})`,
          fields: [
            { name: 'Replay', value: result.replay_url, inline: true },
            { name: 'View Match', value: `${process.env.APP_URL}/matches/${match.id}`, inline: true }
          ],
          color: 0x00ff00
        }]
      });
    }
    
    // Update standings
    await updateStandings(match.season_id);
  });
}

main().catch(console.error);
```

---

### Phase 3: Enhanced Discord Bot Integration

**Goal**: Expand Discord bot to handle Showdown operations and automation.

#### 3.1 Enhanced Bot Commands

**Update**: `lib/discord-bot.ts`

**Add new commands:**

```typescript
// Add to commands array
new SlashCommandBuilder()
  .setName('launch-battle')
  .setDescription('Launch a battle for your scheduled match')
  .addStringOption(option =>
    option.setName('match_id')
      .setDescription('Match ID')
      .setRequired(true)
      .setAutocomplete(true)
  ),

new SlashCommandBuilder()
  .setName('team-check')
  .setDescription('Validate your team against league rules')
  .addStringOption(option =>
    option.setName('team')
      .setDescription('Paste your Showdown team export')
      .setRequired(true)
  ),

new SlashCommandBuilder()
  .setName('submit-replay')
  .setDescription('Submit a replay link for a completed battle')
  .addStringOption(option =>
    option.setName('replay_url')
      .setDescription('Showdown replay URL')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('match_id')
      .setDescription('Match ID')
      .setRequired(true)
  )
```

**Add command handlers:**

```typescript
async function handleLaunchBattleCommand(interaction: any) {
  const matchId = interaction.options.getString('match_id');
  
  // Call app API to create Showdown room
  const response = await fetch(`${process.env.APP_URL}/api/showdown/create-room`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DISCORD_BOT_API_KEY}`
    },
    body: JSON.stringify({
      match_id: matchId,
      user_id: interaction.user.id
    })
  });
  
  const { room_url } = await response.json();
  
  await interaction.reply({
    content: `Battle room created! Join here: ${room_url}`,
    ephemeral: true
  });
}

async function handleTeamCheckCommand(interaction: any) {
  const teamText = interaction.options.getString('team');
  
  // Parse and validate team
  const { parseShowdownTeam, validateTeamAgainstRoster } = await import('@/lib/team-parser');
  const parsed = await parseShowdownTeam(teamText);
  
  // Get user's roster
  const supabase = createClient();
  const { data: roster } = await supabase
    .from('team_rosters')
    .select('pokemon_id, pokemon_name')
    .eq('coach_id', interaction.user.id);
  
  const validation = await validateTeamAgainstRoster(parsed, roster, leagueRules);
  
  if (validation.valid) {
    await interaction.reply({
      content: '✅ Your team is valid!',
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: `❌ Team validation failed:\n${validation.errors.join('\n')}`,
      ephemeral: true
    });
  }
}
```

#### 3.2 Match Thread Creation

**Create**: `lib/discord-match-threads.ts`

```typescript
import { Client, ThreadChannel, EmbedBuilder } from 'discord.js';

export async function createMatchThread(
  client: Client,
  channelId: string,
  match: {
    id: string;
    team1_name: string;
    team2_name: string;
    week: number;
    deadline: Date;
    showdown_room_url?: string;
  }
): Promise<ThreadChannel> {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) throw new Error('Invalid channel');
  
  const embed = new EmbedBuilder()
    .setTitle(`Week ${match.week}: ${match.team1_name} vs ${match.team2_name}`)
    .setDescription(`Deadline: ${match.deadline.toLocaleDateString()}`)
    .addFields([
      { name: 'Team 1', value: match.team1_name, inline: true },
      { name: 'Team 2', value: match.team2_name, inline: true },
      { name: 'View Match', value: `${process.env.APP_URL}/matches/${match.id}`, inline: false }
    ])
    .setColor(0x5865F2);
  
  if (match.showdown_room_url) {
    embed.addFields([{
      name: 'Battle Room',
      value: `[Launch Battle](${match.showdown_room_url})`,
      inline: false
    }]);
  }
  
  const message = await channel.send({ embeds: [embed] });
  const thread = await message.startThread({
    name: `${match.team1_name} vs ${match.team2_name}`,
    autoArchiveDuration: 1440 // 24 hours
  });
  
  return thread;
}
```

---

### Phase 4: In-App Showdown Section

**Goal**: Create dedicated "Battle Simulator" section in the app.

#### 4.1 Showdown Page Structure

**Update**: `app/showdown/page.tsx`

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MatchLobby from '@/components/showdown/match-lobby';
import TeamBuilder from '@/components/showdown/team-builder';
import ReplayLibrary from '@/components/showdown/replay-library';
import Analytics from '@/components/showdown/analytics';

export default function ShowdownPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Battle Simulator</h1>
      
      <Tabs defaultValue="lobby" className="w-full">
        <TabsList>
          <TabsTrigger value="lobby">Match Lobby</TabsTrigger>
          <TabsTrigger value="builder">Team Builder</TabsTrigger>
          <TabsTrigger value="replays">Replay Library</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="lobby">
          <MatchLobby />
        </TabsContent>
        
        <TabsContent value="builder">
          <TeamBuilder />
        </TabsContent>
        
        <TabsContent value="replays">
          <ReplayLibrary />
        </TabsContent>
        
        <TabsContent value="analytics">
          <Analytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 4.2 Match Lobby Component

**Create**: `components/showdown/match-lobby.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Match {
  id: string;
  team1_name: string;
  team2_name: string;
  week: number;
  status: string;
  showdown_room_url?: string;
  deadline: string;
}

export default function MatchLobby() {
  const [matches, setMatches] = useState<Match[]>([]);
  
  useEffect(() => {
    fetch('/api/matches?status=scheduled,in_progress')
      .then(res => res.json())
      .then(data => setMatches(data));
  }, []);
  
  const handleLaunchBattle = async (matchId: string) => {
    const response = await fetch('/api/showdown/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId })
    });
    
    const { room_url } = await response.json();
    window.open(room_url, '_blank');
  };
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {matches.map(match => (
        <Card key={match.id}>
          <CardHeader>
            <CardTitle>Week {match.week}</CardTitle>
            <CardDescription>
              {match.team1_name} vs {match.team2_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Badge variant={match.status === 'in_progress' ? 'default' : 'secondary'}>
                {match.status}
              </Badge>
              
              <p className="text-sm text-muted-foreground">
                Deadline: {new Date(match.deadline).toLocaleDateString()}
              </p>
              
              {match.showdown_room_url ? (
                <Button
                  onClick={() => window.open(match.showdown_room_url, '_blank')}
                  className="w-full"
                >
                  Join Battle Room
                </Button>
              ) : (
                <Button
                  onClick={() => handleLaunchBattle(match.id)}
                  className="w-full"
                >
                  Launch Battle
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### 4.3 Team Builder with Showdown Integration

**Update**: `components/showdown/team-builder.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseShowdownTeam, validateTeamAgainstRoster } from '@/lib/team-parser';

export default function TeamBuilder() {
  const [teamText, setTeamText] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  
  const handleValidate = async () => {
    const parsed = await parseShowdownTeam(teamText);
    
    // Fetch user's roster
    const rosterResponse = await fetch('/api/draft/team-status');
    const { roster } = await rosterResponse.json();
    
    // Fetch league rules
    const rulesResponse = await fetch('/api/league-config?type=rules');
    const rules = await rulesResponse.json();
    
    const result = await validateTeamAgainstRoster(parsed, roster, rules);
    setValidation(result);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Paste Showdown Team Export</label>
        <Textarea
          value={teamText}
          onChange={(e) => setTeamText(e.target.value)}
          placeholder="Paste your team here..."
          className="mt-2 font-mono text-sm"
          rows={10}
        />
      </div>
      
      <Button onClick={handleValidate}>Validate Team</Button>
      
      {validation && (
        <Alert variant={validation.valid ? 'default' : 'destructive'}>
          <AlertDescription>
            {validation.valid ? (
              '✅ Your team is valid!'
            ) : (
              <ul className="list-disc list-inside">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

#### 4.4 Replay Library Component

**Create**: `components/showdown/replay-library.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Replay {
  id: string;
  match_id: string;
  team1_name: string;
  team2_name: string;
  winner_name: string;
  replay_url: string;
  week: number;
  created_at: string;
}

export default function ReplayLibrary() {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    fetch('/api/matches?status=completed&include_replays=true')
      .then(res => res.json())
      .then(data => setReplays(data));
  }, []);
  
  const filtered = replays.filter(r =>
    r.team1_name.toLowerCase().includes(search.toLowerCase()) ||
    r.team2_name.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="space-y-4">
      <Input
        placeholder="Search replays..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(replay => (
          <Card key={replay.id}>
            <CardHeader>
              <CardTitle>Week {replay.week}</CardTitle>
              <CardDescription>
                {replay.team1_name} vs {replay.team2_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge>Winner: {replay.winner_name}</Badge>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(replay.replay_url, '_blank')}
                >
                  View Replay
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

### Phase 5: Database Schema Enhancements

**Goal**: Add tables and columns needed for Showdown integration.

#### 5.1 Migration: Showdown Integration Tables

**Create**: `supabase/migrations/YYYYMMDDHHMMSS_add_showdown_integration.sql`

```sql
-- Add Showdown room tracking to matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS showdown_room_id TEXT,
  ADD COLUMN IF NOT EXISTS showdown_room_url TEXT,
  ADD COLUMN IF NOT EXISTS replay_data JSONB;

-- Create replays table for better organization
CREATE TABLE IF NOT EXISTS public.replays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  showdown_room_id TEXT UNIQUE,
  replay_url TEXT NOT NULL,
  replay_data JSONB, -- Parsed replay data
  winner_id UUID REFERENCES public.teams(id),
  turn_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replays_match_id ON public.replays(match_id);
CREATE INDEX IF NOT EXISTS idx_replays_showdown_room_id ON public.replays(showdown_room_id);

-- Create team submissions table (for Option A: pre-match submission)
CREATE TABLE IF NOT EXISTS public.team_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  team_export TEXT NOT NULL, -- Showdown export format
  team_json JSONB, -- Parsed team data
  validated_at TIMESTAMPTZ,
  validation_errors TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_submissions_match_id ON public.team_submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_team_submissions_team_id ON public.team_submissions(team_id);

-- Create showdown events table for tracking room events
CREATE TABLE IF NOT EXISTS public.showdown_events (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  match_id UUID REFERENCES public.matches(id),
  event_type TEXT NOT NULL, -- battle_start, battle_end, turn, etc.
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_showdown_events_room_id ON public.showdown_events(room_id);
CREATE INDEX IF NOT EXISTS idx_showdown_events_match_id ON public.showdown_events(match_id);

-- Enable RLS
ALTER TABLE public.replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showdown_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Replays are viewable by authenticated users"
  ON public.replays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team submissions are viewable by team owner"
  ON public.team_submissions FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Showdown events are viewable by authenticated users"
  ON public.showdown_events FOR SELECT
  TO authenticated
  USING (true);
```

---

### Phase 6: Additional Ecosystem Services

**Goal**: Set up optional but valuable services (PokéAPI, Ditto, Notion).

#### 6.1 Self-Hosted PokéAPI Setup

**Create**: `docker-compose.pokeapi.yml`

```yaml
version: '3.8'

services:
  pokeapi-postgres:
    image: postgres:15-alpine
    container_name: poke-mnky-pokeapi-db
    environment:
      - POSTGRES_DB=pokeapi
      - POSTGRES_USER=pokeapi
      - POSTGRES_PASSWORD=${POKEAPI_DB_PASSWORD}
    volumes:
      - pokeapi-data:/var/lib/postgresql/data
    networks:
      - poke-mnky-network

  pokeapi-redis:
    image: redis:7-alpine
    container_name: poke-mnky-pokeapi-redis
    networks:
      - poke-mnky-network

  pokeapi:
    image: pokeapi/pokeapi:latest
    container_name: poke-mnky-pokeapi
    depends_on:
      - pokeapi-postgres
      - pokeapi-redis
    environment:
      - DATABASE_URL=postgresql://pokeapi:${POKEAPI_DB_PASSWORD}@pokeapi-postgres:5432/pokeapi
      - REDIS_URL=redis://pokeapi-redis:6379
    networks:
      - poke-mnky-network
    ports:
      - "8001:8000"

volumes:
  pokeapi-data:

networks:
  poke-mnky-network:
    external: true
```

#### 6.2 Ditto Tool Integration

**Create**: `scripts/ditto-sync.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function syncPokeAPIData() {
  // Run ditto clone
  await execAsync(
    `docker compose -f docker-compose.ditto.yml run --rm ditto clone --src-url http://pokeapi:8000/api/v2 --dest-dir ./data`
  );
  
  // Run ditto analyze
  await execAsync(
    `docker compose -f docker-compose.ditto.yml run --rm ditto analyze --data-dir ./data`
  );
  
  // Run ditto transform
  await execAsync(
    `docker compose -f docker-compose.ditto.yml run --rm ditto transform --base-url=http://pokeapi.moodmnky.com/api/v2 --src-dir=./data --dest-dir=./_gen`
  );
  
  console.log('Ditto sync complete');
}
```

#### 6.3 Notion Integration (Optional)

**Create**: `lib/notion-client.ts`

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

export async function getLeagueRules() {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_RULES_DATABASE_ID!,
    filter: {
      property: 'Status',
      select: {
        equals: 'Published'
      }
    }
  });
  
  return response.results;
}

export async function createAnnouncement(content: string) {
  await notion.pages.create({
    parent: {
      database_id: process.env.NOTION_ANNOUNCEMENTS_DATABASE_ID!
    },
    properties: {
      Title: {
        title: [{ text: { content: 'New Announcement' } }]
      },
      Content: {
        rich_text: [{ text: { content } }]
      }
    }
  });
}
```

---

## Implementation Priority & Timeline

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Showdown server Docker container
- [ ] Configure Cloudflare Tunnel
- [ ] Basic room creation API
- [ ] Test battle flow end-to-end

### Phase 2: Integration Layer (Weeks 3-4)
- [ ] Team parsing module (koffingjs)
- [ ] Roster validation API
- [ ] Integration worker setup
- [ ] Basic replay capture

### Phase 3: Discord Automation (Weeks 5-6)
- [ ] Enhanced bot commands
- [ ] Match thread creation
- [ ] Automated result posting
- [ ] Team check command

### Phase 4: In-App Features (Weeks 7-8)
- [ ] Showdown page structure
- [ ] Match lobby component
- [ ] Team builder with validation
- [ ] Replay library

### Phase 5: Polish & Optimization (Weeks 9-10)
- [ ] Analytics dashboard
- [ ] Performance optimization
- [ ] Error handling
- [ ] Documentation

### Phase 6: Ecosystem Expansion (Ongoing)
- [ ] Self-hosted PokéAPI (optional)
- [ ] Ditto integration (optional)
- [ ] Notion integration (optional)

---

## Key Integration Points

### 1. Showdown ↔ App Communication

**Flow:**
```
App → POST /api/showdown/create-room → Showdown Server
Showdown Server → Webhook → Integration Worker → Supabase + Discord
```

### 2. Team Validation Flow

**Flow:**
```
User pastes team → Team Parser → Validate against roster → Show errors or approve
Approved team → Generate token → User imports to Showdown
```

### 3. Result Capture Flow

**Flow:**
```
Battle completes → Showdown emits event → Integration Worker listens
Worker parses replay → Updates Supabase → Posts to Discord → Updates standings
```

---

## Testing Strategy

### Unit Tests
- Team parsing and validation logic
- API endpoint handlers
- Database operations

### Integration Tests
- Showdown room creation flow
- Replay parsing and ingestion
- Discord bot command handling

### End-to-End Tests
- Complete battle flow: Create match → Launch battle → Complete → Auto-record result
- Team validation: Paste team → Validate → Show errors → Fix → Approve

---

## Security Considerations

### API Key Management
- Use environment variables for all API keys
- Rotate keys regularly
- Use different keys for different services

### Showdown Server Security
- Isolate on internal Docker network
- Cloudflare Tunnel as only ingress
- Rate limiting via Cloudflare WAF
- Optional Cloudflare Access for member-only access

### Data Validation
- Always validate team data server-side
- Never trust client-submitted data
- Use Supabase RLS for database access control

---

## Monitoring & Observability

### Logging
- Integration worker logs all events
- Showdown server logs battle events
- Discord bot logs command usage

### Metrics
- Battle completion rate
- Average battle duration
- Team validation success rate
- Replay capture rate

### Alerts
- Showdown server downtime
- Integration worker failures
- High error rates in team validation

---

## Conclusion

This comprehensive buildout plan provides a detailed roadmap for integrating Pokémon Showdown into the POKE MNKY platform. By following this phased approach, you can incrementally add value while maintaining system stability and avoiding over-engineering.

The key to success is starting with the MVP (Phase 1-2) to get basic Showdown integration working, then iteratively adding features based on user feedback and needs. The modular architecture allows for flexibility in implementation order and the ability to defer optional components (PokéAPI, Ditto, Notion) until they're actually needed.
