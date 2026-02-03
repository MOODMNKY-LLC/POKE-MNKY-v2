/**
 * Integration Worker - Main Entry Point
 * Automates Showdown battle result capture and standings updates
 */

import { RoomManager } from './monitors/room-manager.js';
import { ReplayParser } from './parsers/replay-parser.js';
import { DatabaseUpdater } from './updaters/database-updater.js';
import { BattleCompletionEvent } from './monitors/showdown-monitor.js';

// Environment variables
const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DISCORD_RESULTS_CHANNEL_ID = process.env.DISCORD_RESULTS_CHANNEL_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[IntegrationWorker] Missing required environment variables');
  console.error('  Required: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('  Required: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize services
const roomManager = new RoomManager(SHOWDOWN_SERVER_URL, SUPABASE_URL, SUPABASE_KEY);
const replayParser = new ReplayParser(SHOWDOWN_SERVER_URL);
const databaseUpdater = new DatabaseUpdater(SUPABASE_URL, SUPABASE_KEY);

/**
 * Post match result to Discord
 */
async function notifyDiscord(matchId: string): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get match with team names
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(name),
        team2:teams!matches_team2_id_fkey(name),
        winner:teams!matches_winner_id_fkey(name)
      `)
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.warn(`[IntegrationWorker] Match ${matchId} not found for Discord notification:`, matchError?.message);
      return;
    }

    // Get Discord webhook
    const { data: webhook, error: webhookError } = await supabase
      .from('discord_webhooks')
      .select('webhook_url, enabled')
      .eq('name', 'match_results')
      .single();

    if (webhookError || !webhook) {
      console.warn('[IntegrationWorker] Discord webhook not configured:', webhookError?.message);
      return;
    }

    if (!webhook.enabled) {
      console.log('[IntegrationWorker] Discord webhook disabled, skipping notification');
      return;
    }

    const message = `🏆 **Match Result - Week ${match.week}**\n\n**${match.team1?.name || 'Team 1'}** ${match.team1_score} - ${match.team2_score} **${match.team2?.name || 'Team 2'}**\n\nWinner: **${match.winner?.name || 'Tie'}**\nDifferential: ${match.differential} KOs${match.replay_url ? `\n\nReplay: ${match.replay_url}` : ''}`;

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
    }

    console.log(`[IntegrationWorker] Posted result to Discord for match ${matchId}`);
  } catch (error) {
    console.error('[IntegrationWorker] Failed to notify Discord:', error);
    // Don't throw - Discord notification failure shouldn't block match update
  }
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 10000;

function backoffMs(attempt: number): number {
  const ms = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  return Math.min(ms, MAX_BACKOFF_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a step with retry and exponential backoff.
 * Logs failures and rethrows after final attempt.
 */
async function withRetry<T>(
  stepName: string,
  roomId: string,
  fn: () => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        console.log(`[IntegrationWorker] ${stepName} succeeded on attempt ${attempt + 1} for room ${roomId}`);
      }
      return result;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[IntegrationWorker] ${stepName} failed (attempt ${attempt + 1}/${MAX_RETRIES}) for room ${roomId}:`, errMsg);
      if (attempt < MAX_RETRIES - 1) {
        const delay = backoffMs(attempt);
        console.log(`[IntegrationWorker] Retrying ${stepName} in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * Handle battle completion with retry/backoff and structured logging.
 * Room ID format from app: battle-match-{matchId (first 16 chars of UUID)}.
 */
async function handleBattleCompletion(event: BattleCompletionEvent): Promise<void> {
  const roomId = event.roomId;
  const startTime = Date.now();

  try {
    console.log(`[IntegrationWorker] Processing battle completion for room ${roomId}`);

    const parsedResult = await withRetry('Replay parse', roomId, () =>
      replayParser.parseReplay(roomId)
    );
    console.log(`[IntegrationWorker] Parsed replay for ${roomId}:`, {
      winner: parsedResult.winner,
      scores: `${parsedResult.team1Score}-${parsedResult.team2Score}`,
      differential: parsedResult.differential,
    });

    const { matchId } = await withRetry('Update match', roomId, () =>
      databaseUpdater.updateMatch(roomId, parsedResult)
    );

    await withRetry('Update standings', roomId, () =>
      databaseUpdater.updateStandings()
    );

    await notifyDiscord(matchId);

    const durationMs = Date.now() - startTime;
    console.log(`[IntegrationWorker] Successfully processed battle completion for room ${roomId} (match ${matchId}) in ${durationMs}ms`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error(`[IntegrationWorker] Error processing battle completion for room ${roomId} after ${MAX_RETRIES} attempts:`, errMsg);
    if (errStack) {
      console.error(`[IntegrationWorker] Stack:`, errStack);
    }
    // Don't rethrow - allow worker to continue processing other rooms
  }
}

/**
 * Main worker function
 */
async function main(): Promise<void> {
  console.log('[IntegrationWorker] Starting integration worker...');
  console.log(`[IntegrationWorker] Showdown Server: ${SHOWDOWN_SERVER_URL}`);
  console.log(`[IntegrationWorker] Supabase URL: ${SUPABASE_URL}`);

  // Set up room manager with battle completion handler
  roomManager.onBattleComplete = handleBattleCompletion;

  // Start monitoring
  try {
    await roomManager.start();
    console.log('[IntegrationWorker] Worker started successfully');
  } catch (error) {
    console.error('[IntegrationWorker] Failed to start worker:', error);
    process.exit(1);
  }

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
