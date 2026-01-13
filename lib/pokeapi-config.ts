/**
 * PokeAPI Configuration
 * Centralized configuration for PokeAPI base URL
 * Supports both local and production instances
 */

/**
 * Get PokeAPI base URL for Node.js scripts and client-side code
 */
export function getPokeApiBaseUrl(): string {
  // Check environment variables (Node.js/Browser)
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.POKEAPI_BASE_URL ??
      process.env.NEXT_PUBLIC_POKEAPI_BASE_URL ??
      "https://pokeapi.co/api/v2"
    )
  }

  // Default to production
  return "https://pokeapi.co/api/v2"
}

/**
 * Get PokeAPI base URL for Deno Edge Functions
 */
export function getPokeApiBaseUrlDeno(): string {
  if (typeof Deno !== "undefined") {
    return Deno.env.get("POKEAPI_BASE_URL") ?? "https://pokeapi.co/api/v2"
  }
  return "https://pokeapi.co/api/v2"
}

/**
 * Check if using local PokeAPI instance
 */
export function isLocalPokeApi(): boolean {
  const url = getPokeApiBaseUrl()
  return url.includes("localhost") || url.includes("127.0.0.1")
}

/**
 * Default export for convenience
 */
export const POKEAPI_BASE_URL = getPokeApiBaseUrl()
