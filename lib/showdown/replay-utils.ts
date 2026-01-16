/**
 * Utility functions for working with Pokémon Showdown replays
 */

/**
 * Extract replay ID from a Showdown room URL
 * Handles various URL formats:
 * - https://aab-play.moodmnky.com/battle-gen9randombattle-35
 * - https://aab-replay.moodmnky.com/gen9randombattle-35
 * - gen9randombattle-35
 */
export function extractReplayId(roomUrl: string | null | undefined): string | null {
  if (!roomUrl) return null;

  try {
    // If it's already just an ID (no URL), return as-is
    if (!roomUrl.includes('://') && !roomUrl.includes('/')) {
      return roomUrl.replace(/^battle-/, ''); // Remove battle- prefix if present
    }

    // Parse URL
    const url = new URL(roomUrl);
    const pathname = url.pathname;

    // Extract from pathname
    // Format: /battle-{format}-{id} or /{format}-{id}
    const match = pathname.match(/(?:battle-)?([^/]+)$/);
    if (match) {
      return match[1].replace(/^battle-/, ''); // Remove battle- prefix if present
    }

    return null;
  } catch (error) {
    // If URL parsing fails, try to extract ID directly
    const match = roomUrl.match(/(?:battle-)?([a-z0-9]+-[0-9]+)$/i);
    return match ? match[1].replace(/^battle-/, '') : null;
  }
}

/**
 * Get replay log URL from replay ID
 */
export function getReplayLogUrl(replayId: string, serverUrl?: string): string {
  const baseUrl = serverUrl || process.env.NEXT_PUBLIC_SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com';
  return `${baseUrl}/replay/${replayId}.log`;
}

/**
 * Get replay JSON URL from replay ID
 */
export function getReplayJsonUrl(replayId: string, serverUrl?: string): string {
  const baseUrl = serverUrl || process.env.NEXT_PUBLIC_SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com';
  return `${baseUrl}/replay/${replayId}.json`;
}

/**
 * Get replay embed script URL
 */
export function getReplayEmbedScriptUrl(clientUrl?: string): string {
  const baseUrl = clientUrl || process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL || 'https://aab-play.moodmnky.com';
  return `${baseUrl}/js/replay-embed.js`;
}
