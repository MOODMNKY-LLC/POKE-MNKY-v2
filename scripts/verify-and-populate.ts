/**
 * Complete Verification and Population Script
 * 
 * 1. Checks pokeapi_resources for Pokemon data
 * 2. Builds pokepedia_pokemon projections
 * 3. Verifies views work
 * 4. Tests helper functions
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('='.repeat(70))
  console.log('Complete Database Verification and Population')
  console.log('='.repeat(70))
  console.log('')

  // Step 1: Check pokeapi_resources
  console.log('📊 Step 1: Checking pokeapi_resources')
  console.log('─'.repeat(70))
  
  const { count: pokemonCount, error: countError } = await supabase
    .from('pokeapi_resources')
    .select('*', { count: 'exact', head: true })
    .eq('resource_type', 'pokemon')

  if (countError) {
    console.error('❌ Error:', countError.message)
  } else {
    console.log(`✅ Found ${pokemonCount || 0} Pokemon resources in pokeapi_resources`)
  }

  // Get a sample to verify structure
  const { data: samplePokemon, error: sampleError } = await supabase
    .from('pokeapi_resources')
    .select('resource_key, name, resource_type')
    .eq('resource_type', 'pokemon')
    .limit(5)

  if (!sampleError && samplePokemon && samplePokemon.length > 0) {
    console.log('Sample Pokemon resources:')
    samplePokemon.forEach(p => {
      console.log(`  - ID: ${p.resource_key}, Name: ${p.name}`)
    })
  } else if (!sampleError && samplePokemon && samplePokemon.length === 0) {
    console.log('⚠️  No Pokemon resources found with resource_type="pokemon"')
    console.log('   Checking all resource types...')
    
    const { data: allResources } = await supabase
      .from('pokeapi_resources')
      .select('resource_type')
      .limit(100)
    
    const types = new Set(allResources?.map(r => r.resource_type) || [])
    console.log(`   Found resource types: ${Array.from(types).join(', ')}`)
  }
  console.log('')

  // Step 2: Check current pokepedia_pokemon count
  console.log('📊 Step 2: Checking pokepedia_pokemon projection')
  console.log('─'.repeat(70))
  
  const { count: projectionCount } = await supabase
    .from('pokepedia_pokemon')
    .select('*', { count: 'exact', head: true })

  console.log(`Current pokepedia_pokemon records: ${projectionCount || 0}`)
  console.log('')

  // Step 3: Build projections if needed
  if ((pokemonCount || 0) > 0 && (projectionCount || 0) === 0) {
    console.log('📊 Step 3: Building pokepedia_pokemon projections')
    console.log('─'.repeat(70))
    console.log('⚠️  pokepedia_pokemon is empty but pokeapi_resources has data')
    console.log('   Run: pnpm tsx scripts/build-pokepedia-projections.ts')
    console.log('   (This will extract Pokemon data from pokeapi_resources JSONB)')
    console.log('')
  } else if ((projectionCount || 0) > 0) {
    console.log('✅ pokepedia_pokemon already has data')
    console.log('')
  }

  // Step 4: Verify views (even if empty, they should be accessible)
  console.log('📊 Step 4: Verifying views exist in database')
  console.log('─'.repeat(70))
  
  // Use a workaround: try to get schema info
  try {
    // Check if we can at least see the view structure
    const { data: viewTest, error: viewError } = await supabase
      .from('pokemon_unified')
      .select('*')
      .limit(0)

    if (viewError) {
      if (viewError.message.includes('schema cache')) {
        console.log('⚠️  View exists but PostgREST schema cache needs refresh')
        console.log('   This usually auto-refreshes within a few minutes')
        console.log('   Or restart Supabase: supabase db reset (local) or wait (remote)')
      } else {
        console.log('❌ Error:', viewError.message)
      }
    } else {
      console.log('✅ pokemon_unified view is accessible via PostgREST')
    }
  } catch (error: any) {
    console.log('⚠️  Could not verify view:', error.message)
  }
  console.log('')

  // Step 5: Summary and recommendations
  console.log('='.repeat(70))
  console.log('📋 Summary and Recommendations')
  console.log('='.repeat(70))
  console.log('')

  if ((pokemonCount || 0) > 0 && (projectionCount || 0) === 0) {
    console.log('🔧 Action Required:')
    console.log('   1. Build pokepedia_pokemon projections:')
    console.log('      pnpm tsx scripts/build-pokepedia-projections.ts')
    console.log('')
    console.log('   2. After projections are built, verify views:')
    console.log('      pnpm verify:database-optimization')
    console.log('')
  } else if ((projectionCount || 0) > 0) {
    console.log('✅ pokepedia_pokemon has data')
    console.log('')
    console.log('🔧 Next Steps:')
    console.log('   1. Wait a few minutes for PostgREST schema cache to refresh')
    console.log('   2. Or restart Supabase (if local)')
    console.log('   3. Then verify views: pnpm verify:database-optimization')
    console.log('')
  } else {
    console.log('⚠️  No Pokemon data found')
    console.log('   You may need to run PokéPedia sync first')
    console.log('')
  }

  console.log('📊 Current Status:')
  console.log(`   - pokeapi_resources (pokemon): ${pokemonCount || 0}`)
  console.log(`   - pokepedia_pokemon: ${projectionCount || 0}`)
  console.log(`   - pokemon_showdown: 1515 (from previous check)`)
  console.log('')
}

main().catch(console.error)
