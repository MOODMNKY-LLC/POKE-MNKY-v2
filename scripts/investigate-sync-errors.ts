/**
 * Investigate Sync Errors
 * 
 * Checks sync job status and errors
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

async function investigate() {
  console.log('='.repeat(70))
  console.log('Investigating Sync Errors')
  console.log('='.repeat(70))
  console.log('')

  // Check sync jobs
  console.log('📊 Checking sync jobs')
  console.log('─'.repeat(70))
  
  const { data: jobs, error: jobsError } = await supabase
    .from('sync_jobs')
    .select('*')
    .eq('sync_type', 'pokepedia')
    .order('started_at', { ascending: false })
    .limit(5)

  if (jobsError) {
    console.error('❌ Error fetching jobs:', jobsError.message)
  } else if (jobs && jobs.length > 0) {
    console.log(`Found ${jobs.length} sync job(s):`)
    jobs.forEach((job, i) => {
      console.log(`\nJob ${i + 1}:`)
      console.log(`  ID: ${job.id}`)
      console.log(`  Phase: ${job.phase}`)
      console.log(`  Status: ${job.status}`)
      console.log(`  Progress: ${job.progress_percentage || 0}%`)
      console.log(`  Started: ${job.started_at}`)
      console.log(`  Updated: ${job.updated_at}`)
      if (job.error_message) {
        console.log(`  Error: ${job.error_message}`)
      }
      if (job.metadata) {
        console.log(`  Metadata: ${JSON.stringify(job.metadata, null, 2)}`)
      }
    })
  } else {
    console.log('No sync jobs found')
  }
  console.log('')

  // Check pokeapi_resources
  console.log('📊 Checking pokeapi_resources')
  console.log('─'.repeat(70))
  
  const { data: resources, error: resourcesError } = await supabase
    .from('pokeapi_resources')
    .select('resource_type, COUNT(*)')
    .limit(100)

  if (resourcesError) {
    console.error('❌ Error:', resourcesError.message)
  } else {
    const typeCounts: Record<string, number> = {}
    resources?.forEach((r: any) => {
      typeCounts[r.resource_type] = (typeCounts[r.resource_type] || 0) + 1
    })
    
    console.log('Resource type counts:')
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`)
      })
  }
  console.log('')

  // Check if Edge Function is accessible
  console.log('📊 Testing Edge Function accessibility')
  console.log('─'.repeat(70))
  
  try {
    const testResponse = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/functions/v1/sync-pokepedia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        action: 'status',
      }),
    })

    console.log(`Edge Function response status: ${testResponse.status}`)
    const testResult = await testResponse.text()
    console.log(`Response: ${testResult.substring(0, 200)}`)
  } catch (error: any) {
    console.error('❌ Edge Function not accessible:', error.message)
    console.log('   This might mean:')
    console.log('   - Edge Function not deployed')
    console.log('   - Supabase not running locally')
    console.log('   - Network issue')
  }
  console.log('')

  // Check queue stats
  console.log('📊 Checking queue stats')
  console.log('─'.repeat(70))
  
  try {
    const { data: queueStats, error: queueError } = await supabase
      .rpc('get_pokepedia_queue_stats')

    if (queueError) {
      console.log('⚠️  Could not get queue stats:', queueError.message)
    } else {
      console.log('Queue stats:', JSON.stringify(queueStats, null, 2))
    }
  } catch (error: any) {
    console.log('⚠️  Queue stats function not available:', error.message)
  }
  console.log('')

  console.log('='.repeat(70))
  console.log('Investigation Complete')
  console.log('='.repeat(70))
}

investigate().catch(console.error)
