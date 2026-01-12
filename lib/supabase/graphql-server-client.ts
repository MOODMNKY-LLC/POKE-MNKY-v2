/**
 * Supabase GraphQL Server Client
 * Uses SERVICE ROLE KEY for server-side operations
 * 
 * ⚠️ SECURITY: This should ONLY be used in:
 * - API Routes (app/api/**)
 * - Server Components
 * - Edge Functions
 * - Server Actions
 * 
 * NEVER expose this in client-side code!
 * 
 * Benefits of service role key:
 * - Bypasses RLS (Row Level Security) policies
 * - More powerful queries
 * - Better for bulk operations
 * - No RLS permission issues
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side GraphQL client")
}

// GraphQL endpoint
const GRAPHQL_ENDPOINT = `${supabaseUrl}/graphql/v1`

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string; extensions?: any }>
}

/**
 * Check if GraphQL is available (server-side)
 */
let graphqlAvailable: boolean | null = null

async function checkGraphQLAvailability(): Promise<boolean> {
  if (graphqlAvailable !== null) return graphqlAvailable

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
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
 * Execute GraphQL query (server-side with service role key)
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
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
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
 * Get Pokemon by ID with relationships (GraphQL - Server-side)
 * Uses service role key - bypasses RLS
 */
export async function getPokemonByIdGraphQLServer(pokemonId: number) {
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
 * Get multiple Pokemon by ID range (GraphQL - Server-side)
 * Uses service role key - bypasses RLS
 */
export async function getPokemonRangeGraphQLServer(startId: number, endId: number) {
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
 * Get master data (types, abilities, moves) via REST (Server-side)
 * Uses service role key - bypasses RLS
 * 
 * Note: GraphQL schema doesn't expose these tables, so we use REST instead
 */
export async function getMasterDataGraphQLServer() {
  // Use REST API since GraphQL doesn't expose types, abilities, moves tables
  const { createClient } = await import("@supabase/supabase-js")
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

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
