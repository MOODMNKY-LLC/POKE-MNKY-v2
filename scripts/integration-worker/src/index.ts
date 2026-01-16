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

/**
 * Handle battle completion
 */
async function handleBattleCompletion(event: BattleCompletionEvent): Promise<void> {
  try {
    console.log(`[IntegrationWorker] Processing battle completion for room ${event.roomId}`);

    // Parse replay
    const parsedResult = await replayParser.parseReplay(event.roomId);
    console.log(`[IntegrationWorker] Parsed replay:`, {
      winner: parsedResult.winner,
      scores: `${parsedResult.team1Score}-${parsedResult.team2Score}`,
      differential: parsedResult.differential,
    });

    // Update match record
    const { matchId } = await databaseUpdater.updateMatch(event.roomId, parsedResult);

    // Update standings
    await databaseUpdater.updateStandings();

    // Notify Discord
    await notifyDiscord(matchId);

    console.log(`[IntegrationWorker] Successfully processed battle completion for room ${event.roomId}`);
  } catch (error) {
    console.error(`[IntegrationWorker] Error processing battle completion:`, error);
    // TODO: Add error reporting/retry logic
    // For now, log error and continue
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
