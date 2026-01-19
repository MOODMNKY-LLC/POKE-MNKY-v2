/**
 * Test Edge Function with Sequential Processing
 * 
 * Tests the updated pokepedia-worker Edge Function
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const FUNCTION_BASE = supabaseUrl.replace('/rest/v1', '') + '/functions/v1'

async function testEdgeFunction() {
  console.log('='.repeat(70))
  console.log('Testing Edge Function - Sequential Mode')
  console.log('='.repeat(70))
  console.log('')
  
  const startTime = Date.now()
  
  try {
    // Step 1: Check current resources
    console.log('📊 Step 1: Current state')
    console.log('─'.repeat(70))
    
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/pokeapi_resources?resource_type=eq.type&select=resource_key&limit=1`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    })
    
    const checkData = await checkResponse.json()
    console.log(`Current type resources: ${checkData?.length || 0}`)
    console.log('')
    
    // Step 2: Call Edge Function with sequential mode
    console.log('📊 Step 2: Calling Edge Function (Sequential Mode)')
    console.log('─'.repeat(70))
    console.log('Config: concurrency=1, rateLimitMs=300, batchSize=5')
    console.log('')
    
    const response = await fetch(`${FUNCTION_BASE}/pokepedia-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        batchSize: 5,
        visibilityTimeout: 300,
        concurrency: 1, // Sequential
        rateLimitMs: 300, // Rate limiting
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Edge Function failed: ${response.status} - ${errorText}`)
    }
    
    const result = await response.json()
    console.log('Edge Function response:')
    console.log(JSON.stringify(result, null, 2))
    console.log('')
    
    // Step 3: Verify results
    console.log('📊 Step 3: Verification')
    console.log('─'.repeat(70))
    
    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/pokeapi_resources?resource_type=eq.type&select=resource_key,name&limit=20`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    })
    
    const verifyData = await verifyResponse.json()
    console.log(`Total type resources: ${verifyData?.length || 0}`)
    
    if (verifyData && verifyData.length > 0) {
      console.log('Sample resources:')
      verifyData.slice(0, 5).forEach((r: any) => {
        console.log(`  - ${r.name || r.resource_key}`)
      })
    }
    
    console.log('')
    console.log('='.repeat(70))
    
    if (result.ok && (result.processed > 0 || result.processedItems?.length > 0)) {
      console.log('✅ SUCCESS! Edge Function sequential mode works!')
      console.log('='.repeat(70))
      console.log('')
      console.log(`Processed: ${result.processed || result.processedItems?.length || 0}`)
      console.log(`Failed: ${result.failed || result.failedItems?.length || 0}`)
      console.log(`Sequential: ${result.sequential ? 'Yes' : 'No'}`)
      console.log(`Rate Limit: ${result.rateLimitMs || 'N/A'}ms`)
      console.log(`Time: ${Math.floor((Date.now() - startTime) / 1000)}s`)
      console.log('')
      console.log('✅ Validation complete!')
      console.log('')
      console.log('Next steps:')
      console.log('1. Seed full queue: POST /pokepedia-seed')
      console.log('2. Process queue: POST /pokepedia-worker with concurrency=1')
      console.log('3. Monitor: Check pokeapi_resources table')
    } else if (result.ok && result.processed === 0) {
      console.log('⚠️  Edge Function works but queue is empty')
      console.log('   Seed queue first, then process')
    } else {
      console.log('❌ Edge Function returned error')
    }
    
  } catch (error: any) {
    console.error('')
    console.error('❌ Error:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 3).join('\n'))
    }
  }
}

testEdgeFunction().catch(console.error)
