/**
 * Check Sync Job Details and Errors
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

async function checkDetails() {
  console.log('='.repeat(70))
  console.log('Checking Sync Job Details')
  console.log('='.repeat(70))
  console.log('')

  // Get latest job with full details
  const { data: jobs, error } = await supabase
    .from('sync_jobs')
    .select('*')
    .eq('sync_type', 'pokepedia')
    .order('started_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  if (!jobs || jobs.length === 0) {
    console.log('No sync jobs found')
    return
  }

  const job = jobs[0]
  console.log('Latest Sync Job:')
  console.log('─'.repeat(70))
  console.log(`Job ID: ${job.job_id || job.id}`)
  console.log(`Phase: ${job.phase}`)
  console.log(`Status: ${job.status}`)
  console.log(`Progress: ${job.progress_percentage || 0}%`)
  console.log(`Started: ${job.started_at}`)
  console.log(`Updated: ${job.updated_at || 'N/A'}`)
  console.log(`Current Chunk: ${job.current_chunk || 0}`)
  console.log(`Total Chunks: ${job.total_chunks || 0}`)
  console.log(`Synced: ${job.pokemon_synced || 0}`)
  console.log('')

  if (job.error_message) {
    console.log('Error Message:')
    console.log('─'.repeat(70))
    console.log(job.error_message)
    console.log('')
  }

  if (job.error_log) {
    console.log('Error Log:')
    console.log('─'.repeat(70))
    console.log(JSON.stringify(job.error_log, null, 2))
    console.log('')
  }

  if (job.metadata) {
    console.log('Metadata:')
    console.log('─'.repeat(70))
    console.log(JSON.stringify(job.metadata, null, 2))
    console.log('')
  }

  // Check if Edge Function is actually processing
  console.log('Testing Edge Function directly')
  console.log('─'.repeat(70))
  
  try {
    // Try to get status
    const statusResponse = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/functions/v1/sync-pokepedia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        action: 'status',
      }),
    })

    const statusResult = await statusResponse.json()
    console.log('Status response:', JSON.stringify(statusResult, null, 2))
  } catch (error: any) {
    console.error('Error:', error.message)
  }
  console.log('')

  // Check pokeapi_resources directly
  console.log('Checking pokeapi_resources')
  console.log('─'.repeat(70))
  
  const { data: resources, error: resError } = await supabase
    .from('pokeapi_resources')
    .select('resource_type, resource_key, name')
    .limit(10)

  if (resError) {
    console.error('Error:', resError.message)
  } else {
    console.log(`Found ${resources?.length || 0} resources (showing first 10):`)
    resources?.forEach(r => {
      console.log(`  - ${r.name || r.resource_key} (${r.resource_type})`)
    })
  }
  console.log('')

  console.log('='.repeat(70))
  console.log('Analysis')
  console.log('='.repeat(70))
  console.log('')

  if (job.status === 'running' && (job.pokemon_synced || 0) === 0 && job.current_chunk > 0) {
    console.log('⚠️  CRITICAL ISSUE DETECTED:')
    console.log('   - Job is running')
    console.log('   - Processing chunks (current_chunk > 0)')
    console.log('   - But syncing 0 items')
    console.log('')
    console.log('Possible causes:')
    console.log('   1. PokeAPI rate limiting')
    console.log('   2. Network connectivity issues')
    console.log('   3. Invalid API responses')
    console.log('   4. Edge Function errors not being logged')
    console.log('')
    console.log('Next steps:')
    console.log('   1. Check Edge Function logs: supabase functions logs sync-pokepedia')
    console.log('   2. Test PokeAPI connectivity manually')
    console.log('   3. Check if PokeAPI is accessible from Edge Function')
  } else if (job.status === 'failed') {
    console.log('❌ Job failed')
    console.log('   Check error_message and error_log above')
  } else {
    console.log('✅ Job appears to be running normally')
    console.log('   Wait longer or check Edge Function logs for details')
  }
}

checkDetails().catch(console.error)
