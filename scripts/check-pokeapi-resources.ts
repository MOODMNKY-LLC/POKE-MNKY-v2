/**
 * Check pokeapi_resources to see what's actually synced
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

async function checkResources() {
  console.log('Checking pokeapi_resources...\n')

  // Get sample Pokemon resources
  const { data: pokemonResources, error: pokemonError } = await supabase
    .from('pokeapi_resources')
    .select('resource_type, resource_key, name')
    .eq('resource_type', 'pokemon')
    .limit(5)

  if (pokemonError) {
    console.error('Error:', pokemonError.message)
  } else {
    console.log(`Found ${pokemonResources?.length || 0} Pokemon resources (showing first 5):`)
    pokemonResources?.forEach(r => {
      console.log(`  - ID: ${r.resource_key}, Name: ${r.name}`)
    })
  }

  // Check all resource types
  const { data: allTypes, error: typesError } = await supabase
    .from('pokeapi_resources')
    .select('resource_type')
    .limit(1000)

  if (!typesError && allTypes) {
    const typeCounts: Record<string, number> = {}
    allTypes.forEach(r => {
      typeCounts[r.resource_type] = (typeCounts[r.resource_type] || 0) + 1
    })
    console.log('\nResource type counts:')
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`)
      })
  }

  // Check if we can query pokemon_unified view directly
  console.log('\nTesting pokemon_unified view...')
  const { data: unifiedData, error: unifiedError } = await supabase
    .from('pokemon_unified')
    .select('pokemon_id, name')
    .limit(5)

  if (unifiedError) {
    console.error('Error querying pokemon_unified:', unifiedError.message)
  } else {
    console.log(`pokemon_unified returned ${unifiedData?.length || 0} records`)
    unifiedData?.forEach(p => {
      console.log(`  - ID: ${p.pokemon_id}, Name: ${p.name}`)
    })
  }
}

checkResources().catch(console.error)
