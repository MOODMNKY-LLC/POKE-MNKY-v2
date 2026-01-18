/**
 * MCP REST Client Usage Examples
 * 
 * This file contains practical examples of using the MCP REST client.
 * These examples can be copied and adapted for your use cases.
 */

import { mcpClient, createMCPClient, MCPApiError } from "./mcp-rest-client"

/**
 * Example 1: Fetch available Pokémon for draft board UI
 */
export async function fetchDraftPoolPokemon(limit = 50) {
  try {
    const result = await mcpClient.getAvailablePokemon({ limit })
    return {
      pokemon: result.data.pokemon,
      count: result.data.count,
      rateLimit: result.rateLimit,
    }
  } catch (error) {
    if (error instanceof MCPApiError) {
      console.error(`Failed to fetch Pokémon: ${error.status} ${error.statusText}`)
      throw error
    }
    throw error
  }
}

/**
 * Example 2: Get team's draft picks for roster display
 */
export async function fetchTeamRoster(teamId: number, seasonId?: number) {
  try {
    const picks = await mcpClient.getTeamPicks({ team_id: teamId, season_id: seasonId })
    return picks.data.picks
  } catch (error) {
    if (error instanceof MCPApiError && error.status === 404) {
      return [] // Team has no picks yet
    }
    throw error
  }
}

/**
 * Example 3: Check team budget before making a pick
 */
export async function checkTeamBudget(teamId: number, pointValue: number) {
  try {
    const budget = await mcpClient.getTeamBudget({ team_id: teamId })
    
    if (budget.data.remaining_points < pointValue) {
      return {
        canAfford: false,
        reason: `Insufficient points. Need ${pointValue}, have ${budget.data.remaining_points}`,
      }
    }
    
    return {
      canAfford: true,
      remaining: budget.data.remaining_points - pointValue,
    }
  } catch (error) {
    if (error instanceof MCPApiError) {
      throw new Error(`Failed to check budget: ${error.message}`)
    }
    throw error
  }
}

/**
 * Example 4: Get Pokémon competitive information
 */
export async function getPokemonCompetitiveInfo(pokemonName: string) {
  try {
    const [types, meta] = await Promise.all([
      mcpClient.getPokemonTypes({ pokemon_name: pokemonName }),
      mcpClient.getSmogonMeta({ pokemon_name: pokemonName }),
    ])
    
    return {
      types: {
        primary: types.data.type_primary,
        secondary: types.data.type_secondary,
      },
      meta: {
        usage: meta.data.usage,
        rank: meta.data.rank,
        format: meta.data.format,
      },
    }
  } catch (error) {
    console.error(`Failed to get competitive info for ${pokemonName}:`, error)
    throw error
  }
}

/**
 * Example 5: Analyze multiple picks for draft strategy
 */
export async function analyzeDraftStrategy(pokemonNames: string[], teamId?: number) {
  try {
    const analyses = await Promise.all(
      pokemonNames.map(async (name) => {
        // Get point value first
        const pool = await mcpClient.getAvailablePokemon({ 
          limit: 1,
          // Add filter by name if API supports it
        })
        
        const pokemon = pool.data.pokemon.find(p => p.pokemon_name === name)
        if (!pokemon) {
          return { pokemon_name: name, error: "Not found in draft pool" }
        }
        
        const analysis = await mcpClient.analyzePickValue({
          pokemon_name: name,
          point_value: pokemon.point_value,
          team_id: teamId,
        })
        
        return {
          pokemon_name: name,
          point_value: pokemon.point_value,
          value_score: analysis.data.value_score,
          recommendation: analysis.data.recommendation,
        }
      })
    )
    
    return analyses
  } catch (error) {
    console.error("Failed to analyze draft strategy:", error)
    throw error
  }
}

/**
 * Example 6: Monitor rate limits across multiple requests
 */
export async function fetchWithRateLimitMonitoring<T>(
  requests: Array<() => Promise<{ rateLimit?: any; data: T }>>
): Promise<T[]> {
  const results: T[] = []
  
  for (const requestFn of requests) {
    const result = await requestFn()
    results.push(result.data)
    
    // Check rate limit
    if (result.rateLimit && result.rateLimit.remaining < 10) {
      console.warn(`Rate limit low: ${result.rateLimit.remaining} remaining`)
      
      if (result.rateLimit.retryAfter) {
        console.log(`Waiting ${result.rateLimit.retryAfter} seconds before next request`)
        await new Promise(resolve => 
          setTimeout(resolve, result.rateLimit.retryAfter! * 1000)
        )
      }
    }
  }
  
  return results
}

/**
 * Example 7: Custom client with retry configuration
 */
export function createResilientClient() {
  return createMCPClient({
    enableRetry: true,
    maxRetries: 5,
    retryDelay: 2000,
  })
}

/**
 * Example 8: Error handling wrapper
 */
export async function safeMcpCall<T>(
  call: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await call()
  } catch (error) {
    if (error instanceof MCPApiError) {
      // Log error but don't crash
      console.error(`MCP API Error (${error.status}):`, error.message)
      
      // Return fallback if provided
      if (fallback !== undefined) {
        return fallback
      }
    }
    
    // Re-throw if no fallback
    throw error
  }
}
