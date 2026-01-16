# Priority 1.1: Integration Worker Implementation Plan

**Date**: January 2026  
**Status**: Implementation Ready  
**Priority**: Critical Production Blocker  
**Estimated Effort**: 2-3 weeks

---

## Executive Summary

The Integration Worker is the critical automation component that bridges Showdown battles with league management. Currently in placeholder mode, this service must be fully implemented to enable automatic battle result capture, standings updates, and Discord notifications. Without it, all match results require manual entry, creating administrative overhead and potential for errors.

This document provides a comprehensive, actionable implementation plan with code examples, architecture decisions, and step-by-step instructions to transform the placeholder worker into a production-ready automation service.

---

## Current State Analysis

### What Exists

1. **Database Schema**: ✅ Complete
   - `matches` table with `showdown_room_id`, `showdown_room_url`, `replay_url` fields
   - `status` field supports: 'scheduled', 'in_progress', 'completed', 'disputed', 'cancelled'
   - Index on `showdown_room_id` for fast lookups

2. **App-Side Endpoints**: ✅ Complete
   - `/api/showdown/create-room` - Creates battle rooms and updates match records
   - `/api/showdown/validate-team` - Validates teams against rosters
   - `/api/matches` - Match CRUD operations

3. **Discord Notifications**: ✅ Complete
   - `lib/discord-notifications.ts` with `notifyMatchResult()` function
   - Webhook system configured in `discord_webhooks` table

4. **Standings Calculation**: ✅ Complete
   - `/api/standings` endpoint exists
   - Teams table has `wins`, `losses`, `differential` fields

### What's Missing

1. **Integration Worker Service**: ❌ Not implemented
   - No code exists in `scripts/integration-worker/`
   - No Docker configuration
   - No WebSocket monitoring
   - No replay parsing logic

2. **Replay Parsing**: ❌ Not implemented
   - No library integration for parsing Showdown replay logs
   - No logic to extract winner, scores, or battle statistics

3. **WebSocket Monitoring**: ❌ Not implemented
   - No connection to Showdown server WebSocket API
   - No battle room event listeners
   - No completion detection logic

4. **Standings Update Trigger**: ❌ Not implemented
   - No automatic recalculation when matches complete
   - Standings must be manually refreshed

---

## Architecture Design

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SHOWDOWN SERVER                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Battle Room: battle-match-{match_id}              │   │
│  │  WebSocket Events: |win|, |tie|, |forfeit|        │   │
│  │  Replay Files: /replays/{roomId}.log               │   │
│  └──────────────────┬──────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      │ WebSocket Events
                      │ Replay File Access
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              INTEGRATION WORKER                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. WebSocket Monitor                                │  │
│  │     - Connect to Showdown server                     │  │
│  │     - Join battle rooms                              │  │
│  │     - Listen for |win|, |tie| events                 │  │
│  └──────────────────┬───────────────────────────────────┘  │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │  2. Replay Parser                                     │  │
│  │     - Fetch replay from Showdown                      │  │
│  │     - Parse log lines using @pkmn/protocol          │  │
│  │     - Extract winner, scores, faints                  │  │
│  └──────────────────┬───────────────────────────────────┘  │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │  3. Database Updater                                  │  │
│  │     - Find match by showdown_room_id                 │  │
│  │     - Update match record with results                │  │
│  │     - Set status to 'completed'                      │  │
│  └──────────────────┬───────────────────────────────────┘  │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │  4. Discord Notifier                                  │  │
│  │     - Call notifyMatchResult()                       │  │
│  │     - Post formatted result message                  │  │
│  └──────────────────┬───────────────────────────────────┘  │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │  5. Standings Updater                                 │  │
│  │     - Recalculate wins/losses/differential           │  │
│  │     - Update teams table                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ HTTP API Calls
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE DATABASE                             │
│  - matches table updated                                    │
│  - teams table updated (standings)                         │
│  - discord_webhooks table queried                          │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

1. **WebSocket Monitor**: Maintains persistent connection to Showdown server, joins battle rooms, listens for completion events
2. **Replay Parser**: Fetches and parses replay logs to extract structured battle data
3. **Database Updater**: Updates match records and triggers standings recalculation
4. **Discord Notifier**: Posts formatted results to Discord channels
5. **Standings Calculator**: Recalculates team statistics based on completed matches

---

## Implementation Plan

### Phase 1: Project Setup and Dependencies (Day 1-2)

#### Step 1.1: Create Directory Structure

```bash
mkdir -p scripts/integration-worker/src
mkdir -p scripts/integration-worker/src/parsers
mkdir -p scripts/integration-worker/src/monitors
mkdir -p scripts/integration-worker/src/updaters
```

#### Step 1.2: Install Dependencies

Create `scripts/integration-worker/package.json`:

```json
{
  "name": "@poke-mnky/integration-worker",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@pkmn/protocol": "^0.5.0",
    "@pkmn/client": "^0.5.0",
    "@supabase/supabase-js": "^2.39.0",
    "ws": "^8.16.0",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/ws": "^8.5.10",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

#### Step 1.3: Create TypeScript Configuration

Create `scripts/integration-worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Phase 2: WebSocket Monitor Implementation (Day 3-5)

#### Step 2.1: Create WebSocket Client

Create `scripts/integration-worker/src/monitors/showdown-monitor.ts`:

```typescript
import WebSocket from 'ws';
import { Protocol } from '@pkmn/protocol';

export interface BattleCompletionEvent {
  roomId: string;
  winner: 'p1' | 'p2' | null; // null for tie
  isTie: boolean;
  isForfeit: boolean;
  timestamp: Date;
}

export class ShowdownMonitor {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private roomSubscriptions = new Set<string>();
  private onBattleComplete?: (event: BattleCompletionEvent) => void;

  constructor(
    private serverUrl: string,
    private reconnectDelay: number = 5000
  ) {}

  /**
   * Connect to Showdown server WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.serverUrl.replace(/^https?/, 'ws').replace(/^http/, 'ws');
      this.ws = new WebSocket(`${wsUrl}/showdown/websocket`);

      this.ws.on('open', () => {
        console.log('[ShowdownMonitor] Connected to Showdown server');
        this.reconnectTimer = null;
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (error) => {
        console.error('[ShowdownMonitor] WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[ShowdownMonitor] WebSocket closed, reconnecting...');
        this.scheduleReconnect();
      });
    });
  }

  /**
   * Subscribe to battle room events
   */
  subscribeToRoom(roomId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Join room: |/join {roomId}
    this.ws.send(`|/join ${roomId}`);
    this.roomSubscriptions.add(roomId);
    console.log(`[ShowdownMonitor] Subscribed to room: ${roomId}`);
  }

  /**
   * Unsubscribe from battle room
   */
  unsubscribeFromRoom(roomId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Leave room: |/leave {roomId}
    this.ws.send(`|/leave ${roomId}`);
    this.roomSubscriptions.delete(roomId);
    console.log(`[ShowdownMonitor] Unsubscribed from room: ${roomId}`);
  }

  /**
   * Set callback for battle completion events
   */
  onBattleComplete(callback: (event: BattleCompletionEvent) => void): void {
    this.onBattleComplete = callback;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: string): void {
    // Showdown protocol format: {roomId}|{command}|{args...}
    const parts = message.split('|');
    if (parts.length < 2) return;

    const roomId = parts[0];
    const command = parts[1];

    // Check if this is a battle completion event
    if (command === 'win' || command === 'tie' || command === 'draw' || command === 'forcewin' || command === 'forfeit') {
      this.handleBattleCompletion(roomId, command, parts.slice(2));
    }
  }

  /**
   * Handle battle completion events
   */
  private handleBattleCompletion(roomId: string, command: string, args: string[]): void {
    if (!this.onBattleComplete) return;

    let winner: 'p1' | 'p2' | null = null;
    let isTie = false;
    let isForfeit = false;

    if (command === 'win' || command === 'forcewin') {
      // |win|p1 or |win|PlayerName
      const winnerArg = args[0];
      if (winnerArg === 'p1' || winnerArg?.startsWith('p1')) {
        winner = 'p1';
      } else if (winnerArg === 'p2' || winnerArg?.startsWith('p2')) {
        winner = 'p2';
      }
    } else if (command === 'tie' || command === 'draw') {
      isTie = true;
    } else if (command === 'forfeit') {
      isForfeit = true;
      // Forfeit usually means the other player wins
      // We'll need to check replay to determine actual winner
    }

    const event: BattleCompletionEvent = {
      roomId,
      winner,
      isTie,
      isForfeit,
      timestamp: new Date(),
    };

    console.log(`[ShowdownMonitor] Battle completed in ${roomId}:`, event);
    this.onBattleComplete(event);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      console.log('[ShowdownMonitor] Attempting to reconnect...');
      this.connect().catch((error) => {
        console.error('[ShowdownMonitor] Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.roomSubscriptions.clear();
  }
}
```

#### Step 2.2: Create Room Manager

Create `scripts/integration-worker/src/monitors/room-manager.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { ShowdownMonitor, BattleCompletionEvent } from './showdown-monitor';

export class RoomManager {
  private monitor: ShowdownMonitor;
  private supabase: ReturnType<typeof createClient>;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    showdownServerUrl: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.monitor = new ShowdownMonitor(showdownServerUrl);
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Set up battle completion handler
    this.monitor.onBattleComplete((event) => {
      this.handleBattleCompletion(event);
    });
  }

  /**
   * Start monitoring active battle rooms
   */
  async start(): Promise<void> {
    await this.monitor.connect();
    
    // Poll for new battle rooms every 30 seconds
    this.pollInterval = setInterval(() => {
      this.syncActiveRooms();
    }, 30000);

    // Initial sync
    await this.syncActiveRooms();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.monitor.disconnect();
  }

  /**
   * Sync active battle rooms from database
   */
  private async syncActiveRooms(): Promise<void> {
    try {
      // Get all matches with active Showdown rooms
      const { data: matches, error } = await this.supabase
        .from('matches')
        .select('id, showdown_room_id, status')
        .eq('status', 'in_progress')
        .not('showdown_room_id', 'is', null);

      if (error) {
        console.error('[RoomManager] Error fetching active rooms:', error);
        return;
      }

      if (!matches) return;

      // Subscribe to all active rooms
      for (const match of matches) {
        if (match.showdown_room_id && !this.monitor.roomSubscriptions.has(match.showdown_room_id)) {
          try {
            this.monitor.subscribeToRoom(match.showdown_room_id);
          } catch (error) {
            console.error(`[RoomManager] Failed to subscribe to room ${match.showdown_room_id}:`, error);
          }
        }
      }

      // Unsubscribe from rooms that are no longer active
      const activeRoomIds = new Set(matches.map(m => m.showdown_room_id).filter(Boolean));
      for (const roomId of this.monitor.roomSubscriptions) {
        if (!activeRoomIds.has(roomId)) {
          this.monitor.unsubscribeFromRoom(roomId);
        }
      }
    } catch (error) {
      console.error('[RoomManager] Error syncing rooms:', error);
    }
  }

  /**
   * Handle battle completion event
   */
  private async handleBattleCompletion(event: BattleCompletionEvent): Promise<void> {
    console.log(`[RoomManager] Processing battle completion for room ${event.roomId}`);
    
    // Find match by room ID
    const { data: match, error } = await this.supabase
      .from('matches')
      .select('id, team1_id, team2_id, showdown_room_id')
      .eq('showdown_room_id', event.roomId)
      .single();

    if (error || !match) {
      console.error(`[RoomManager] Match not found for room ${event.roomId}:`, error);
      return;
    }

    // Trigger replay parsing and result update
    // This will be handled by the ReplayParser service
    // For now, we'll emit an event that the main worker can handle
    console.log(`[RoomManager] Battle completed for match ${match.id}, triggering replay parse`);
  }
}
```

---

### Phase 3: Replay Parser Implementation (Day 6-8)

#### Step 3.1: Create Replay Parser

Create `scripts/integration-worker/src/parsers/replay-parser.ts`:

```typescript
import { Protocol } from '@pkmn/protocol';
import fetch from 'node-fetch';

export interface ParsedReplayResult {
  winner: 'p1' | 'p2' | null; // null for tie
  team1Score: number; // KOs for team1
  team2Score: number; // KOs for team2
  differential: number; // Absolute difference
  replayUrl: string;
  battleLog: string[];
  faints: Array<{
    pokemon: string;
    side: 'p1' | 'p2';
    turn: number;
  }>;
}

export class ReplayParser {
  constructor(
    private showdownServerUrl: string
  ) {}

  /**
   * Fetch replay from Showdown server
   */
  async fetchReplay(roomId: string): Promise<string> {
    // Showdown replay URL format: https://{server}/replay/{format}-{roomId}
    // We need to extract format from roomId or match record
    const replayUrl = `${this.showdownServerUrl}/replay/${roomId}.log`;
    
    const response = await fetch(replayUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch replay: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Parse replay log to extract battle results
   */
  async parseReplay(roomId: string): Promise<ParsedReplayResult> {
    const logText = await this.fetchReplay(roomId);
    const logLines = logText.split('\n').filter(line => line.trim());

    let winner: 'p1' | 'p2' | null = null;
    let team1Score = 0;
    let team2Score = 0;
    const faints: ParsedReplayResult['faints'] = [];
    let currentTurn = 0;

    // Parse log lines
    for (const line of logLines) {
      // Parse protocol message
      const parts = line.split('|');
      if (parts.length < 2) continue;

      const command = parts[1];

      // Track turn number
      if (command === 'turn') {
        currentTurn = parseInt(parts[2]) || 0;
        continue;
      }

      // Track faints
      if (command === 'faint') {
        const pokemon = parts[2] || '';
        const side = pokemon.startsWith('p1') ? 'p1' : 'p2';
        
        faints.push({
          pokemon,
          side,
          turn: currentTurn,
        });

        // Increment score for the side that caused the faint
        if (side === 'p2') {
          team1Score++;
        } else {
          team2Score++;
        }
        continue;
      }

      // Detect winner
      if (command === 'win') {
        const winnerArg = parts[2] || '';
        if (winnerArg === 'p1' || winnerArg.startsWith('p1')) {
          winner = 'p1';
        } else if (winnerArg === 'p2' || winnerArg.startsWith('p2')) {
          winner = 'p2';
        }
        continue;
      }

      // Detect tie
      if (command === 'tie' || command === 'draw') {
        winner = null;
        continue;
      }
    }

    // Calculate differential
    const differential = Math.abs(team1Score - team2Score);

    // Construct replay URL
    const replayUrl = `${this.showdownServerUrl}/replay/${roomId}`;

    return {
      winner,
      team1Score,
      team2Score,
      differential,
      replayUrl,
      battleLog: logLines,
      faints,
    };
  }

  /**
   * Map parsed result to match update data
   */
  mapToMatchUpdate(
    parsed: ParsedReplayResult,
    match: { team1_id: string; team2_id: string }
  ): {
    winner_id: string | null;
    team1_score: number;
    team2_score: number;
    differential: number;
    replay_url: string;
    status: 'completed';
  } {
    let winner_id: string | null = null;
    
    if (parsed.winner === 'p1') {
      winner_id = match.team1_id;
    } else if (parsed.winner === 'p2') {
      winner_id = match.team2_id;
    }

    return {
      winner_id,
      team1_score: parsed.team1Score,
      team2_score: parsed.team2Score,
      differential: parsed.differential,
      replay_url: parsed.replayUrl,
      status: 'completed',
    };
  }
}
```

---

### Phase 4: Database Updater Implementation (Day 9-10)

#### Step 4.1: Create Database Updater

Create `scripts/integration-worker/src/updaters/database-updater.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { ParsedReplayResult } from '../parsers/replay-parser';

export class DatabaseUpdater {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Update match record with battle results
   */
  async updateMatch(
    roomId: string,
    parsedResult: ParsedReplayResult
  ): Promise<{ matchId: string; success: boolean }> {
    // Find match by room ID
    const { data: match, error: findError } = await this.supabase
      .from('matches')
      .select('id, team1_id, team2_id')
      .eq('showdown_room_id', roomId)
      .single();

    if (findError || !match) {
      throw new Error(`Match not found for room ${roomId}: ${findError?.message}`);
    }

    // Map parsed result to match update
    const updateData = {
      winner_id: parsedResult.winner === 'p1' 
        ? match.team1_id 
        : parsedResult.winner === 'p2' 
        ? match.team2_id 
        : null,
      team1_score: parsedResult.team1Score,
      team2_score: parsedResult.team2Score,
      differential: parsedResult.differential,
      replay_url: parsedResult.replayUrl,
      status: 'completed' as const,
      played_at: new Date().toISOString(),
    };

    // Update match record
    const { error: updateError } = await this.supabase
      .from('matches')
      .update(updateData)
      .eq('id', match.id);

    if (updateError) {
      throw new Error(`Failed to update match: ${updateError.message}`);
    }

    console.log(`[DatabaseUpdater] Updated match ${match.id} with results`);

    return {
      matchId: match.id,
      success: true,
    };
  }

  /**
   * Recalculate standings for a season
   */
  async updateStandings(seasonId?: string): Promise<void> {
    // Get all completed matches for current season
    const query = this.supabase
      .from('matches')
      .select('team1_id, team2_id, winner_id, team1_score, team2_score, differential')
      .eq('status', 'completed');

    if (seasonId) {
      query.eq('season_id', seasonId);
    }

    const { data: matches, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }

    if (!matches) return;

    // Calculate standings for each team
    const teamStats = new Map<string, { wins: number; losses: number; differential: number }>();

    for (const match of matches) {
      // Initialize team stats if not present
      if (!teamStats.has(match.team1_id)) {
        teamStats.set(match.team1_id, { wins: 0, losses: 0, differential: 0 });
      }
      if (!teamStats.has(match.team2_id)) {
        teamStats.set(match.team2_id, { wins: 0, losses: 0, differential: 0 });
      }

      const team1Stats = teamStats.get(match.team1_id)!;
      const team2Stats = teamStats.get(match.team2_id)!;

      // Update wins/losses
      if (match.winner_id === match.team1_id) {
        team1Stats.wins++;
        team2Stats.losses++;
        team1Stats.differential += match.differential;
        team2Stats.differential -= match.differential;
      } else if (match.winner_id === match.team2_id) {
        team2Stats.wins++;
        team1Stats.losses++;
        team2Stats.differential += match.differential;
        team1Stats.differential -= match.differential;
      }
    }

    // Update teams table
    for (const [teamId, stats] of teamStats.entries()) {
      const { error: updateError } = await this.supabase
        .from('teams')
        .update({
          wins: stats.wins,
          losses: stats.losses,
          differential: stats.differential,
        })
        .eq('id', teamId);

      if (updateError) {
        console.error(`[DatabaseUpdater] Failed to update team ${teamId}:`, updateError);
      }
    }

    console.log(`[DatabaseUpdater] Updated standings for ${teamStats.size} teams`);
  }
}
```

---

### Phase 5: Main Worker Integration (Day 11-12)

#### Step 5.1: Create Main Worker Entry Point

Create `scripts/integration-worker/src/index.ts`:

```typescript
import { RoomManager } from './monitors/room-manager';
import { ReplayParser } from './parsers/replay-parser';
import { DatabaseUpdater } from './updaters/database-updater';
import { notifyMatchResult } from '../../../lib/discord-notifications';

// Environment variables
const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DISCORD_RESULTS_CHANNEL_ID = process.env.DISCORD_RESULTS_CHANNEL_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[IntegrationWorker] Missing required environment variables');
  process.exit(1);
}

// Initialize services
const roomManager = new RoomManager(SHOWDOWN_SERVER_URL, SUPABASE_URL, SUPABASE_KEY);
const replayParser = new ReplayParser(SHOWDOWN_SERVER_URL);
const databaseUpdater = new DatabaseUpdater(SUPABASE_URL, SUPABASE_KEY);

/**
 * Handle battle completion
 */
async function handleBattleCompletion(roomId: string): Promise<void> {
  try {
    console.log(`[IntegrationWorker] Processing battle completion for room ${roomId}`);

    // Parse replay
    const parsedResult = await replayParser.parseReplay(roomId);
    console.log(`[IntegrationWorker] Parsed replay:`, {
      winner: parsedResult.winner,
      scores: `${parsedResult.team1Score}-${parsedResult.team2Score}`,
      differential: parsedResult.differential,
    });

    // Update match record
    const { matchId } = await databaseUpdater.updateMatch(roomId, parsedResult);

    // Update standings
    await databaseUpdater.updateStandings();

    // Notify Discord
    await notifyMatchResult(matchId);

    console.log(`[IntegrationWorker] Successfully processed battle completion for room ${roomId}`);
  } catch (error) {
    console.error(`[IntegrationWorker] Error processing battle completion:`, error);
    // TODO: Add error reporting/retry logic
  }
}

/**
 * Main worker function
 */
async function main(): Promise<void> {
  console.log('[IntegrationWorker] Starting integration worker...');

  // Set up room manager with battle completion handler
  roomManager.onBattleComplete = async (event) => {
    await handleBattleCompletion(event.roomId);
  };

  // Start monitoring
  await roomManager.start();

  console.log('[IntegrationWorker] Worker started successfully');

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[IntegrationWorker] Received SIGTERM, shutting down...');
    roomManager.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[IntegrationWorker] Received SIGINT, shutting down...');
    roomManager.stop();
    process.exit(0);
  });
}

// Start worker
main().catch((error) => {
  console.error('[IntegrationWorker] Fatal error:', error);
  process.exit(1);
});
```

---

### Phase 6: Docker Configuration (Day 13)

#### Step 6.1: Create Dockerfile

Create `scripts/integration-worker/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm build

# Start worker
CMD ["node", "dist/index.js"]
```

#### Step 6.2: Update Docker Compose

Add to `docker-compose.yml` (on server):

```yaml
integration-worker:
  build:
    context: .
    dockerfile: scripts/integration-worker/Dockerfile
  container_name: poke-mnky-integration-worker
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - SHOWDOWN_SERVER_URL=http://pokemon-showdown:8000
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    - DISCORD_RESULTS_CHANNEL_ID=${DISCORD_RESULTS_CHANNEL_ID}
  networks:
    - poke-mnky-network
  depends_on:
    - pokemon-showdown
```

---

### Phase 7: Testing and Validation (Day 14-15)

#### Step 7.1: Create Test Script

Create `scripts/integration-worker/src/test.ts`:

```typescript
import { ReplayParser } from './parsers/replay-parser';

async function testReplayParser() {
  const parser = new ReplayParser('https://aab-showdown.moodmnky.com');
  
  // Test with a known room ID
  const testRoomId = 'battle-gen9avgatbest-test123';
  
  try {
    const result = await parser.parseReplay(testRoomId);
    console.log('Parsed result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testReplayParser();
```

#### Step 7.2: Manual Testing Checklist

- [ ] WebSocket connection to Showdown server
- [ ] Room subscription/unsubscription
- [ ] Battle completion event detection
- [ ] Replay fetching and parsing
- [ ] Match record updates
- [ ] Standings recalculation
- [ ] Discord notifications
- [ ] Error handling and retries
- [ ] Graceful shutdown

---

## Error Handling and Resilience

### Retry Logic

Implement exponential backoff for:
- WebSocket reconnection
- Replay fetching failures
- Database update failures
- Discord notification failures

### Error Logging

Use structured logging with:
- Error context (room ID, match ID, timestamp)
- Stack traces for debugging
- Error aggregation for monitoring

### Dead Letter Queue

For failed battle completions:
- Store failed events in database
- Retry with exponential backoff
- Alert after max retries exceeded

---

## Monitoring and Observability

### Metrics to Track

- WebSocket connection uptime
- Battle completion events processed
- Replay parsing success rate
- Database update latency
- Discord notification success rate
- Standings update frequency

### Logging Strategy

- Structured JSON logs
- Log levels: DEBUG, INFO, WARN, ERROR
- Include correlation IDs for tracing

---

## Deployment Checklist

- [ ] Install dependencies (`pnpm install`)
- [ ] Build TypeScript (`pnpm build`)
- [ ] Set environment variables in Docker Compose
- [ ] Test WebSocket connection locally
- [ ] Test replay parsing with sample replays
- [ ] Deploy to server Docker Compose
- [ ] Monitor logs for errors
- [ ] Test with real battle completion
- [ ] Verify database updates
- [ ] Verify Discord notifications
- [ ] Verify standings updates

---

## Next Steps After Implementation

1. **Phase 2**: Add replay file watching (alternative to WebSocket)
2. **Phase 3**: Add battle statistics extraction (Pokémon usage, move usage)
3. **Phase 4**: Add replay storage to MinIO/Supabase Storage
4. **Phase 5**: Add battle replay viewer integration

---

## Risk Mitigation

### Risks

1. **WebSocket disconnections**: Implement reconnection logic ✅
2. **Replay parsing failures**: Add validation and fallback parsing
3. **Database update conflicts**: Use transactions and conflict resolution
4. **Discord rate limits**: Implement rate limiting and queuing
5. **Showdown server downtime**: Add health checks and graceful degradation

### Mitigation Strategies

- Comprehensive error handling at each step
- Retry logic with exponential backoff
- Dead letter queue for failed events
- Health check endpoints for monitoring
- Alerting for critical failures

---

**Status**: ✅ Phase 1 Complete - Core Implementation Ready  
**Next Action**: Install dependencies and test WebSocket connection

---

## Implementation Status

### ✅ Completed (Phase 1)

- [x] Project structure created
- [x] Package.json with dependencies
- [x] TypeScript configuration
- [x] ShowdownMonitor class (WebSocket monitoring)
- [x] RoomManager class (room subscription management)
- [x] ReplayParser class (replay log parsing)
- [x] DatabaseUpdater class (match updates and standings)
- [x] Main worker entry point (index.ts)
- [x] Dockerfile for deployment
- [x] Test script for replay parser
- [x] Deployment guide

### ⏳ Next Steps

1. **Install Dependencies**:
   ```bash
   cd scripts/integration-worker
   pnpm install
   ```

2. **Test WebSocket Connection**:
   - Update `SHOWDOWN_SERVER_URL` in environment
   - Run `pnpm dev` to test connection
   - Verify WebSocket connects successfully

3. **Test Replay Parsing**:
   - Update test script with real room ID
   - Run `pnpm test` to verify parsing works
   - Check parsed results are correct

4. **Deploy to Server**:
   - Add to server's docker-compose.yml
   - Build and start container
   - Monitor logs for errors

5. **Validate End-to-End**:
   - Create test battle room
   - Complete battle
   - Verify match updates
   - Verify standings update
   - Verify Discord notification
