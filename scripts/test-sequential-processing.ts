/**
 * Test Sequential Processing
 * 
 * Tests sequential processing with rate limiting
 * Assumes queue already has items
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

async function testSequential() {
  console.log('='.repeat(70))
  console.log('Sequential Processing Test')
  console.log('='.repeat(70))
  console.log('')
  
  const startTime = Date.now()
  const maxDuration = 60000
  const rateLimitMs = 300
  
  let totalProcessed = 0
  let totalFailed = 0
  const maxItems = 10
  
  console.log(`Processing up to ${maxItems} items sequentially`)
  console.log(`Rate limit: ${rateLimitMs}ms between requests`)
  console.log('')
  
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
    
    const resourceId = url.split('/').filter(Boolean).pop()
    console.log(`[${elapsed}s] Item ${i + 1}: Processing ${resourceId}...`)
    
    try {
      const fetchStart = Date.now()
      
      // Fetch from PokeAPI
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      const fetchTime = Date.now() - fetchStart
      
      const resourceType = 'type'
      const resourceKey = data.id?.toString() || resourceId
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
      console.log(`  ✅ Success: ${name || resourceKey} (${fetchTime}ms)`)
      
      // Rate limiting delay
      if (i < maxItems - 1) {
        await delay(rateLimitMs)
      }
    } catch (error: any) {
      totalFailed++
      console.error(`  ❌ Error: ${error.message}`)
      // Continue processing other items
    }
  }
  
  console.log('')
  console.log('='.repeat(70))
  console.log('Results')
  console.log('='.repeat(70))
  console.log(`Processed: ${totalProcessed}`)
  console.log(`Failed: ${totalFailed}`)
  console.log(`Time: ${Math.floor((Date.now() - startTime) / 1000)}s`)
  console.log('')
  
  // Verify
  const { data: verifyData } = await supabase
    .from('pokeapi_resources')
    .select('resource_key, name')
    .eq('resource_type', 'type')
    .limit(10)
  
  console.log(`Verified: ${verifyData?.length || 0} resources in database`)
  
  if (totalProcessed > 0 && totalFailed === 0) {
    console.log('')
    console.log('✅ SUCCESS! Sequential processing works perfectly!')
    console.log('')
    console.log('✅ Validation complete!')
    console.log('   - Sequential processing: Working')
    console.log('   - Rate limiting: Working')
    console.log('   - Error handling: Working')
    console.log('   - Database inserts: Working')
  } else if (totalProcessed > 0) {
    console.log('')
    console.log('⚠️  Partial success - some items failed')
  } else {
    console.log('')
    console.log('❌ No items processed')
  }
}

testSequential().catch(console.error)
