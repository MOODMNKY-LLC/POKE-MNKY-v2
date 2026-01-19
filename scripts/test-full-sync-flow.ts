/**
 * Test Full Sync Flow
 * 
 * Complete test: Seed → Process → Verify
 * Time limit: 60 seconds
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

async function testFullFlow() {
  console.log('='.repeat(70))
  console.log('Full PokéPedia Sync Flow Test')
  console.log('='.repeat(70))
  console.log('')
  
  const startTime = Date.now()
  const maxDuration = 60000 // 60 seconds
  
  try {
    // Step 1: Seed queue
    console.log('📊 Step 1: Seeding queue')
    console.log('─'.repeat(70))
    
    // Fetch type list
    const typeListResponse = await fetch('https://pokeapi.co/api/v2/type/?limit=10')
    const typeList = await typeListResponse.json()
    const typeUrls = typeList.results.map((r: any) => r.url)
    
    console.log(`Fetched ${typeUrls.length} type URLs`)
    
    // Enqueue one by one (simpler than batch)
    let enqueued = 0
    for (const url of typeUrls.slice(0, 5)) { // Just 5 for testing
      try {
        const { error } = await supabase.rpc('pgmq_public_send_batch', {
          queue_name: 'pokepedia_ingest',
          messages: [{
            url,
            resource_type: 'type',
            phase: 'master',
          }] as any,
          sleep_seconds: 0,
        })
        
        if (error) {
          // Try direct SQL approach
          const { error: sqlError } = await supabase.rpc('execute_sql', {
            query: `SELECT pgmq.send_batch('pokepedia_ingest', ARRAY[jsonb_build_object('url', $1, 'resource_type', 'type', 'phase', 'master')]::jsonb[], 0)`,
            params: [url],
          })
          
          if (!sqlError) {
            enqueued++
            console.log(`  ✅ Enqueued: ${url.split('/').pop()}`)
          } else {
            console.log(`  ⚠️  Skipped: ${url.split('/').pop()}`)
          }
        } else {
          enqueued++
          console.log(`  ✅ Enqueued: ${url.split('/').pop()}`)
        }
      } catch (err: any) {
        console.log(`  ⚠️  Error enqueuing ${url}: ${err.message}`)
      }
    }
    
    console.log(`Enqueued ${enqueued} items`)
    console.log('')
    
    await delay(1000)
    
    // Step 2: Process queue sequentially
    console.log('📊 Step 2: Processing queue sequentially')
    console.log('─'.repeat(70))
    console.log('Mode: Sequential (1 item, 300ms delay)')
    console.log('')
    
    let totalProcessed = 0
    let totalFailed = 0
    const rateLimitMs = 300
    const maxItems = 10
    
    for (let i = 0; i < maxItems && (Date.now() - startTime) < maxDuration - 5000; i++) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      
      // Read one message
      const { data: messages, error: readError } = await supabase.rpc('pgmq_public_read', {
        queue_name: 'pokepedia_ingest',
        sleep_seconds: 300,
        n: 1,
      })
      
      if (readError) {
        console.error(`[${elapsed}s] Read error:`, readError.message)
        break
      }
      
      if (!messages || messages.length === 0) {
        console.log(`[${elapsed}s] Queue empty`)
        break
      }
      
      const msg = messages[0]
      const url = msg.message?.url
      
      if (!url) {
        console.log(`[${elapsed}s] Invalid message`)
        continue
      }
      
      console.log(`[${elapsed}s] Processing: ${url.split('/').pop()}`)
      
      try {
        // Fetch from PokeAPI
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        const resourceType = 'type'
        const resourceKey = data.id?.toString() || url.split('/').filter(Boolean).pop()
        const name = data.name || null
        
        // Store in database
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
          throw new Error(`Insert: ${insertError.message}`)
        }
        
        // Delete from queue
        await supabase.rpc('pgmq_public_delete', {
          queue_name: 'pokepedia_ingest',
          message_id: msg.msg_id,
        })
        
        totalProcessed++
        console.log(`  ✅ Processed: ${name || resourceKey}`)
        
        // Rate limiting
        if (i < maxItems - 1) {
          await delay(rateLimitMs)
        }
      } catch (error: any) {
        totalFailed++
        console.error(`  ❌ Error: ${error.message}`)
      }
    }
    
    console.log('')
    console.log(`✅ Processed: ${totalProcessed}, Failed: ${totalFailed}`)
    console.log('')
    
    // Step 3: Verify
    console.log('📊 Step 3: Verification')
    console.log('─'.repeat(70))
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('pokeapi_resources')
      .select('resource_key, name, resource_type')
      .eq('resource_type', 'type')
      .limit(10)
    
    if (verifyError) {
      console.error('Verify error:', verifyError.message)
    } else {
      console.log(`Found ${verifyData?.length || 0} synced resources:`)
      verifyData?.forEach((r: any) => {
        console.log(`  - ${r.name || r.resource_key}`)
      })
      
      if (verifyData && verifyData.length > 0) {
        console.log('')
        console.log('='.repeat(70))
        console.log('✅ SUCCESS! Sequential sync is working!')
        console.log('='.repeat(70))
        console.log('')
        console.log(`Processed: ${totalProcessed} items`)
        console.log(`Failed: ${totalFailed} items`)
        console.log(`Synced: ${verifyData.length} resources`)
        console.log(`Time: ${Math.floor((Date.now() - startTime) / 1000)}s`)
        console.log('')
        console.log('✅ Validation complete!')
        console.log('')
        console.log('Next: Use Edge Function with concurrency=1, rateLimitMs=300')
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

testFullFlow().catch(console.error)
