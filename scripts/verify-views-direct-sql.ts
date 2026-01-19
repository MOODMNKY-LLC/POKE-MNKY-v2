/**
 * Verify Views and Functions with Direct SQL Queries
 * Uses Supabase REST API to execute SQL directly
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function verifyWithSQL() {
  console.log('='.repeat(70))
  console.log('Verifying Views and Functions with Direct SQL')
  console.log('='.repeat(70))
  console.log('')

  // Test 1: Check if views exist
  console.log('📊 Test 1: Check if views exist')
  console.log('─'.repeat(70))
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        sql_query: `
          SELECT table_name 
          FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name IN ('pokemon_unified', 'pokemon_with_all_data', 'draft_pool_comprehensive')
          ORDER BY table_name;
        `
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Views found:', data)
    } else {
      const error = await response.text()
      console.log('⚠️  Could not check views (exec_sql might not exist):', error.substring(0, 200))
    }
  } catch (error: any) {
    console.log('⚠️  Error:', error.message)
  }
  console.log('')

  // Test 2: Query pokemon_unified via REST API with raw SQL approach
  console.log('📊 Test 2: Query pokemon_unified view via REST')
  console.log('─'.repeat(70))
  try {
    // Try to query the view directly
    const response = await fetch(`${supabaseUrl}/rest/v1/pokemon_unified?select=*&limit=5`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ pokemon_unified accessible via REST: ${data.length} records`)
      if (data.length > 0) {
        console.log('Sample record:')
        console.log(`  Pokemon ID: ${data[0].pokemon_id}`)
        console.log(`  Name: ${data[0].name}`)
        console.log(`  Types: ${JSON.stringify(data[0].types)}`)
      }
    } else {
      const error = await response.text()
      console.log('❌ Error:', error.substring(0, 300))
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message)
  }
  console.log('')

  // Test 3: Check source tables
  console.log('📊 Test 3: Check source tables')
  console.log('─'.repeat(70))
  try {
    const [pokepediaResponse, showdownResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/pokepedia_pokemon?select=id,name&limit=5`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }),
      fetch(`${supabaseUrl}/rest/v1/pokemon_showdown?select=showdown_id,name,dex_num&limit=5`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }),
    ])

    if (pokepediaResponse.ok) {
      const pokepediaData = await pokepediaResponse.json()
      console.log(`✅ pokepedia_pokemon: ${pokepediaData.length} records (showing first 5)`)
      pokepediaData.forEach((p: any) => {
        console.log(`  - ID: ${p.id}, Name: ${p.name}`)
      })
    } else {
      const error = await pokepediaResponse.text()
      console.log(`⚠️  pokepedia_pokemon: ${error.substring(0, 200)}`)
    }

    if (showdownResponse.ok) {
      const showdownData = await showdownResponse.json()
      console.log(`✅ pokemon_showdown: ${showdownData.length} records (showing first 5)`)
      showdownData.forEach((p: any) => {
        console.log(`  - Dex: ${p.dex_num}, Name: ${p.name}, Showdown ID: ${p.showdown_id}`)
      })
    } else {
      const error = await showdownResponse.text()
      console.log(`⚠️  pokemon_showdown: ${error.substring(0, 200)}`)
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message)
  }
  console.log('')

  // Test 4: Test helper functions via RPC
  console.log('📊 Test 4: Test helper functions')
  console.log('─'.repeat(70))
  
  // Try get_pokemon_by_id
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_pokemon_by_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ pokemon_id_param: 25 }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ get_pokemon_by_id(25) returned:', data.length, 'records')
      if (data.length > 0) {
        console.log(`  Name: ${data[0].name}, Types: ${JSON.stringify(data[0].types)}`)
      }
    } else {
      const error = await response.text()
      console.log('⚠️  get_pokemon_by_id:', error.substring(0, 200))
    }
  } catch (error: any) {
    console.log('⚠️  Error:', error.message)
  }

  console.log('')
  console.log('='.repeat(70))
  console.log('✅ Verification Complete!')
  console.log('='.repeat(70))
}

verifyWithSQL().catch(console.error)
