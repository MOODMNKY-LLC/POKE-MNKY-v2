/**
 * Replay Parser
 * Fetches and parses Showdown replay logs to extract battle results
 */

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
    // Strip 'battle-' prefix if present (roomId might be 'battle-gen9randombattle-1')
    // Replay URLs use format: {format}-{id} (e.g., 'gen9randombattle-1')
    let replayRoomId = roomId;
    if (replayRoomId.startsWith('battle-')) {
      replayRoomId = replayRoomId.substring(7); // Remove 'battle-' prefix
    }

    // Showdown replay URL format: https://{server}/replay/{format}-{roomId}.log
    // Try the room ID as-is first (it might already include format)
    const replayUrl = `${this.showdownServerUrl}/replay/${replayRoomId}.log`;
    
    try {
      const response = await fetch(replayUrl);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      // Continue to try format-specific URLs
    }

    // If that fails, try common formats
    const formats = ['gen9randombattle', 'gen9avgatbest', 'gen9ou', 'gen9uu'];
    
    for (const format of formats) {
      const formatReplayUrl = `${this.showdownServerUrl}/replay/${format}-${replayRoomId}.log`;
      
      try {
        const response = await fetch(formatReplayUrl);
        if (response.ok) {
          return await response.text();
        }
      } catch (error) {
        // Try next format
        continue;
      }
    }

    throw new Error(`Failed to fetch replay: 404 Not Found (tried ${replayUrl} and format-specific URLs)`);
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
        // p2 fainting means p1 scored a KO
        if (side === 'p2') {
          team1Score++;
        } else if (side === 'p1') {
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

    // Construct replay URL (try to find the correct format)
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
