/**
 * Populate Master Tables from Synced PokéAPI Data
 * 
 * Extracts data from pokeapi_resources JSONB and populates normalized tables
 * Uses validated, already-synced data - no external API calls needed
 * 
 * Usage:
 *   pnpm tsx scripts/populate-master-tables.ts
 *   or
 *   tsx --env-file=.env.local scripts/populate-master-tables.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function populateMasterTables() {
  console.log('='.repeat(70))
  console.log('Populating Master Tables from Synced PokéAPI Data')
  console.log('='.repeat(70))
  console.log('')

  try {
    console.log('🔄 Populating master tables...')
    console.log('')

    // Call via SQL query (PostgREST doesn't expose JSONB-returning functions well)
    console.log('📋 Calling populate_all_master_tables_from_pokeapi()...')
    
    // Use a workaround: execute via SQL
    const { data: result, error } = await supabase
      .rpc('populate_all_master_tables_from_pokeapi')
      .select('*')
      .single()

    if (error) {
      // Try direct SQL execution via REST API with a different approach
      const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/populate_all_master_tables_from_pokeapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({}),
      })

      if (!sqlResponse.ok) {
        // Last resort: call individual functions
        console.log('⚠️  Master function not accessible via RPC, calling individual functions...')
        return await populateIndividualFunctions()
      }

      const sqlData = await sqlResponse.json()
      return processResults(Array.isArray(sqlData) ? sqlData[0] : sqlData)
    }

    if (!result) {
      throw new Error('No data returned from function')
    }

    return processResults(result)
  } catch (error: any) {
    console.error('❌ Error populating master tables:', error.message)
    if (error.details) {
      console.error('   Details:', error.details)
    }
    if (error.hint) {
      console.error('   Hint:', error.hint)
    }
    process.exit(1)
  }
}

async function populateIndividualFunctions() {
  console.log('📋 Populating types...')
  const { data: typesData } = await supabase.rpc('populate_types_from_pokeapi')
  const typesResult = typesData?.[0] || { inserted: 0, updated: 0, errors: 0 }

  console.log('💪 Populating abilities...')
  const { data: abilitiesData } = await supabase.rpc('populate_abilities_from_pokeapi')
  const abilitiesResult = abilitiesData?.[0] || { inserted: 0, updated: 0, errors: 0 }

  console.log('⚔️  Populating moves...')
  const { data: movesData } = await supabase.rpc('populate_moves_from_pokeapi')
  const movesResult = movesData?.[0] || { inserted: 0, updated: 0, errors: 0 }

  console.log('🔗 Populating Pokemon types...')
  const { data: pokemonTypesData } = await supabase.rpc('populate_pokemon_types_from_pokeapi')
  const pokemonTypesResult = pokemonTypesData?.[0] || { inserted: 0, errors: 0 }

  console.log('🔗 Populating Pokemon abilities...')
  const { data: pokemonAbilitiesData } = await supabase.rpc('populate_pokemon_abilities_from_pokeapi')
  const pokemonAbilitiesResult = pokemonAbilitiesData?.[0] || { inserted: 0, errors: 0 }

  console.log('🔗 Populating Pokemon moves...')
  const { data: pokemonMovesData } = await supabase.rpc('populate_pokemon_moves_from_pokeapi')
  const pokemonMovesResult = pokemonMovesData?.[0] || { inserted: 0, errors: 0 }

  return processResults({
    types: typesResult,
    abilities: abilitiesResult,
    moves: movesResult,
    pokemon_types: pokemonTypesResult,
    pokemon_abilities: pokemonAbilitiesResult,
    pokemon_moves: pokemonMovesResult,
  })
}

function processResults(data: any) {

  console.log('✅ Master tables populated successfully!')
  console.log('')
  console.log('📊 Results:')
  console.log('')

    // Types
    const types = data.types as { inserted: number; updated: number; errors: number }
    console.log('📋 Types:')
    console.log(`   Inserted: ${types.inserted}`)
    console.log(`   Updated:  ${types.updated}`)
    console.log(`   Errors:   ${types.errors}`)
    console.log('')

    // Abilities
    const abilities = data.abilities as { inserted: number; updated: number; errors: number }
    console.log('💪 Abilities:')
    console.log(`   Inserted: ${abilities.inserted}`)
    console.log(`   Updated:  ${abilities.updated}`)
    console.log(`   Errors:   ${abilities.errors}`)
    console.log('')

    // Moves
    const moves = data.moves as { inserted: number; updated: number; errors: number }
    console.log('⚔️  Moves:')
    console.log(`   Inserted: ${moves.inserted}`)
    console.log(`   Updated:  ${moves.updated}`)
    console.log(`   Errors:   ${moves.errors}`)
    console.log('')

    // Pokemon Types
    const pokemonTypes = data.pokemon_types as { inserted: number; errors: number }
    console.log('🔗 Pokemon Types (Junction):')
    console.log(`   Inserted: ${pokemonTypes.inserted}`)
    console.log(`   Errors:   ${pokemonTypes.errors}`)
    console.log('')

    // Pokemon Abilities
    const pokemonAbilities = data.pokemon_abilities as { inserted: number; errors: number }
    console.log('🔗 Pokemon Abilities (Junction):')
    console.log(`   Inserted: ${pokemonAbilities.inserted}`)
    console.log(`   Errors:   ${pokemonAbilities.errors}`)
    console.log('')

    // Pokemon Moves
    const pokemonMoves = data.pokemon_moves as { inserted: number; errors: number }
    console.log('🔗 Pokemon Moves (Junction):')
    console.log(`   Inserted: ${pokemonMoves.inserted}`)
    console.log(`   Errors:   ${pokemonMoves.errors}`)
    console.log('')

    // Summary
    const totalInserted =
      types.inserted +
      abilities.inserted +
      moves.inserted +
      pokemonTypes.inserted +
      pokemonAbilities.inserted +
      pokemonMoves.inserted

    const totalErrors =
      types.errors +
      abilities.errors +
      moves.errors +
      pokemonTypes.errors +
      pokemonAbilities.errors +
      pokemonMoves.errors

    console.log('='.repeat(70))
    console.log('📈 Summary:')
    console.log(`   Total Inserted: ${totalInserted}`)
    console.log(`   Total Errors:   ${totalErrors}`)
    console.log('='.repeat(70))
    console.log('')

    if (totalErrors > 0) {
      console.warn('⚠️  Some errors occurred. Check the database logs for details.')
      console.log('')
    }

    console.log('✅ Done!')
}

// Run the script
populateMasterTables()
