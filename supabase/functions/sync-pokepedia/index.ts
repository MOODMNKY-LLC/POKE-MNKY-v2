/**
 * Supabase Edge Function: Comprehensive Pokepedia Sync (Improved)
 * Uses PokeAPI pagination for efficient batch processing
 * Proper dependency ordering: master → reference → species → pokemon → relationships
 * 
 * Phases:
 * - master: Types, abilities, moves, stats, egg-groups, growth-rates
 * - reference: Generations, pokemon-colors, pokemon-habitats, pokemon-shapes
 * - species: Pokemon species (depends on reference data)
 * - pokemon: Pokemon data (depends on species)
 * - relationships: Pokemon types, abilities, stats (depends on pokemon + master)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import type {
  ResourceList,
  Type,
  Ability,
  Move,
  Stat,
  Generation,
  PokemonColor,
  PokemonHabitat,
  PokemonShape,
  GrowthRate,
  EggGroup,
  PokemonSpecies,
  Pokemon,
} from "./types.ts"

const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2"
const CONCURRENT_REQUESTS = 8 // Parallel requests per batch (optimized: PokéAPI can handle 8-10 safely)
const BATCH_DELAY_MS = 100 // Delay between batches (optimized: reduced from 250ms, still respectful to PokéAPI fair use)
const MAX_RETRIES = 3 // Maximum retries for failed requests
const RETRY_BASE_DELAY_MS = 1000 // Base delay for exponential backoff

interface SyncJob {
  job_id: string
  sync_type: string
  phase: string
  status: string
  current_chunk: number
  total_chunks: number
  chunk_size: number
  start_id: number
  end_id: number
  pokemon_synced: number
  pokemon_failed: number
}

serve(async (req) => {
  try {
    // Log request for debugging
    // Headers are normalized to lowercase by Edge Function gateway
    const allHeaders = Object.fromEntries(req.headers.entries())
    // Try multiple ways to get the auth header (gateway may normalize differently)
    const authHeaderLower = req.headers.get("authorization")
    const authHeaderUpper = req.headers.get("Authorization")
    const authFromObject = allHeaders["authorization"] || allHeaders["Authorization"]
    const authValue = authHeaderLower || authHeaderUpper || authFromObject || null
    
    // Debug: Check if header exists but is empty (common with --no-verify-jwt)
    const authHeaderExists = "authorization" in allHeaders || "Authorization" in allHeaders
    const authHeaderEmpty = authHeaderExists && !authValue
    
    console.log("[Edge Function] Request received:", {
      method: req.method,
      url: req.url,
      hasAuth: !!authValue && authValue.length > 0,
      authPrefix: authValue && authValue.length > 0 ? authValue.substring(0, 20) + "..." : "none",
      headerKeys: Object.keys(allHeaders),
      authHeaderPresent: authHeaderExists,
      authHeaderEmpty: authHeaderEmpty,
      authValueLength: authValue ? authValue.length : 0,
      // Note: With --no-verify-jwt, gateway strips Bearer token but may leave empty header
      // Function uses its own SUPABASE_SERVICE_ROLE_KEY from env, so this is expected
    })
    
    // Initialize Supabase client
    // According to writing-supabase-edge-functions rule:
    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are pre-populated by Supabase CLI
    // For local development, we need to ensure we're using the correct localhost URL
    let supabaseUrl = Deno.env.get("SUPABASE_URL")!
    let supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    
    // Validate we have the required values
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Edge Function] Missing Supabase configuration", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        envKeys: Object.keys(Deno.env.toObject()).filter(k => k.includes("SUPABASE")),
      })
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // Detect if we're running locally
    const isLocal = supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost") || supabaseUrl.includes("kong")
    const isKong = supabaseUrl.includes("kong")
    
    // IMPORTANT: When Edge Function runs in Docker, kong:8000 is the CORRECT URL
    // Edge Function container uses Docker network hostname 'kong' to reach Supabase API gateway
    // Using 127.0.0.1:54321 from inside Docker container would try to connect to the container itself, not the host
    // So we keep kong:8000 for Docker network connectivity
    if (isKong && isLocal) {
      console.log("[Edge Function] Using Docker network URL (kong:8000) - this is correct for containerized Edge Functions")
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify Supabase client is initialized correctly
    // Expected local service role key: 164 characters, starts with eyJhbGciOiJIUzI1NiIs
    const expectedLocalKeyPrefix = "eyJhbGciOiJIUzI1NiIs"
    const expectedLocalKeyLength = 164
    const serviceKeyMatchesLocal = supabaseServiceKey && 
      supabaseServiceKey.startsWith(expectedLocalKeyPrefix) &&
      supabaseServiceKey.length === expectedLocalKeyLength
    
    console.log("[Edge Function] Supabase client initialized:", {
      url: supabaseUrl, // Full URL to see if it's local or remote
      urlIsLocal: isLocal,
      isKong: isKong,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 30) + "..." : "none",
      serviceKeyLength: supabaseServiceKey ? supabaseServiceKey.length : 0,
      expectedLocalKeyLength: expectedLocalKeyLength,
      serviceKeyMatchesLocal: serviceKeyMatchesLocal,
      // Warning if service key doesn't match expected local format
      serviceKeyWarning: isLocal && !serviceKeyMatchesLocal 
        ? `⚠️ Service key doesn't match expected local format (expected ${expectedLocalKeyLength} chars starting with ${expectedLocalKeyPrefix.substring(0, 20)}...)`
        : null,
    })
    
    // Test database connection by querying a simple table
    // Also verify we can query the specific job ID we expect to see
    const expectedJobId = "7be7385a-0803-4977-a050-035ba50c5df7" // The pokepedia job we know exists
    // IMPORTANT: Add ORDER BY to ensure consistent results
    // Without ORDER BY, PostgREST might return results in unpredictable order
    const { data: testData, error: testError } = await supabase
      .from("sync_jobs")
      .select("job_id, sync_type, phase, status")
      .order("started_at", { ascending: false })
      .limit(10) // Increased limit to see more jobs
    
    // Also query for the specific job we expect to see
    const { data: expectedJobData, error: expectedJobError } = await supabase
      .from("sync_jobs")
      .select("job_id, sync_type, phase, status")
      .eq("job_id", expectedJobId)
      .single()
    
    console.log("[Edge Function] Database connection test:", {
      canRead: !testError,
      error: testError ? {
        message: testError.message,
        code: testError.code,
        details: testError.details,
      } : null,
      testDataCount: testData?.length || 0,
      testDataJobs: testData?.map(j => ({
        job_id: j.job_id,
        sync_type: j.sync_type,
        phase: j.phase,
        status: j.status,
      })) || [],
      // Verify we can find the expected job
      expectedJobId: expectedJobId,
      expectedJobFound: !!expectedJobData && !expectedJobError,
      expectedJobData: expectedJobData ? {
        job_id: expectedJobData.job_id,
        sync_type: expectedJobData.sync_type,
        phase: expectedJobData.phase,
        status: expectedJobData.status,
      } : null,
      expectedJobError: expectedJobError ? {
        message: expectedJobError.message,
        code: expectedJobError.code,
      } : null,
    })
    
    // Validate we're connected to the correct database
    // For local development, verify connection works and log database state
    // Note: If connection test failed, testData will be empty/undefined
    if (isLocal) {
      if (testError) {
        console.error("[Edge Function] ⚠️ CRITICAL: Database connection failed!", {
          url: supabaseUrl,
          error: testError.message,
          code: testError.code,
          hint: "If using kong:8000, this is correct for Docker. If using 127.0.0.1:54321, Edge Function container cannot reach host - use kong:8000 instead.",
        })
      } else if (testData && testData.length > 0) {
        // Connection successful - log database state for diagnostics
        const pokepediaJobs = testData.filter((j: any) => j.sync_type === "pokepedia")
        const pokemonCacheJobs = testData.filter((j: any) => j.sync_type === "pokemon_cache")
        const runningJobs = testData.filter((j: any) => j.status === "running")
        const failedJobs = testData.filter((j: any) => j.status === "failed")
        const completedJobs = testData.filter((j: any) => j.status === "completed")

        console.log("[Edge Function] Database connection successful - current state:", {
          isLocal: isLocal,
          urlUsed: supabaseUrl,
          totalJobsInSample: testData.length,
          byType: {
            pokepedia: pokepediaJobs.length,
            pokemon_cache: pokemonCacheJobs.length,
          },
          byStatus: {
            running: runningJobs.length,
            failed: failedJobs.length,
            completed: completedJobs.length,
          },
          runningJobIds: runningJobs.map((j: any) => j.job_id),
          // Show first few job IDs for reference
          sampleJobIds: testData.slice(0, 5).map((j: any) => ({
            id: j.job_id,
            type: j.sync_type,
            phase: j.phase,
            status: j.status,
          })),
        })
      } else {
        console.log("[Edge Function] Database connection successful but no jobs found in sample", {
          url: supabaseUrl,
          sampleSize: 10,
        })
      }
    }

    // Check for manual trigger or cron
    const body = await req.json().catch(() => ({}))
    const { action, phase, priority, continueUntilComplete } = body
    const isManual = action === "start" || req.method === "POST"
    
    console.log("[Edge Function] Request body:", { action, phase, priority, isManual, continueUntilComplete })

    if (isManual && phase) {
      // Manual trigger: Create new sync job
      // Default continueUntilComplete to true for local development (faster completion)
      const shouldContinue = continueUntilComplete !== undefined ? continueUntilComplete === true : true
      return await handleManualSync(supabase, phase, priority || "standard", shouldContinue)
    }

    // Cron trigger: Process next chunk of active job
    return await processNextChunk(supabase)
  } catch (error: any) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

async function handleManualSync(
  supabase: any,
  phase: string,
  priority: string = "standard",
  continueUntilComplete: boolean = true  // Default to true for faster local development
) {
  console.log(`[handleManualSync] Starting sync for phase: ${phase}, priority: ${priority}`)
  
  // First, clean up any stuck jobs (no progress for 5+ minutes)
  const { data: stuckJobs } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("sync_type", "pokepedia")
    .eq("phase", phase)
    .eq("status", "running")
    .or(`pokemon_synced.eq.0,current_chunk.eq.0`)
  
  if (stuckJobs && stuckJobs.length > 0) {
    for (const stuckJob of stuckJobs) {
      const heartbeatAge = Date.now() - new Date(stuckJob.last_heartbeat || stuckJob.started_at).getTime()
      if (heartbeatAge > 5 * 60 * 1000 && stuckJob.pokemon_synced === 0 && stuckJob.current_chunk === 0) {
        console.log(`[handleManualSync] Cleaning up stuck job with no progress: ${stuckJob.job_id}`)
        await supabase
          .from("sync_jobs")
          .update({ status: "failed", error_log: { reason: "No progress after 5 minutes - cleaned up" } })
          .eq("job_id", stuckJob.job_id)
      }
    }
  }
  
  // Check for existing running job with same phase
  // Also check for stuck jobs (no heartbeat in 10 minutes)
  console.log(`[handleManualSync] Querying for existing jobs: sync_type=pokepedia, phase=${phase}, status IN (running, pending)`)
  
  const { data: existingJobs, error: checkError } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("sync_type", "pokepedia")
    .eq("phase", phase)
    .in("status", ["running", "pending"])
    .order("started_at", { ascending: false })

  if (checkError) {
    console.error("[handleManualSync] Error checking for existing job:", {
      error: checkError.message,
      code: checkError.code,
      details: checkError.details,
      hint: checkError.hint,
      fullError: JSON.stringify(checkError, null, 2),
    })
    // Continue anyway - might be a transient error
  }
  
  console.log(`[handleManualSync] Found ${existingJobs?.length || 0} existing job(s) for phase: ${phase}`)
  if (existingJobs && existingJobs.length > 0) {
    console.log(`[handleManualSync] Job IDs:`, existingJobs.map(j => j.job_id))
    console.log(`[handleManualSync] Job details:`, existingJobs.map(j => ({
      job_id: j.job_id,
      status: j.status,
      current_chunk: j.current_chunk,
      pokemon_synced: j.pokemon_synced,
      started_at: j.started_at,
    })))
  } else {
    console.log(`[handleManualSync] No existing jobs found - will create new job`)
  }

  // Check for stuck jobs and mark them as failed
  if (existingJobs && existingJobs.length > 0) {
    console.log(`[handleManualSync] Found ${existingJobs.length} existing job(s) for phase: ${phase}`)
    
    let hasActiveJob = false
    for (const existingJob of existingJobs) {
      const heartbeatAge = Date.now() - new Date(existingJob.last_heartbeat || existingJob.started_at).getTime()
      const minutesSinceUpdate = heartbeatAge / (60 * 1000)
      
      console.log(`[handleManualSync] Checking job ${existingJob.job_id}: status=${existingJob.status}, age=${minutesSinceUpdate.toFixed(1)}min`)
      
      if (heartbeatAge > 10 * 60 * 1000) {
        console.log(`[handleManualSync] Marking stuck job as failed: ${existingJob.job_id} (${minutesSinceUpdate.toFixed(1)} minutes old)`)
        await supabase
          .from("sync_jobs")
          .update({ status: "failed", error_log: { reason: "Stuck job detected - no heartbeat in 10+ minutes" } })
          .eq("job_id", existingJob.job_id)
      } else if (existingJob.status === "running") {
        // Check if job has actually synced items (not just processed chunks)
        // A job that processed chunks but synced 0 items after 5+ minutes is stuck
        const hasSyncedItems = existingJob.pokemon_synced > 0
        const isStuckNoProgress = !hasSyncedItems && heartbeatAge > 5 * 60 * 1000 // 5 minutes with no synced items
        
        if (isStuckNoProgress) {
          console.log(`[handleManualSync] Job has no synced items after ${minutesSinceUpdate.toFixed(1)}min (chunk ${existingJob.current_chunk}), marking as failed: ${existingJob.job_id}`)
          await supabase
            .from("sync_jobs")
            .update({ status: "failed", error_log: { reason: `No items synced after ${minutesSinceUpdate.toFixed(1)} minutes` } })
            .eq("job_id", existingJob.job_id)
          // Don't set hasActiveJob - will create new job
        } else if (hasSyncedItems || heartbeatAge < 5 * 60 * 1000) {
          console.log(`[handleManualSync] Active job found: ${existingJob.job_id} (${minutesSinceUpdate.toFixed(1)} minutes old, ${existingJob.pokemon_synced} synced, chunk ${existingJob.current_chunk})`)
          hasActiveJob = true
        } else {
          console.log(`[handleManualSync] Job appears stuck: ${existingJob.job_id} (${minutesSinceUpdate.toFixed(1)}min old, ${existingJob.pokemon_synced} synced)`)
          await supabase
            .from("sync_jobs")
            .update({ status: "failed", error_log: { reason: `Stuck - no items synced after ${minutesSinceUpdate.toFixed(1)} minutes` } })
            .eq("job_id", existingJob.job_id)
        }
      }
    }
    
    if (hasActiveJob) {
      // Re-query to get the most recent active job and verify it's actually running
      const { data: activeJob, error: activeJobError } = await supabase
        .from("sync_jobs")
        .select("*")
        .eq("sync_type", "pokepedia")
        .eq("phase", phase)
        .eq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (activeJobError) {
        console.error(`[handleManualSync] Error re-querying active job:`, activeJobError)
        // Continue to create new job if query fails
      } else if (activeJob) {
        // Double-check the job is actually active (not stuck)
        const heartbeatAge = Date.now() - new Date(activeJob.last_heartbeat || activeJob.started_at).getTime()
        const minutesSinceHeartbeat = heartbeatAge / (60 * 1000)
        
        // Check if job has actually synced items (not just processed chunks)
        // A job that processed chunks but synced 0 items is likely stuck
        const hasSyncedItems = activeJob.pokemon_synced > 0
        const hasRecentHeartbeat = heartbeatAge < 5 * 60 * 1000 // Less than 5 minutes
        const isStuck = heartbeatAge > 10 * 60 * 1000 || (!hasSyncedItems && heartbeatAge > 5 * 60 * 1000)
        
        console.log(`[handleManualSync] Active job details:`, {
          job_id: activeJob.job_id,
          age_minutes: minutesSinceHeartbeat.toFixed(1),
          hasSyncedItems,
          synced: activeJob.pokemon_synced,
          chunk: activeJob.current_chunk,
          hasRecentHeartbeat,
          isStuck,
        })
        
        if (!isStuck && hasSyncedItems && hasRecentHeartbeat) {
          // If continueUntilComplete is true (or undefined/defaults to true), continue processing this job instead of returning
          // Default to true for local development (faster completion)
          const shouldContinue = continueUntilComplete !== undefined ? continueUntilComplete === true : true
          if (shouldContinue) {
            console.log(`[handleManualSync] continueUntilComplete=true, continuing to process existing job: ${activeJob.job_id}`)
            // Continue processing chunks of this existing job
            let result = await processChunk(supabase, activeJob)
            let chunksProcessed = 1
            
            const MAX_EXECUTION_TIME_MS = 50 * 1000 // 50 seconds
            const startTime = Date.now()
            
            while (!result.completed && (Date.now() - startTime) < MAX_EXECUTION_TIME_MS) {
              // Refresh job data
              const { data: updatedJob, error: refreshError } = await supabase
                .from("sync_jobs")
                .select("*")
                .eq("job_id", activeJob.job_id)
                .single()
              
              if (refreshError || !updatedJob) {
                console.error(`[handleManualSync] Error refreshing job:`, refreshError)
                break
              }
              
              // Check if job is complete
              if (updatedJob.status !== "running" || 
                  (updatedJob.total_chunks > 0 && updatedJob.current_chunk >= updatedJob.total_chunks)) {
                console.log(`[handleManualSync] Job completed or status changed`)
                break
              }
              
              // Process next chunk
              result = await processChunk(supabase, updatedJob)
              chunksProcessed++
              
              console.log(`[handleManualSync] Chunk ${chunksProcessed} processed:`, result)
              
              if (result.completed) {
                console.log(`[handleManualSync] Job completed after ${chunksProcessed} chunks`)
                break
              }
              
              // Small delay between chunks
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
            
            const elapsedTime = Date.now() - startTime
            console.log(`[handleManualSync] Processed ${chunksProcessed} chunks in ${elapsedTime}ms`)
            
            return new Response(
              JSON.stringify({
                success: true,
                job_id: activeJob.job_id,
                message: result.completed 
                  ? `Sync job completed (${chunksProcessed} chunks processed)`
                  : `Sync job in progress (${chunksProcessed} chunks processed, will continue via cron)`,
                chunksProcessed,
                result,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            )
          }
          
          console.log(`[handleManualSync] Returning existing active job: ${activeJob.job_id}`)
          return new Response(
            JSON.stringify({
              success: true,
              job_id: activeJob.job_id,
              message: "Sync job already running",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        } else {
          const reason = !hasSyncedItems 
            ? `No items synced after ${minutesSinceHeartbeat.toFixed(1)} minutes (chunk ${activeJob.current_chunk}) - creating replacement`
            : `Stuck job (${minutesSinceHeartbeat.toFixed(1)}min old, no recent heartbeat) - creating replacement`
          console.log(`[handleManualSync] Job is stuck, marking as failed: ${activeJob.job_id} - ${reason}`)
          await supabase
            .from("sync_jobs")
            .update({ status: "failed", error_log: { reason } })
            .eq("job_id", activeJob.job_id)
          // Continue to create new job
        }
      } else {
        console.log(`[handleManualSync] No active job found on re-query, proceeding to create new job`)
        // Continue to create new job
      }
    }
  } else {
    console.log(`[handleManualSync] No existing jobs found for phase: ${phase}`)
  }

  console.log(`[handleManualSync] Creating new sync job for phase: ${phase}`)
  
  // Create sync job (chunks calculated dynamically based on resource count)
  const jobData = {
    job_type: "full",
    sync_type: "pokepedia",
    phase,
    status: "running",
    triggered_by: "manual",
    current_chunk: 0,
    total_chunks: 0, // Will be calculated during sync
    chunk_size: priority === "critical" ? 20 : 100, // Optimized: increased chunk sizes for faster processing
    start_id: 0,
    end_id: 0,
    pokemon_synced: 0,
    pokemon_failed: 0,
    priority,
    config: { priority },
  }
  
  console.log("[handleManualSync] Attempting to create job with data:", JSON.stringify(jobData, null, 2))
  
  const { data: job, error } = await supabase
    .from("sync_jobs")
    .insert(jobData)
    .select()
    .single()

  if (error) {
    console.error("[handleManualSync] Error creating job:", {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: JSON.stringify(error, null, 2),
    })
    return new Response(
      JSON.stringify({ error: error.message, code: error.code, details: error.details }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
  
  if (!job) {
    console.error("[handleManualSync] Job creation returned no data but no error")
    return new Response(
      JSON.stringify({ error: "Job creation failed: no data returned" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
  
  console.log("[handleManualSync] Job created successfully:", {
    job_id: job.job_id,
    phase: job.phase,
    status: job.status,
  })

  console.log(`[handleManualSync] Job created: ${job.job_id}, processing first chunk...`)
  
  // Process first chunk immediately
  let result = await processChunk(supabase, job)
  let chunksProcessed = 1
  
  console.log(`[handleManualSync] First chunk processed:`, result)

  // If continueUntilComplete is true, continue processing chunks until complete
  // But respect Edge Function timeout limits (max 50 seconds to leave buffer)
  const MAX_EXECUTION_TIME_MS = 50 * 1000 // 50 seconds
  const startTime = Date.now()
  
  if (continueUntilComplete && !result.completed) {
    console.log(`[handleManualSync] Continuing to process remaining chunks...`)
    
      while (!result.completed && (Date.now() - startTime) < MAX_EXECUTION_TIME_MS) {
        // Refresh job data to get updated current_chunk
        const { data: updatedJob, error: refreshError } = await supabase
          .from("sync_jobs")
          .select("*")
          .eq("job_id", job.job_id)
          .single()
        
        if (refreshError || !updatedJob) {
          console.error(`[handleManualSync] Error refreshing job:`, refreshError)
          break
        }
        
        // Check if job is complete
        if (updatedJob.status !== "running" || 
            (updatedJob.total_chunks > 0 && updatedJob.current_chunk >= updatedJob.total_chunks)) {
          console.log(`[handleManualSync] Job completed or status changed`)
          break
        }
        
        // Update heartbeat periodically to prevent "stuck" detection during long runs
        if (chunksProcessed % 10 === 0) {
          await supabase
            .from("sync_jobs")
            .update({ last_heartbeat: new Date().toISOString() })
            .eq("job_id", job.job_id)
          console.log(`[handleManualSync] Updated heartbeat after ${chunksProcessed} chunks`)
        }
        
        // Process next chunk
        result = await processChunk(supabase, updatedJob)
        chunksProcessed++
        
        console.log(`[handleManualSync] Chunk ${chunksProcessed} processed:`, result)
        
        // Memory cleanup after chunk processing
        cleanupMemory(result, updatedJob)
        
        if (result.completed) {
          console.log(`[handleManualSync] Job completed after ${chunksProcessed} chunks`)
          break
        }
        
        // Delay between chunks to avoid rate limiting and reduce memory pressure
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
        
        // Force garbage collection hint every 20 chunks (Deno will handle if possible)
        if (chunksProcessed % 20 === 0) {
          console.log(`[handleManualSync] Processed ${chunksProcessed} chunks, memory cleanup hint`)
          // Deno doesn't expose explicit GC, but we can help by clearing references
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }
    
    const elapsedTime = Date.now() - startTime
    console.log(`[handleManualSync] Processed ${chunksProcessed} chunks in ${elapsedTime}ms`)
    
    if (!result.completed && (Date.now() - startTime) >= MAX_EXECUTION_TIME_MS) {
      console.log(`[handleManualSync] Timeout reached, job will continue via cron`)
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      job_id: job.job_id,
      message: continueUntilComplete && result.completed 
        ? `Sync job completed (${chunksProcessed} chunks processed)`
        : continueUntilComplete
        ? `Sync job in progress (${chunksProcessed} chunks processed, will continue via cron)`
        : "Sync job created and first chunk processed",
      chunksProcessed,
      result,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}

async function processNextChunk(supabase: any) {
  // Find active sync job (prioritize critical jobs)
  const { data: jobs, error } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("status", "running")
    .eq("sync_type", "pokepedia")
    .order("priority", { ascending: true, nullsFirst: false })
    .order("started_at", { ascending: true })
    .limit(1)

  if (error || !jobs || jobs.length === 0) {
    return new Response(
      JSON.stringify({ message: "No active sync jobs" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  const job = jobs[0] as SyncJob

  // Check if job is stuck
  const heartbeatAge = Date.now() - new Date(job.last_heartbeat || job.started_at).getTime()
  if (heartbeatAge > 10 * 60 * 1000) {
    await supabase
      .from("sync_jobs")
      .update({ status: "failed", error_log: { reason: "Stuck job detected" } })
      .eq("job_id", job.job_id)

    return new Response(
      JSON.stringify({ message: "Stuck job detected and marked as failed" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  // Process chunk
  const result = await processChunk(supabase, job)

  return new Response(
    JSON.stringify({
      success: true,
      job_id: job.job_id,
      chunk: job.current_chunk + 1,
      result,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}

async function processChunk(supabase: any, job: SyncJob) {
  // Process chunk based on phase
  let synced = 0
  let errors = 0

  switch (job.phase) {
    case "master":
      const masterResult = await syncMasterDataPhase(supabase, job)
      synced = masterResult.synced
      errors = masterResult.errors
      break
    case "reference":
      const refResult = await syncReferenceDataPhase(supabase, job)
      synced = refResult.synced
      errors = refResult.errors
      break
    case "species":
      const speciesResult = await syncSpeciesPhase(supabase, job)
      synced = speciesResult.synced
      errors = speciesResult.errors
      break
    case "pokemon":
      const pokemonResult = await syncPokemonPhase(supabase, job)
      synced = pokemonResult.synced
      errors = pokemonResult.errors
      break
    case "relationships":
      const relResult = await syncRelationshipsPhase(supabase, job)
      synced = relResult.synced
      errors = relResult.errors
      break
    default:
      return { error: `Unknown phase: ${job.phase}` }
  }

  // Update job progress
  const newCurrent = job.current_chunk + 1
  const newSynced = job.pokemon_synced + synced
  const newFailed = job.pokemon_failed + errors
  // Calculate progress: if total_chunks is set, use it; otherwise try to calculate from synced items
  let progress = 0
  if (job.total_chunks > 0) {
    progress = Math.min((newCurrent / job.total_chunks) * 100, 100)
  } else if (job.end_id > 0) {
    // Fallback: estimate progress from synced items vs expected total
    progress = Math.min((newSynced / job.end_id) * 100, 100)
  }

  const updateData = {
    current_chunk: newCurrent,
    pokemon_synced: newSynced,
    pokemon_failed: newFailed,
    progress_percent: progress,
    last_heartbeat: new Date().toISOString(),
  }
  
  console.log(`[processChunk] Updating job ${job.job_id}:`, updateData)
  
  const { data: updatedJob, error: updateError } = await supabase
    .from("sync_jobs")
    .update(updateData)
    .eq("job_id", job.job_id)
    .select()
    .single()
  
  if (updateError) {
    console.error(`[processChunk] Error updating job:`, {
      error: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
      job_id: job.job_id,
      fullError: JSON.stringify(updateError, null, 2),
    })
  } else if (!updatedJob) {
    console.warn(`[processChunk] Job update returned no data but no error for job_id: ${job.job_id}`)
  } else {
    console.log(`[processChunk] Job updated successfully:`, {
      job_id: updatedJob.job_id,
      current_chunk: updatedJob.current_chunk,
      pokemon_synced: updatedJob.pokemon_synced,
    })
  }

  // Broadcast progress via Realtime
  await supabase.channel("sync:status").send({
    type: "broadcast",
    event: "sync_progress",
    payload: {
      job_id: job.job_id,
      phase: job.phase,
      current: newSynced,
      total: job.total_chunks * job.chunk_size,
      progress_percent: progress,
    },
  })

  // Check if job is complete
  if (newCurrent >= job.total_chunks && job.total_chunks > 0) {
    await supabase
      .from("sync_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        progress_percent: 100,
      })
      .eq("job_id", job.job_id)

    await supabase.channel("sync:status").send({
      type: "broadcast",
      event: "sync_complete",
      payload: { job_id: job.job_id, phase: job.phase },
    })

    return { completed: true, message: "Sync job completed", synced, errors }
  }

  return { synced, errors, chunk: newCurrent }
}

// ============================================================================
// PHASE 1: Master Data Sync (Types, Abilities, Moves, Stats, etc.)
// ============================================================================

async function syncMasterDataPhase(supabase: any, job: SyncJob) {
  console.log(`[syncMasterDataPhase] Starting master data sync, chunk: ${job.current_chunk}`)
  
  // Order matters: types must be synced first (moves depend on types)
  // Group 1: No dependencies (types, stats, egg-groups, growth-rates)
  // Group 2: Depend on group 1 (abilities depend on generations, moves depend on types)
  const masterEndpointsGroup1 = [
    { endpoint: "type", table: "types", idField: "type_id", dependencies: [] },
    { endpoint: "stat", table: "stats", idField: "stat_id", dependencies: [] },
    { endpoint: "egg-group", table: "egg_groups", idField: "egg_group_id", dependencies: [] },
    { endpoint: "growth-rate", table: "growth_rates", idField: "growth_rate_id", dependencies: [] },
  ]
  
  const masterEndpointsGroup2 = [
    { endpoint: "ability", table: "abilities", idField: "ability_id", dependencies: [] }, // Abilities don't strictly need types, but safer to sync after
    { endpoint: "move", table: "moves", idField: "move_id", dependencies: ["types"] }, // Moves depend on types
  ]

  let totalSynced = 0
  let totalErrors = 0
  
  console.log(`[syncMasterDataPhase] Processing master data endpoints (Group 1: ${masterEndpointsGroup1.length}, Group 2: ${masterEndpointsGroup2.length})`)

  // If first chunk, fetch resource lists and calculate total chunks
  if (job.current_chunk === 0 && job.total_chunks === 0) {
    let maxCount = 0
    const endpointCounts: Record<string, number> = {}
    
    for (const { endpoint } of [...masterEndpointsGroup1, ...masterEndpointsGroup2]) {
      try {
        const listResponse = await fetch(`${POKEAPI_BASE_URL}/${endpoint}/?limit=1000`)
        if (listResponse.ok) {
          const listData: ResourceList = await listResponse.json()
          const count = listData.count || 0
          endpointCounts[endpoint] = count
          maxCount = Math.max(maxCount, count)
          console.log(`[Master] Found ${count} ${endpoint} resources`)
        }
      } catch (error) {
        console.error(`[Master] Error fetching ${endpoint} list:`, error)
      }
    }
    
    // Calculate total_chunks based on the endpoint with the most resources
    // Master phase processes all endpoints per chunk, so we use max count
    if (maxCount > 0) {
      const totalChunks = Math.ceil(maxCount / job.chunk_size)
      console.log(`[Master] Calculating total_chunks: maxCount=${maxCount}, chunk_size=${job.chunk_size}, total_chunks=${totalChunks}`)
      console.log(`[Master] Endpoint counts:`, endpointCounts)
      
      await supabase
        .from("sync_jobs")
        .update({ total_chunks: totalChunks, end_id: maxCount })
        .eq("job_id", job.job_id)
      
      // Refresh job data to get updated total_chunks
      const { data: updatedJob } = await supabase
        .from("sync_jobs")
        .select("*")
        .eq("job_id", job.job_id)
        .single()
      
      if (updatedJob) {
        Object.assign(job, updatedJob)
        console.log(`[Master] Updated job with total_chunks: ${updatedJob.total_chunks}`)
      }
    } else {
      console.warn(`[Master] Could not determine total_chunks - no resource counts available`)
    }
  }

  // Process each master data type in batches
  const batchStart = job.current_chunk * job.chunk_size
  const batchEnd = batchStart + job.chunk_size

  // Sync Group 1 first (types, stats, etc.) - these have no dependencies
  // OPTIMIZATION: Process Group 1 endpoints in parallel since they have no dependencies
  console.log(`[syncMasterDataPhase] Syncing Group 1 (no dependencies) in parallel...`)
  const group1Results = await Promise.allSettled(
    masterEndpointsGroup1.map(async ({ endpoint, table, idField }) => {
    try {
      // Fetch resource list with pagination
      const listResponse = await fetch(`${POKEAPI_BASE_URL}/${endpoint}/?limit=1000`)
      if (!listResponse.ok) return

      const listData: ResourceList = await listResponse.json()
      const resources = listData.results.slice(batchStart, batchEnd)

      // Fetch details in parallel batches
      const batches = chunkArray(resources, CONCURRENT_REQUESTS)
      
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (resource) => {
            return await fetchWithRetry(resource.url)
          })
        )

        const successful = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map((r) => r.value)

        // Batch insert to Supabase
        if (successful.length > 0) {
          const records = successful.map((data) => {
            const baseRecord = {
              [idField]: data.id || extractIdFromUrl(data.url),
              name: data.name,
              ...extractMasterDataFields(data, endpoint),
              updated_at: new Date().toISOString(),
            }
            
            // For moves, validate type_id exists before including it
            if (endpoint === "move" && baseRecord.type_id) {
              // We'll validate this after Group 1 is synced
              return baseRecord
            }
            
            return baseRecord
          })

          const { data: upsertData, error } = await supabase
            .from(table)
            .upsert(records, { onConflict: idField })
            .select()

          if (error) {
            console.error(`[Master] Error upserting ${table}:`, error)
            console.error(`[Master] Error details:`, JSON.stringify(error, null, 2))
            // For FK errors, try to continue with valid records
            if (error.code === "23503") {
              console.log(`[Master] FK constraint violation for ${table}, some records may be skipped`)
              // Count as partial success - some records might have succeeded
              totalSynced += Math.max(0, successful.length - 1)
              totalErrors += 1
            } else {
              totalErrors += successful.length
            }
          } else {
            const upsertedCount = upsertData?.length || records.length
            totalSynced += upsertedCount
            console.log(`[Master] Successfully synced ${upsertedCount}/${records.length} ${endpoint} records to ${table}`)
            // Removed verification query for performance (upsert is reliable)
          }
        }

        totalErrors += results.filter((r) => r.status === "rejected").length
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
    } catch (error) {
      console.error(`[Master] Error syncing ${endpoint}:`, error)
      totalErrors++
    }
    })
  )

  // Sync Group 2 (moves, abilities) after Group 1 is complete
  // This ensures dependencies (like types) exist before syncing dependent data
  console.log(`[syncMasterDataPhase] Syncing Group 2 (dependencies)...`)
  for (const { endpoint, table, idField, dependencies } of masterEndpointsGroup2) {
    try {
      // Fetch resource list with pagination
      const listResponse = await fetch(`${POKEAPI_BASE_URL}/${endpoint}/?limit=1000`)
      if (!listResponse.ok) continue

      const listData: ResourceList = await listResponse.json()
      const resources = listData.results.slice(batchStart, batchEnd)

      // Fetch details in parallel batches
      const batches = chunkArray(resources, CONCURRENT_REQUESTS)
      
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (resource) => {
            return await fetchWithRetry(resource.url)
          })
        )

        const successful = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map((r) => r.value)

        // Batch insert to Supabase with FK validation
        if (successful.length > 0) {
          const records = successful.map((data) => {
            const baseRecord = {
              [idField]: data.id || extractIdFromUrl(data.url),
              name: data.name,
              ...extractMasterDataFields(data, endpoint),
              updated_at: new Date().toISOString(),
            }
            
            // For moves, validate type_id exists before including it
            if (endpoint === "move" && baseRecord.type_id) {
              // We'll filter invalid FKs after fetching
              return baseRecord
            }
            
            return baseRecord
          })

          // For moves, validate type_id exists (batch check for efficiency)
          if (endpoint === "move") {
            // Get all unique type_ids from moves
            const typeIds = [...new Set(records.map(r => r.type_id).filter(Boolean))]
            
            // Batch check which types exist
            let existingTypeIds = new Set<number>()
            if (typeIds.length > 0) {
              const { data: existingTypes } = await supabase
                .from("types")
                .select("type_id")
                .in("type_id", typeIds)
              
              if (existingTypes) {
                existingTypeIds = new Set(existingTypes.map(t => t.type_id))
              }
            }
            
            // Filter records to only include moves with valid type_ids
            const validRecords = records.filter(record => {
              if (!record.type_id) {
                return true // No type_id is valid
              }
              if (existingTypeIds.has(record.type_id)) {
                return true
              } else {
                console.warn(`[Master] Move ${record.move_id} references non-existent type_id ${record.type_id}, skipping`)
                totalErrors++
                return false
              }
            })
            
            if (validRecords.length > 0) {
              const { error } = await supabase
                .from(table)
                .upsert(validRecords, { onConflict: idField })

              if (error) {
                console.error(`[Master] Error upserting ${table}:`, error)
                if (error.code === "23503") {
                  // FK error - some records might have invalid FKs we missed
                  console.log(`[Master] FK constraint violation for ${table}, retrying with stricter validation`)
                  totalErrors += validRecords.length
                } else {
                  totalErrors += validRecords.length
                }
              } else {
                totalSynced += validRecords.length
                console.log(`[Master] Successfully synced ${validRecords.length}/${records.length} ${endpoint} records`)
              }
            } else {
              console.warn(`[Master] No valid ${endpoint} records to sync (all had invalid FKs)`)
            }
          } else {
            // For other endpoints, insert normally
            const { error } = await supabase
              .from(table)
              .upsert(records, { onConflict: idField })

            if (error) {
              console.error(`[Master] Error upserting ${table}:`, error)
              if (error.code === "23503") {
                console.log(`[Master] FK constraint violation for ${table}, some records may be skipped`)
                totalErrors += successful.length
              } else {
                totalErrors += successful.length
              }
            } else {
              totalSynced += successful.length
              console.log(`[Master] Successfully synced ${successful.length} ${endpoint} records`)
            }
          }
        }

        totalErrors += results.filter((r) => r.status === "rejected").length
        
        // Memory cleanup after batch processing
        cleanupMemory(results, successful)
        
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
      
      // Additional cleanup after endpoint processing
      cleanupMemory(listData, resources, batches)
    } catch (error) {
      console.error(`[Master] Error syncing ${endpoint}:`, error)
      totalErrors++
    }
  }

  console.log(`[syncMasterDataPhase] Master data sync complete: ${totalSynced} synced, ${totalErrors} errors`)
  return { synced: totalSynced, errors: totalErrors }
}

// ============================================================================
// PHASE 2: Reference Data Sync (Generations, Colors, Habitats, Shapes)
// ============================================================================

async function syncReferenceDataPhase(supabase: any, job: SyncJob) {
  const referenceEndpoints = [
    { endpoint: "generation", table: "generations", idField: "generation_id" },
    { endpoint: "pokemon-color", table: "pokemon_colors", idField: "color_id" },
    { endpoint: "pokemon-habitat", table: "pokemon_habitats", idField: "habitat_id" },
    { endpoint: "pokemon-shape", table: "pokemon_shapes", idField: "shape_id" },
  ]

  let totalSynced = 0
  let totalErrors = 0

  const batchStart = job.current_chunk * job.chunk_size
  const batchEnd = batchStart + job.chunk_size

  for (const { endpoint, table, idField } of referenceEndpoints) {
    try {
      const listResponse = await fetch(`${POKEAPI_BASE_URL}/${endpoint}/?limit=1000`)
      if (!listResponse.ok) continue

      const listData: ResourceList = await listResponse.json()
      const resources = listData.results.slice(batchStart, batchEnd)

      const batches = chunkArray(resources, CONCURRENT_REQUESTS)

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (resource) => {
            return await fetchWithRetry(resource.url)
          })
        )

        const successful = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map((r) => r.value)

        if (successful.length > 0) {
          const records = successful.map((data) => ({
            [idField]: data.id || extractIdFromUrl(data.url),
            name: data.name,
            ...extractReferenceDataFields(data, endpoint),
            updated_at: new Date().toISOString(),
          }))

          const { error } = await supabase
            .from(table)
            .upsert(records, { onConflict: idField })

          if (error) {
            console.error(`[Reference] Error upserting ${table}:`, error)
            totalErrors += successful.length
          } else {
            totalSynced += successful.length
          }
        }

        totalErrors += results.filter((r) => r.status === "rejected").length
        
        // Memory cleanup after batch processing
        cleanupMemory(results, successful)
        
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
      
      // Additional cleanup after endpoint processing
      cleanupMemory(listData, resources, batches)
    } catch (error) {
      console.error(`[Reference] Error syncing ${endpoint}:`, error)
      totalErrors++
    }
  }

  return { synced: totalSynced, errors: totalErrors }
}

// ============================================================================
// PHASE 3: Species Sync (Depends on reference data)
// ============================================================================

async function syncSpeciesPhase(supabase: any, job: SyncJob) {
  let totalSynced = 0
  let totalErrors = 0

  // Fetch species list
  const listResponse = await fetch(`${POKEAPI_BASE_URL}/pokemon-species/?limit=1000`)
  if (!listResponse.ok) {
    return { synced: 0, errors: 1 }
  }

  const listData: ResourceList = await listResponse.json()

  // Update total chunks if first run
  if (job.current_chunk === 0 && job.total_chunks === 0) {
    const totalChunks = Math.ceil(listData.count / job.chunk_size)
    await supabase
      .from("sync_jobs")
      .update({ total_chunks: totalChunks, end_id: listData.count })
      .eq("job_id", job.job_id)
  }

  const batchStart = job.current_chunk * job.chunk_size
  const batchEnd = Math.min(batchStart + job.chunk_size, listData.results.length)
  const resources = listData.results.slice(batchStart, batchEnd)

  const batches = chunkArray(resources, CONCURRENT_REQUESTS)

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (resource) => {
        const detailResponse = await fetch(resource.url)
        if (!detailResponse.ok) throw new Error(`Failed to fetch ${resource.url}`)
        const speciesData = await detailResponse.json()

        // Validate foreign keys exist
        const generationId = extractIdFromUrl(speciesData.generation?.url)
        const colorId = extractIdFromUrl(speciesData.color?.url)
        const shapeId = extractIdFromUrl(speciesData.shape?.url)
        const habitatId = extractIdFromUrl(speciesData.habitat?.url)
        const growthRateId = extractIdFromUrl(speciesData.growth_rate?.url)

        // Check FKs exist (only check if not null)
        const fkChecks = await Promise.all([
          generationId ? checkFKExists(supabase, "generations", "generation_id", generationId) : Promise.resolve(true),
          colorId ? checkFKExists(supabase, "pokemon_colors", "color_id", colorId) : Promise.resolve(true),
          shapeId ? checkFKExists(supabase, "pokemon_shapes", "shape_id", shapeId) : Promise.resolve(true),
          habitatId ? checkFKExists(supabase, "pokemon_habitats", "habitat_id", habitatId) : Promise.resolve(true),
          growthRateId ? checkFKExists(supabase, "growth_rates", "growth_rate_id", growthRateId) : Promise.resolve(true),
        ])

        // Only use FKs that exist
        return {
          ...speciesData,
          _validGenerationId: fkChecks[0] ? generationId : null,
          _validColorId: fkChecks[1] ? colorId : null,
          _validShapeId: fkChecks[2] ? shapeId : null,
          _validHabitatId: fkChecks[3] ? habitatId : null,
          _validGrowthRateId: fkChecks[4] ? growthRateId : null,
        }
      })
    )

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value)

    if (successful.length > 0) {
      const records = successful.map((data) => ({
        species_id: data.id,
        name: data.name,
        order: data.order,
        gender_rate: data.gender_rate,
        capture_rate: data.capture_rate,
        base_happiness: data.base_happiness,
        is_baby: data.is_baby || false,
        is_legendary: data.is_legendary || false,
        is_mythical: data.is_mythical || false,
        hatch_counter: data.hatch_counter,
        has_gender_differences: data.has_gender_differences || false,
        forms_switchable: data.forms_switchable || false,
        growth_rate_id: data._validGrowthRateId,
        habitat_id: data._validHabitatId,
        generation_id: data._validGenerationId,
        evolution_chain_id: extractIdFromUrl(data.evolution_chain?.url),
        color_id: data._validColorId,
        shape_id: data._validShapeId,
        egg_groups: data.egg_groups || [],
        flavor_text_entries: data.flavor_text_entries || [],
        form_descriptions: data.form_descriptions || [],
        genera: data.genera || [],
        names: data.names || [],
        pal_park_encounters: data.pal_park_encounters || [],
        pokedex_numbers: data.pokedex_numbers || [],
        varieties: data.varieties || [],
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from("pokemon_species")
        .upsert(records, { onConflict: "species_id" })

      if (error) {
        console.error(`[Species] Error upserting:`, error)
        totalErrors += successful.length
      } else {
        totalSynced += successful.length
      }
    }

    totalErrors += results.filter((r) => r.status === "rejected").length
    
    // Memory cleanup after batch processing
    cleanupMemory(results, successful, records)
    
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
  }
  
  // Additional cleanup
  cleanupMemory(listData, resources, batches)

  return { synced: totalSynced, errors: totalErrors }
}

// ============================================================================
// PHASE 4: Pokemon Sync (Depends on species)
// ============================================================================

async function syncPokemonPhase(supabase: any, job: SyncJob) {
  let totalSynced = 0
  let totalErrors = 0

  // Fetch Pokemon list
  const listResponse = await fetch(`${POKEAPI_BASE_URL}/pokemon/?limit=1000`)
  if (!listResponse.ok) {
    return { synced: 0, errors: 1 }
  }

  const listData: ResourceList = await listResponse.json()

  // Update total chunks if first run
  if (job.current_chunk === 0 && job.total_chunks === 0) {
    const totalChunks = Math.ceil(listData.count / job.chunk_size)
    await supabase
      .from("sync_jobs")
      .update({ total_chunks: totalChunks, end_id: listData.count })
      .eq("job_id", job.job_id)
  }

  const batchStart = job.current_chunk * job.chunk_size
  const batchEnd = Math.min(batchStart + job.chunk_size, listData.results.length)
  const resources = listData.results.slice(batchStart, batchEnd)

  const batches = chunkArray(resources, CONCURRENT_REQUESTS)

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (resource) => {
        const detailResponse = await fetch(resource.url)
        if (!detailResponse.ok) throw new Error(`Failed to fetch ${resource.url}`)
        return await detailResponse.json()
      })
    )

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value)

    if (successful.length > 0) {
      const records = successful.map((pokemon) => {
        const speciesId = extractIdFromUrl(pokemon.species?.url)
        
        return {
          pokemon_id: pokemon.id,
          name: pokemon.name,
          base_experience: pokemon.base_experience,
          height: pokemon.height,
          weight: pokemon.weight,
          order: pokemon.order,
          is_default: pokemon.is_default,
          location_area_encounters: pokemon.location_area_encounters,
          sprites: pokemon.sprites,
          cries: pokemon.cries,
          past_types: pokemon.past_types,
          past_abilities: pokemon.past_abilities,
          game_indices: pokemon.game_indices,
          forms: pokemon.forms,
          species_id: speciesId,
          updated_at: new Date().toISOString(),
        }
      })

      const { error } = await supabase
        .from("pokemon_comprehensive")
        .upsert(records, { onConflict: "pokemon_id" })

      if (error) {
        console.error(`[Pokemon] Error upserting:`, error)
        totalErrors += successful.length
      } else {
        totalSynced += successful.length
      }
    }

    totalErrors += results.filter((r) => r.status === "rejected").length
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
  }

  return { synced: totalSynced, errors: totalErrors }
}

// ============================================================================
// PHASE 5: Relationships Sync (Types, Abilities, Stats)
// ============================================================================

async function syncRelationshipsPhase(supabase: any, job: SyncJob) {
  let totalSynced = 0
  let totalErrors = 0

  // Fetch Pokemon list
  const listResponse = await fetch(`${POKEAPI_BASE_URL}/pokemon/?limit=1000`)
  if (!listResponse.ok) {
    return { synced: 0, errors: 1 }
  }

  const listData: ResourceList = await listResponse.json()

  if (job.current_chunk === 0 && job.total_chunks === 0) {
    const totalChunks = Math.ceil(listData.count / job.chunk_size)
    await supabase
      .from("sync_jobs")
      .update({ total_chunks: totalChunks, end_id: listData.count })
      .eq("job_id", job.job_id)
  }

  const batchStart = job.current_chunk * job.chunk_size
  const batchEnd = Math.min(batchStart + job.chunk_size, listData.results.length)
  const resources = listData.results.slice(batchStart, batchEnd)

  const batches = chunkArray(resources, CONCURRENT_REQUESTS)

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (resource) => {
        const detailResponse = await fetch(resource.url)
        if (!detailResponse.ok) throw new Error(`Failed to fetch ${resource.url}`)
        return await detailResponse.json()
      })
    )

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value)

    for (const pokemon of successful) {
      try {
        // Sync types
        const typeRecords = (pokemon.types || []).map((t: any) => ({
          pokemon_id: pokemon.id,
          type_id: extractIdFromUrl(t.type?.url),
          slot: t.slot,
        })).filter((r: any) => r.type_id)

        if (typeRecords.length > 0) {
          await supabase
            .from("pokemon_types")
            .upsert(typeRecords, { onConflict: "pokemon_id,type_id,slot" })
        }

        // Sync abilities
        const abilityRecords = (pokemon.abilities || []).map((a: any) => ({
          pokemon_id: pokemon.id,
          ability_id: extractIdFromUrl(a.ability?.url),
          is_hidden: a.is_hidden,
          slot: a.slot,
        })).filter((r: any) => r.ability_id)

        if (abilityRecords.length > 0) {
          await supabase
            .from("pokemon_abilities")
            .upsert(abilityRecords, { onConflict: "pokemon_id,ability_id,slot" })
        }

        // Sync stats
        const statRecords = (pokemon.stats || []).map((s: any) => ({
          pokemon_id: pokemon.id,
          stat_id: extractIdFromUrl(s.stat?.url),
          base_stat: s.base_stat,
          effort: s.effort,
        })).filter((r: any) => r.stat_id)

        if (statRecords.length > 0) {
          await supabase
            .from("pokemon_stats")
            .upsert(statRecords, { onConflict: "pokemon_id,stat_id" })
        }

        totalSynced++
      } catch (error) {
        console.error(`[Relationships] Error syncing Pokemon ${pokemon.id}:`, error)
        totalErrors++
      }
    }

    totalErrors += results.filter((r) => r.status === "rejected").length
    
    // Memory cleanup after batch processing
    cleanupMemory(results, successful)
    
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
  }
  
  // Additional cleanup
  cleanupMemory(listData, resources, batches)

  return { synced: totalSynced, errors: totalErrors }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_BASE_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error("Retry failed")
}

/**
 * Fetch with retry logic and memory-efficient response handling
 */
async function fetchWithRetry(url: string): Promise<any> {
  return await retryWithBackoff(async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    return data
  })
}

/**
 * Clean up memory by explicitly nulling large objects
 */
function cleanupMemory(...objects: any[]): void {
  for (const obj of objects) {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        try {
          delete obj[key]
        } catch {
          // Ignore errors during cleanup
        }
      })
    }
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

function extractIdFromUrl(url: string | undefined): number | null {
  if (!url) return null
  const match = url.match(/\/(\d+)\/?$/)
  return match ? parseInt(match[1]) : null
}

async function checkFKExists(
  supabase: any,
  table: string,
  idField: string,
  id: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select(idField)
    .eq(idField, id)
    .single()

  return !error && !!data
}

function extractMasterDataFields(data: any, endpoint: string): Record<string, any> {
  const fields: Record<string, any> = {}

  switch (endpoint) {
    case "type":
      fields.damage_relations = data.damage_relations
      fields.game_indices = data.game_indices
      fields.generation_id = extractIdFromUrl(data.generation?.url)
      fields.move_damage_class_id = extractIdFromUrl(data.move_damage_class?.url)
      break
    case "ability":
      fields.is_main_series = data.is_main_series || true
      fields.effect_entries = data.effect_entries
      fields.flavor_text_entries = data.flavor_text_entries
      fields.generation_id = extractIdFromUrl(data.generation?.url)
      fields.pokemon = data.pokemon
      break
    case "move":
      fields.accuracy = data.accuracy
      fields.effect_chance = data.effect_chance
      fields.pp = data.pp
      fields.priority = data.priority
      fields.power = data.power
      fields.damage_class_id = extractIdFromUrl(data.damage_class?.url)
      fields.type_id = extractIdFromUrl(data.type?.url)
      fields.target_id = extractIdFromUrl(data.target?.url)
      fields.effect_entries = data.effect_entries
      fields.flavor_text_entries = data.flavor_text_entries
      fields.stat_changes = data.stat_changes
      fields.meta = data.meta
      fields.generation_id = extractIdFromUrl(data.generation?.url)
      fields.learned_by_pokemon = data.learned_by_pokemon
      break
    case "stat":
      fields.is_battle_only = data.is_battle_only || false
      fields.game_index = data.game_index
      fields.move_damage_class_id = extractIdFromUrl(data.move_damage_class?.url)
      break
    case "egg-group":
      fields.names = data.names
      fields.pokemon_species = data.pokemon_species
      break
    case "growth-rate":
      fields.formula = data.formula
      fields.descriptions = data.descriptions
      fields.levels = data.levels
      fields.pokemon_species = data.pokemon_species
      break
  }

  return fields
}

function extractReferenceDataFields(data: any, endpoint: string): Record<string, any> {
  const fields: Record<string, any> = {}

  switch (endpoint) {
    case "generation":
      fields.abilities = data.abilities
      fields.main_region_id = extractIdFromUrl(data.main_region?.url)
      fields.moves = data.moves
      fields.pokemon_species = data.pokemon_species
      fields.types = data.types
      fields.version_groups = data.version_groups
      break
    case "pokemon-color":
      fields.names = data.names
      fields.pokemon_species = data.pokemon_species
      break
    case "pokemon-habitat":
      fields.names = data.names
      fields.pokemon_species = data.pokemon_species
      break
    case "pokemon-shape":
      fields.awesome_names = data.awesome_names
      fields.names = data.names
      fields.pokemon_species = data.pokemon_species
      break
  }

  return fields
}
