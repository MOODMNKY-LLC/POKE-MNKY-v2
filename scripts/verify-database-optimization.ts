/**
 * Verify Database Optimization - Test Views and Functions
 * 
 * Runs manual queries to verify views and functions work correctly
 * 
 * Usage:
 *   pnpm tsx scripts/verify-database-optimization.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function verifyViews() {
  console.log('='.repeat(70))
  console.log('Verifying Database Views and Functions')
  console.log('='.repeat(70))
  console.log('')

  // Test 1: Check pokemon_unified view
  console.log('📊 Test 1: pokemon_unified view')
  console.log('─'.repeat(70))
  try {
    const { count, error: countError } = await supabase
      .from('pokemon_unified')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error counting pokemon_unified:', countError.message)
    } else {
      console.log(`✅ pokemon_unified view accessible: ${count || 0} records`)
    }

    // Test with specific Pokemon (Pikachu = 25)
    const { data: pikachu, error: pikachuError } = await supabase
      .from('pokemon_unified')
      .select('pokemon_id, name, sprite_official_artwork_path, types, abilities, hp, atk, def, spa, spd, spe, showdown_tier, generation')
      .eq('pokemon_id', 25)
      .single()

    if (pikachuError) {
      console.error('❌ Error fetching Pikachu:', pikachuError.message)
    } else if (pikachu) {
      console.log('✅ Pikachu data retrieved:')
      console.log(`   Name: ${pikachu.name}`)
      console.log(`   Types: ${JSON.stringify(pikachu.types)}`)
      console.log(`   Abilities: ${JSON.stringify(pikachu.abilities)}`)
      console.log(`   Stats: HP ${pikachu.hp} / Atk ${pikachu.atk} / Def ${pikachu.def} / SpA ${pikachu.spa} / SpD ${pikachu.spd} / Spe ${pikachu.spe}`)
      console.log(`   Showdown Tier: ${pikachu.showdown_tier || 'N/A'}`)
      console.log(`   Generation: ${pikachu.generation || 'N/A'}`)
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  console.log('')

  // Test 2: Check pokemon_with_all_data view
  console.log('📊 Test 2: pokemon_with_all_data view')
  console.log('─'.repeat(70))
  try {
    const { count, error: countError } = await supabase
      .from('pokemon_with_all_data')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error counting pokemon_with_all_data:', countError.message)
    } else {
      console.log(`✅ pokemon_with_all_data view accessible: ${count || 0} records`)
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  console.log('')

  // Test 3: Check draft_pool_comprehensive view
  console.log('📊 Test 3: draft_pool_comprehensive view')
  console.log('─'.repeat(70))
  try {
    const { count, error: countError } = await supabase
      .from('draft_pool_comprehensive')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error counting draft_pool_comprehensive:', countError.message)
    } else {
      console.log(`✅ draft_pool_comprehensive view accessible: ${count || 0} records`)
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  console.log('')

  // Test 4: Test get_pokemon_by_id function
  console.log('📊 Test 4: get_pokemon_by_id() function')
  console.log('─'.repeat(70))
  try {
    const { data, error } = await supabase
      .rpc('get_pokemon_by_id', { pokemon_id_param: 25 })

    if (error) {
      console.error('❌ Error calling get_pokemon_by_id:', error.message)
    } else if (data && data.length > 0) {
      const pokemon = data[0]
      console.log('✅ get_pokemon_by_id(25) returned:')
      console.log(`   Name: ${pokemon.name}`)
      console.log(`   Types: ${JSON.stringify(pokemon.types)}`)
      console.log(`   Stats: HP ${pokemon.hp} / Atk ${pokemon.atk} / Def ${pokemon.def}`)
    } else {
      console.log('⚠️  get_pokemon_by_id returned no data')
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  console.log('')

  // Test 5: Test get_pokemon_by_name function
  console.log('📊 Test 5: get_pokemon_by_name() function')
  console.log('─'.repeat(70))
  try {
    const { data, error } = await supabase
      .rpc('get_pokemon_by_name', { pokemon_name_param: 'Pikachu' })

    if (error) {
      console.error('❌ Error calling get_pokemon_by_name:', error.message)
    } else if (data && data.length > 0) {
      const pokemon = data[0]
      console.log('✅ get_pokemon_by_name("Pikachu") returned:')
      console.log(`   Pokemon ID: ${pokemon.pokemon_id}`)
      console.log(`   Name: ${pokemon.name}`)
      console.log(`   Types: ${JSON.stringify(pokemon.types)}`)
    } else {
      console.log('⚠️  get_pokemon_by_name returned no data')
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  console.log('')

  // Test 6: Test search_pokemon function
  console.log('📊 Test 6: search_pokemon() function')
  console.log('─'.repeat(70))
  try {
    const { data, error } = await supabase
      .rpc('search_pokemon', {
        search_query: 'pika',
        type_filter: 'electric',
        tier_filter: null,
        generation_filter: null,
        limit_count: 5
      })

    if (error) {
      console.error('❌ Error calling search_pokemon:', error.message)
    } else if (data && data.length > 0) {
      console.log(`✅ search_pokemon("pika", "electric") returned ${data.length} results:`)
      data.forEach((p: any, i: number) => {
        console.log(`   ${i + 1}. ${p.name} (ID: ${p.pokemon_id}, Types: ${JSON.stringify(p.types)})`)
      })
    } else {
      console.log('⚠️  search_pokemon returned no data')
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  console.log('')

  // Test 7: Check source tables have data
  console.log('📊 Test 7: Source tables data check')
  console.log('─'.repeat(70))
  try {
    const [pokepediaCount, showdownCount] = await Promise.all([
      supabase.from('pokepedia_pokemon').select('*', { count: 'exact', head: true }),
      supabase.from('pokemon_showdown').select('*', { count: 'exact', head: true }),
    ])

    console.log(`✅ pokepedia_pokemon: ${pokepediaCount.count || 0} records`)
    console.log(`✅ pokemon_showdown: ${showdownCount.count || 0} records`)

    // Check if they can be joined
    const { data: joinedData, error: joinedError } = await supabase
      .from('pokepedia_pokemon')
      .select('id, name')
      .eq('id', 25)
      .single()

    if (joinedData) {
      const { data: showdownData } = await supabase
        .from('pokemon_showdown')
        .select('showdown_id, name, dex_num')
        .eq('dex_num', 25)
        .single()

      if (showdownData) {
        console.log(`✅ Matching found: ${joinedData.name} (PokéAPI) ↔ ${showdownData.name} (Showdown)`)
      } else {
        console.log(`⚠️  No Showdown match for ${joinedData.name} (ID: 25)`)
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  console.log('')

  // Test 8: Check master tables
  console.log('📊 Test 8: Master tables check')
  console.log('─'.repeat(70))
  try {
    const [typesCount, abilitiesCount, movesCount] = await Promise.all([
      supabase.from('types').select('*', { count: 'exact', head: true }),
      supabase.from('abilities').select('*', { count: 'exact', head: true }),
      supabase.from('moves').select('*', { count: 'exact', head: true }),
    ])

    console.log(`📋 types: ${typesCount.count || 0} records`)
    console.log(`💪 abilities: ${abilitiesCount.count || 0} records`)
    console.log(`⚔️  moves: ${movesCount.count || 0} records`)

    if ((typesCount.count || 0) === 0) {
      console.log('⚠️  Types table is empty - run populate:master-tables after syncing')
    }
    if ((abilitiesCount.count || 0) === 0) {
      console.log('⚠️  Abilities table is empty - run populate:master-tables after syncing')
    }
    if ((movesCount.count || 0) === 0) {
      console.log('⚠️  Moves table is empty - run populate:master-tables after syncing')
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  console.log('')

  console.log('='.repeat(70))
  console.log('✅ Verification Complete!')
  console.log('='.repeat(70))
}

// Run verification
verifyViews().catch(console.error)
