/**
 * Test Queue Status
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

async function checkQueue() {
  console.log('Checking queue status...')
  
  try {
    const { data, error } = await supabase.rpc('pgmq_public_read', {
      queue_name: 'pokepedia_ingest',
      sleep_seconds: 0,
      n: 1,
    })
    
    if (error) {
      console.error('Error:', error.message)
      return
    }
    
    console.log('Queue check:', {
      hasData: !!data?.length,
      sampleMessage: data?.[0] ? {
        msg_id: data[0].msg_id,
        url: data[0].message?.url,
      } : null,
    })
    
    // Check queue depth (approximate)
    const { count } = await supabase
      .from('pokeapi_resources')
      .select('*', { count: 'exact', head: true })
    
    console.log('Current resources:', count || 0)
  } catch (error: any) {
    console.error('Fatal error:', error.message)
  }
}

checkQueue().catch(console.error)
