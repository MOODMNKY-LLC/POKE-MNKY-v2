/**
 * Test Worker Sequential Processing
 * 
 * Tests the improved worker with sequential processing
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testWorker() {
  console.log('='.repeat(70))
  console.log('Testing PokéPedia Worker - Sequential Processing')
  console.log('='.repeat(70))
  console.log('')

  // Step 1: Check if queue has items, if not, seed it
  console.log('📊 Step 1: Checking queue status')
  console.log('─'.repeat(70))
  
  try {
    const response = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/functions/v1/pokepedia-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        batchSize: 1,
        visibilityTimeout: 300,
        concurrency: 1, // Sequential
        rateLimitMs: 300,
      }),
    })

    const result = await response.json()
    console.log('Worker response:', JSON.stringify(result, null, 2))
    
    if (result.ok && result.processed > 0) {
      console.log(`✅ Successfully processed ${result.processed} items`)
      console.log(`   Failed: ${result.failed || 0}`)
    } else if (result.ok && result.processed === 0) {
      console.log('⚠️  Queue is empty - need to seed first')
      
      // Step 2: Seed queue with test data
      console.log('')
      console.log('📊 Step 2: Seeding queue with test data')
      console.log('─'.repeat(70))
      
      const seedResponse = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/functions/v1/pokepedia-seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          resourceTypes: ['type'], // Start with just types (small, fast)
          limit: 20, // Just 20 items for testing
        }),
      })
      
      const seedResult = await seedResponse.json()
      console.log('Seed response:', JSON.stringify(seedResult, null, 2))
      
      if (seedResult.ok || seedResult.totalEnqueued > 0) {
        console.log(`✅ Seeded ${seedResult.totalEnqueued || 0} items`)
        
        // Step 3: Process queue
        console.log('')
        console.log('📊 Step 3: Processing queue')
        console.log('─'.repeat(70))
        
        // Wait a moment for queue to be ready
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const processResponse = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/functions/v1/pokepedia-worker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            batchSize: 5, // Small batch for testing
            visibilityTimeout: 300,
            concurrency: 1, // Sequential
            rateLimitMs: 300,
          }),
        })
        
        const processResult = await processResponse.json()
        console.log('Process response:', JSON.stringify(processResult, null, 2))
        
        if (processResult.ok && processResult.processed > 0) {
          console.log(`✅ Successfully processed ${processResult.processed} items`)
          console.log(`   Failed: ${processResult.failed || 0}`)
          
          // Step 4: Verify data
          console.log('')
          console.log('📊 Step 4: Verifying synced data')
          console.log('─'.repeat(70))
          
          const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/pokeapi_resources?resource_type=eq.type&select=resource_key,name&limit=5`, {
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
          })
          
          const verifyData = await verifyResponse.json()
          console.log('Synced resources:', verifyData)
          
          if (verifyData && verifyData.length > 0) {
            console.log(`✅ Verified: ${verifyData.length} resources synced`)
            console.log('')
            console.log('='.repeat(70))
            console.log('✅ TEST SUCCESSFUL!')
            console.log('='.repeat(70))
            console.log('')
            console.log('Sequential processing is working!')
            console.log(`Processed ${processResult.processed} items with ${processResult.failed || 0} failures`)
          } else {
            console.log('⚠️  No data found - may need to wait or check database')
          }
        } else {
          console.log('⚠️  Processing returned no items or errors')
        }
      } else {
        console.log('⚠️  Seed failed or returned no items')
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

testWorker().catch(console.error)
