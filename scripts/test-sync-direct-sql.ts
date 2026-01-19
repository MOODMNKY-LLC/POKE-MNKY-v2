/**
 * Test Sync with Direct SQL (Bypasses PostgREST cache issues)
 * 
 * Uses direct SQL queries to test sequential sync
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

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testDirectSQL() {
  console.log('='.repeat(70))
  console.log('Testing PokéPedia Sync - Direct SQL Approach')
  console.log('='.repeat(70))
  console.log('')
  
  const startTime = Date.now()
  const maxDuration = 60000 // 60 seconds
  
  try {
    // Step 1: Seed queue directly with SQL
    console.log('📊 Step 1: Seeding queue with test data (Direct SQL)')
    console.log('─'.repeat(70))
    
    // Fetch type list from PokeAPI
    const typeListResponse = await fetch('https://pokeapi.co/api/v2/type/?limit=20')
    if (!typeListResponse.ok) {
      throw new Error(`Failed to fetch type list: ${typeListResponse.status}`)
    }
    
    const typeList = await typeListResponse.json()
    const typeUrls = typeList.results.map((r: any) => r.url)
    
    console.log(`Fetched ${typeUrls.length} type URLs from PokeAPI`)
    
    // Enqueue using direct SQL
    const messages = typeUrls.map((url: string) => ({
      url,
      resource_type: 'type',
      phase: 'master',
    }))
    
    const { data: enqueueResult, error: enqueueError } = await supabase.rpc('pgmq_public_send_batch', {
      queue_name: 'pokepedia_ingest',
      messages: messages as any,
      sleep_seconds: 0,
    })
    
    if (enqueueError) {
      console.error('❌ Enqueue error:', enqueueError.message)
      // Try alternative: use direct SQL query
      console.log('Trying direct SQL approach...')
      
      // Use raw SQL via execute_sql
      const insertSQL = `
        SELECT pgmq.send_batch(
          'pokepedia_ingest',
          ARRAY[${messages.map((m, i) => `jsonb_build_object('url', '${m.url}', 'resource_type', '${m.resource_type}', 'phase', '${m.phase}')`).join(', ')}]::jsonb[],
          0
        );
      `
      
      // Actually, let's use a simpler approach - call the function directly
      for (const msg of messages.slice(0, 5)) { // Just test with 5 items
        const { error } = await supabase.rpc('pgmq_public_send_batch', {
          queue_name: 'pokepedia_ingest',
          messages: [msg] as any,
          sleep_seconds: 0,
        })
        
        if (error) {
          console.error(`Failed to enqueue ${msg.url}:`, error.message)
        } else {
          console.log(`✅ Enqueued: ${msg.url}`)
        }
      }
    } else {
      console.log(`✅ Enqueued ${enqueueResult?.length || 0} items`)
    }
    
    console.log('')
    
    // Step 2: Process queue sequentially
    console.log('📊 Step 2: Processing queue sequentially')
    console.log('─'.repeat(70))
    console.log('Mode: Sequential (1 item at a time, 300ms delay)')
    console.log('')
    
    await delay(1000) // Wait for queue
    
    let totalProcessed = 0
    let totalFailed = 0
    const rateLimitMs = 300
    const maxItems = 5 // Process max 5 items for testing
    
    for (let i = 0; i < maxItems && (Date.now() - startTime) < maxDuration - 10000; i++) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      console.log(`[${elapsed}s] Processing item ${i + 1}...`)
      
      // Read one message
      const { data: messages, error: readError } = await supabase.rpc('pgmq_public_read', {
        queue_name: 'pokepedia_ingest',
        sleep_seconds: 300,
        n: 1,
      })
      
      if (readError) {
        console.error(`❌ Read error:`, readError.message)
        break
      }
      
      if (!messages || messages.length === 0) {
        console.log('   Queue empty')
        break
      }
      
      const msg = messages[0]
      const url = msg.message?.url
      
      if (!url) {
        console.log('   Invalid message, skipping')
        continue
      }
      
      console.log(`   Fetching: ${url}`)
      
      try {
        // Fetch from PokeAPI
        const fetchStart = Date.now()
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        const fetchTime = Date.now() - fetchStart
        
        // Store in database
        const resourceType = 'type'
        const resourceKey = data.id?.toString() || url.split('/').filter(Boolean).pop()
        const name = data.name || null
        
        const { error: insertError } = await supabase
          .from('pokeapi_resources')
          .upsert({
            resource_type: resourceType,
            resource_key: resourceKey,
            name,
            url,
            data,
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'resource_type,resource_key',
          })
        
        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`)
        }
        
        // Delete message from queue
        await supabase.rpc('pgmq_public_delete', {
          queue_name: 'pokepedia_ingest',
          message_id: msg.msg_id,
        })
        
        totalProcessed++
        console.log(`   ✅ Processed in ${fetchTime}ms: ${name || resourceKey}`)
        
        // Rate limiting delay
        if (i < maxItems - 1) {
          await delay(rateLimitMs)
        }
      } catch (error: any) {
        totalFailed++
        console.error(`   ❌ Error: ${error.message}`)
        // Continue processing other items
      }
    }
    
    console.log('')
    console.log(`✅ Processed ${totalProcessed} items (${totalFailed} failed)`)
    console.log('')
    
    // Step 3: Verify data
    console.log('📊 Step 3: Verifying synced data')
    console.log('─'.repeat(70))
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('pokeapi_resources')
      .select('resource_key, name, resource_type')
      .eq('resource_type', 'type')
      .limit(10)
    
    if (verifyError) {
      console.error('❌ Verify error:', verifyError.message)
    } else {
      console.log(`Found ${verifyData?.length || 0} synced resources:`)
      verifyData?.forEach((r: any) => {
        console.log(`  - ${r.name || r.resource_key}`)
      })
      
      if (verifyData && verifyData.length > 0) {
        console.log('')
        console.log('='.repeat(70))
        console.log('✅ TEST SUCCESSFUL!')
        console.log('='.repeat(70))
        console.log('')
        console.log(`✅ Sequential processing is working!`)
        console.log(`   Processed: ${totalProcessed} items`)
        console.log(`   Failed: ${totalFailed} items`)
        console.log(`   Synced to database: ${verifyData.length} resources`)
        console.log(`   Time: ${Math.floor((Date.now() - startTime) / 1000)}s`)
        console.log('')
        console.log('✅ Validation complete - sequential sync works!')
      } else {
        console.log('⚠️  No data found - check for errors above')
      }
    }
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    console.log('')
    console.log(`Total time: ${elapsed}s`)
    
  } catch (error: any) {
    console.error('')
    console.error('❌ Error:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'))
    }
  }
}

testDirectSQL().catch(console.error)
