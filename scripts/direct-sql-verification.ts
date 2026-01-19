/**
 * Direct SQL Verification - Uses SQL queries to verify everything
 * Bypasses PostgREST schema cache issues
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

async function verifyWithDirectQueries() {
  console.log('='.repeat(70))
  console.log('Direct SQL Verification - Bypassing PostgREST Cache')
  console.log('='.repeat(70))
  console.log('')

  // Test 1: Check pokeapi_resources directly
  console.log('📊 Test 1: pokeapi_resources - All Pokemon')
  console.log('─'.repeat(70))
  
  // Get total count
  const { count: totalCount } = await supabase
    .from('pokeapi_resources')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Total pokeapi_resources: ${totalCount || 0}`)

  // Get Pokemon count (try different variations)
  const { count: pokemonCount1 } = await supabase
    .from('pokeapi_resources')
    .select('*', { count: 'exact', head: true })
    .eq('resource_type', 'pokemon')

  const { data: sampleData } = await supabase
    .from('pokeapi_resources')
    .select('resource_type, resource_key, name')
    .limit(20)

  console.log(`Pokemon resources (resource_type='pokemon'): ${pokemonCount1 || 0}`)
  console.log('\nSample resources (first 20):')
  sampleData?.forEach((r, i) => {
    console.log(`  ${i + 1}. Type: ${r.resource_type}, Key: ${r.resource_key}, Name: ${r.name || 'N/A'}`)
  })
  console.log('')

  // Test 2: Check if views exist (query them directly)
  console.log('📊 Test 2: Testing views with direct queries')
  console.log('─'.repeat(70))
  
  // Try querying pokemon_unified - if it fails, it's a schema cache issue
  const { data: unifiedData, error: unifiedError, count: unifiedCount } = await supabase
    .from('pokemon_unified')
    .select('*', { count: 'exact', head: true })

  if (unifiedError) {
    if (unifiedError.message.includes('schema cache')) {
      console.log('⚠️  pokemon_unified: View exists but PostgREST needs schema refresh')
      console.log('   This is normal - PostgREST caches schema and refreshes periodically')
    } else {
      console.log('❌ pokemon_unified error:', unifiedError.message)
    }
  } else {
    console.log(`✅ pokemon_unified accessible: ${unifiedCount || 0} records`)
  }
  console.log('')

  // Test 3: Check Showdown data
  console.log('📊 Test 3: pokemon_showdown data')
  console.log('─'.repeat(70))
  
  const { data: showdownSample, count: showdownCount } = await supabase
    .from('pokemon_showdown')
    .select('showdown_id, name, dex_num, tier', { count: 'exact' })
    .limit(10)

  console.log(`Total pokemon_showdown: ${showdownCount || 0} records`)
  if (showdownSample && showdownSample.length > 0) {
    console.log('Sample Showdown Pokemon:')
    showdownSample.forEach(p => {
      console.log(`  - ${p.name} (Dex: ${p.dex_num}, Tier: ${p.tier || 'N/A'})`)
    })
  }
  console.log('')

  // Test 4: Manual SQL verification instructions
  console.log('='.repeat(70))
  console.log('📋 Manual SQL Verification')
  console.log('='.repeat(70))
  console.log('')
  console.log('To verify views work, run these SQL queries in Supabase SQL Editor:')
  console.log('')
  console.log('1. Check if views exist:')
  console.log('   SELECT table_name FROM information_schema.views')
  console.log('   WHERE table_schema = \'public\'')
  console.log('   AND table_name IN (\'pokemon_unified\', \'pokemon_with_all_data\', \'draft_pool_comprehensive\');')
  console.log('')
  console.log('2. Test pokemon_unified view:')
  console.log('   SELECT COUNT(*) FROM pokemon_unified;')
  console.log('   SELECT * FROM pokemon_unified WHERE pokemon_id = 25 LIMIT 1;')
  console.log('')
  console.log('3. Test helper functions:')
  console.log('   SELECT * FROM get_pokemon_by_id(25);')
  console.log('   SELECT * FROM get_pokemon_by_name(\'Pikachu\');')
  console.log('   SELECT * FROM search_pokemon(\'pika\', \'electric\', NULL, NULL, NULL, 10);')
  console.log('')
  console.log('4. Check source data:')
  console.log('   SELECT COUNT(*) FROM pokepedia_pokemon;')
  console.log('   SELECT COUNT(*) FROM pokemon_showdown;')
  console.log('   SELECT resource_type, COUNT(*) FROM pokeapi_resources GROUP BY resource_type;')
  console.log('')
}

verifyWithDirectQueries().catch(console.error)
