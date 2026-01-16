/**
 * Database Updater
 * Updates match records and recalculates standings
 */

import { createClient } from '@supabase/supabase-js';
import { ParsedReplayResult } from '../parsers/replay-parser.js';

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
    type MatchRow = {
      id: string;
      team1_id: string;
      team2_id: string;
    };

    const { data: match, error: findError } = await this.supabase
      .from('matches')
      .select('id, team1_id, team2_id')
      .eq('showdown_room_id', roomId)
      .single() as { data: MatchRow | null; error: any };

    if (findError || !match) {
      throw new Error(`Match not found for room ${roomId}: ${findError?.message || 'Not found'}`);
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
    const updateResult = await ((this.supabase
      .from('matches') as any)
      .update(updateData)
      .eq('id', match.id)) as { error: any };
    const { error: updateError } = updateResult;

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
    console.log('[DatabaseUpdater] Recalculating standings...');

    // Get all completed matches for current season
    let queryBuilder = this.supabase
      .from('matches')
      .select('team1_id, team2_id, winner_id, team1_score, team2_score, differential')
      .eq('status', 'completed');

    if (seasonId) {
      queryBuilder = queryBuilder.eq('season_id', seasonId);
    }

    const { data: matches, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }

    if (!matches || matches.length === 0) {
      console.log('[DatabaseUpdater] No completed matches found');
      return;
    }

    // Type assertion for matches
    type MatchRow = {
      team1_id: string;
      team2_id: string;
      winner_id: string | null;
      team1_score: number;
      team2_score: number;
      differential: number;
    };

    // Type assertion for matches array
    const typedMatches = (matches || []) as MatchRow[];

    // Calculate standings for each team
    const teamStats = new Map<string, { wins: number; losses: number; differential: number }>();

    for (const match of typedMatches) {
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
    let updatedCount = 0;
    for (const [teamId, stats] of teamStats.entries()) {
      const updateResult = await ((this.supabase
        .from('teams') as any)
        .update({
          wins: stats.wins,
          losses: stats.losses,
          differential: stats.differential,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teamId)) as { error: any };
      const { error: updateError } = updateResult;

      if (updateError) {
        console.error(`[DatabaseUpdater] Failed to update team ${teamId}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`[DatabaseUpdater] Updated standings for ${updatedCount} teams`);
  }
}
