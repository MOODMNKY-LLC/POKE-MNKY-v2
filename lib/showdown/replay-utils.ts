/**
 * Utility functions for working with Pokémon Showdown replays
 */

import {
  getShowdownClientUrl,
  getShowdownReplayBaseUrl,
  PUBLIC_SHOWDOWN_REPLAY_URL,
} from "@/lib/showdown/public-hosts"

/**
 * Extract replay ID from a Showdown room URL
 * Handles various URL formats:
 * - https://play.pokemonshowdown.com/battle-gen9randombattle-35
 * - https://replay.pokemonshowdown.com/gen9randombattle-35
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
  } catch {
    // If URL parsing fails, try to extract ID directly
    const match = roomUrl.match(/(?:battle-)?([a-z0-9]+-[0-9]+)$/i);
    return match ? match[1].replace(/^battle-/, '') : null;
  }
}

/**
 * Get replay log URL from replay ID (public replay host by default).
 */
export function getReplayLogUrl(replayId: string, serverUrl?: string): string {
  const baseUrl = serverUrl || getShowdownReplayBaseUrl()
  return `${baseUrl}/${replayId}.log`
}

/**
 * Get replay JSON URL from replay ID (public replay host by default).
 */
export function getReplayJsonUrl(replayId: string, serverUrl?: string): string {
  const baseUrl = serverUrl || getShowdownReplayBaseUrl()
  return `${baseUrl}/${replayId}.json`
}

/**
 * Get replay embed script URL from the public client.
 */
export function getReplayEmbedScriptUrl(clientUrl?: string): string {
  const baseUrl = clientUrl || getShowdownClientUrl()
  return `${baseUrl}/js/replay-embed.js`
}

/** @deprecated Prefer getShowdownReplayBaseUrl — kept for older call sites. */
export const DEFAULT_REPLAY_HOST = PUBLIC_SHOWDOWN_REPLAY_URL
