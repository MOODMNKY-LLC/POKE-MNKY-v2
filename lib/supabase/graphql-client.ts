/**
 * Supabase GraphQL Client (Client-Side)
 * Uses ANON KEY for client-side queries
 * 
 * ⚠️ SECURITY: This is for CLIENT-SIDE use only (browser)
 * For server-side operations, use graphql-server-client.ts instead
 * 
 * GraphQL endpoint: {supabaseUrl}/graphql/v1
 * 
 * Benefits over REST:
 * - Fetch only needed fields
 * - Single query for Pokemon + relationships
 * - Better performance for complex queries
 * - Type-safe queries
 * - Respects RLS policies (uses anon key)
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// GraphQL endpoint
const GRAPHQL_ENDPOINT = `${supabaseUrl}/graphql/v1`

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string; extensions?: any }>
}

/**
 * Check if GraphQL is available
 */
let graphqlAvailable: boolean | null = null

async function checkGraphQLAvailability(): Promise<boolean> {
  if (graphqlAvailable !== null) return graphqlAvailable

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        query: "{ __typename }",
      }),
    })

    graphqlAvailable = response.ok
    return graphqlAvailable
  } catch {
    graphqlAvailable = false
    return false
  }
}

/**
 * Execute GraphQL query
 */
async function graphqlQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  // Check availability first
  const available = await checkGraphQLAvailability()
  if (!available) {
    throw new Error("GraphQL endpoint not available - use REST fallback")
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GraphQL request failed: ${response.status} ${text}`)
  }

  const result: GraphQLResponse<T> = await response.json()

  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`)
  }

  if (!result.data) {
    throw new Error("GraphQL response missing data")
  }

  return result.data
}

/**
 * Get Pokemon by ID with relationships (GraphQL)
 */
export async function getPokemonByIdGraphQL(pokemonId: number) {
  const query = `
    query GetPokemon($id: Int!) {
      pokemon_comprehensive(where: { pokemon_id: { _eq: $id } }) {
        pokemon_id
        name
        base_experience
        height
        weight
        sprites
        species_id
        updated_at
        pokemon_types {
          types {
            name
            type_id
          }
          slot
        }
        pokemon_abilities {
          abilities {
            name
            ability_id
          }
          is_hidden
          slot
        }
        pokemon_stats_comprehensive {
          stats {
            name
            stat_id
          }
          base_stat
          effort
        }
      }
    }
  `

  const data = await graphqlQuery<{
    pokemon_comprehensive: Array<{
      pokemon_id: number
      name: string
      base_experience: number | null
      height: number | null
      weight: number | null
      sprites: any
      species_id: number | null
      updated_at: string
      pokemon_types: Array<{
        types: { name: string; type_id: number } | null
        slot: number
      }>
      pokemon_abilities: Array<{
        abilities: { name: string; ability_id: number } | null
        is_hidden: boolean
        slot: number
      }>
      pokemon_stats_comprehensive: Array<{
        stats: { name: string; stat_id: number } | null
        base_stat: number
        effort: number
      }>
    }>
  }>(query, { id: pokemonId })

  return data.pokemon_comprehensive[0] || null
}

/**
 * Get multiple Pokemon by ID range (GraphQL)
 */
export async function getPokemonRangeGraphQL(startId: number, endId: number) {
  const query = `
    query GetPokemonRange($startId: Int!, $endId: Int!) {
      pokemon_comprehensive(
        where: { 
          pokemon_id: { _gte: $startId, _lte: $endId } 
        }
        order_by: { pokemon_id: asc }
      ) {
        pokemon_id
        name
        base_experience
        height
        weight
        sprites
        species_id
        updated_at
        pokemon_types {
          types {
            name
            type_id
          }
          slot
        }
        pokemon_abilities {
          abilities {
            name
            ability_id
          }
          is_hidden
          slot
        }
        pokemon_stats_comprehensive {
          stats {
            name
            stat_id
          }
          base_stat
          effort
        }
      }
    }
  `

  const data = await graphqlQuery<{
    pokemon_comprehensive: Array<{
      pokemon_id: number
      name: string
      base_experience: number | null
      height: number | null
      weight: number | null
      sprites: any
      species_id: number | null
      updated_at: string
      pokemon_types: Array<{
        types: { name: string; type_id: number } | null
        slot: number
      }>
      pokemon_abilities: Array<{
        abilities: { name: string; ability_id: number } | null
        is_hidden: boolean
        slot: number
      }>
      pokemon_stats_comprehensive: Array<{
        stats: { name: string; stat_id: number } | null
        base_stat: number
        effort: number
      }>
    }>
  }>(query, { startId, endId })

  return data.pokemon_comprehensive
}

/**
 * Search Pokemon by name (GraphQL)
 */
export async function searchPokemonGraphQL(searchTerm: string, limit: number = 50) {
  const query = `
    query SearchPokemon($searchTerm: String!, $limit: Int!) {
      pokemon_comprehensive(
        where: { name: { _ilike: $searchTerm } }
        limit: $limit
        order_by: { pokemon_id: asc }
      ) {
        pokemon_id
        name
        base_experience
        height
        weight
        sprites
        species_id
        updated_at
      }
    }
  `

  const data = await graphqlQuery<{
    pokemon_comprehensive: Array<{
      pokemon_id: number
      name: string
      base_experience: number | null
      height: number | null
      weight: number | null
      sprites: any
      species_id: number | null
      updated_at: string
    }>
  }>(query, { searchTerm: `%${searchTerm}%`, limit })

  return data.pokemon_comprehensive
}

/**
 * Get master data (types, abilities, moves) via REST
 * 
 * Note: GraphQL schema doesn't expose these tables, so we use REST instead
 */
export async function getMasterDataGraphQL() {
  // Use REST API since GraphQL doesn't expose types, abilities, moves tables
  const { createClient } = await import("@supabase/supabase-js")
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Fetch master data using REST API
  const [typesResult, abilitiesResult, movesResult] = await Promise.all([
    supabase
      .from("types")
      .select("type_id, name, damage_relations")
      .order("type_id", { ascending: true }),
    supabase
      .from("abilities")
      .select("ability_id, name")
      .order("ability_id", { ascending: true })
      .limit(100),
    supabase
      .from("moves")
      .select("move_id, name, power, accuracy")
      .order("move_id", { ascending: true })
      .limit(100),
  ])

  if (typesResult.error) {
    throw new Error(`Failed to fetch types: ${typesResult.error.message}`)
  }
  if (abilitiesResult.error) {
    throw new Error(`Failed to fetch abilities: ${abilitiesResult.error.message}`)
  }
  if (movesResult.error) {
    throw new Error(`Failed to fetch moves: ${movesResult.error.message}`)
  }

  return {
    types: typesResult.data || [],
    abilities: abilitiesResult.data || [],
    moves: movesResult.data || [],
  }
}
