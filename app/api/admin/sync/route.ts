import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

interface SyncStatus {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: {
    synced: number
    skipped: number
    failed: number
    total: number
    percent: number
  }
  error?: string
  startTime?: number
  endTime?: number
}

function mapSyncJobToStatus(job: {
  status: string
  pokemon_synced?: number
  pokemon_failed?: number
  progress_percent?: number
  config?: { start?: number; end?: number; totalSkipped?: number }
  started_at?: string
  completed_at?: string
  error_log?: Record<string, unknown>
} | null): SyncStatus {
  if (!job) {
    return { status: 'idle' }
  }

  const config = (job.config ?? {}) as { start?: number; end?: number; totalSkipped?: number }
  const total = config.start != null && config.end != null
    ? config.end - config.start + 1
    : 0
  const synced = job.pokemon_synced ?? 0
  const failed = job.pokemon_failed ?? 0
  const skipped = config.totalSkipped ?? 0

  let status: SyncStatus['status'] = 'idle'
  if (job.status === 'running') status = 'running'
  else if (job.status === 'completed') status = 'completed'
  else if (job.status === 'failed' || job.status === 'cancelled') status = job.status as 'failed' | 'cancelled'
  else status = 'idle'

  const errorMsg = job.error_log && typeof job.error_log === 'object' && 'errors' in job.error_log
    ? (job.error_log.errors as Array<{ error?: string }>)?.[0]?.error
    : undefined

  return {
    status,
    progress: total > 0 ? {
      synced,
      skipped,
      failed,
      total,
      percent: job.progress_percent ?? Math.round(((synced + skipped + failed) / total) * 100),
    } : undefined,
    error: errorMsg,
    startTime: job.started_at ? new Date(job.started_at).getTime() : undefined,
    endTime: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    const serviceSupabase = createServiceRoleClient()

    if (jobId) {
      const { data: job, error } = await serviceSupabase
        .from('sync_jobs')
        .select('status, pokemon_synced, pokemon_failed, progress_percent, config, started_at, completed_at, error_log')
        .eq('job_id', jobId)
        .eq('sync_type', 'pokemon_cache')
        .single()

      if (error || !job) {
        return NextResponse.json(mapSyncJobToStatus(null))
      }
      return NextResponse.json(mapSyncJobToStatus(job))
    }

    const { data: job } = await serviceSupabase
      .from('sync_jobs')
      .select('status, pokemon_synced, pokemon_failed, progress_percent, config, started_at, completed_at, error_log')
      .eq('sync_type', 'pokemon_cache')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json(mapSyncJobToStatus(job))
  } catch (error) {
    console.error('[Sync API] Error getting status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { start = 1, end = 1025, batchSize = 50, rateLimitMs = 100, jobId } = body

    if (start < 1 || end > 1025 || start > end) {
      return NextResponse.json(
        { error: 'Invalid range. Start must be >= 1, end must be <= 1025, and start must be <= end' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const functionUrl = `${supabaseUrl}/functions/v1/sync-pokemon-pokeapi`
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        start,
        end,
        batchSize,
        rateLimitMs,
        jobId: jobId || undefined,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || `Edge Function failed: ${response.statusText}` },
        { status: response.status >= 500 ? 500 : 400 }
      )
    }

    if (data.success === false) {
      return NextResponse.json(
        { error: data.error || 'Sync failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: data.hasMore ? 'Chunk completed, more to process' : 'Sync completed',
      status: data.hasMore ? 'running' : 'completed',
      jobId: data.jobId,
      hasMore: data.hasMore,
      nextStart: data.nextStart,
      progress: data.progress,
      synced: data.synced,
      skipped: data.skipped,
      failed: data.failed,
      totalSynced: data.totalSynced,
      totalSkipped: data.totalSkipped,
      totalFailed: data.totalFailed,
    })
  } catch (error) {
    console.error('[Sync API] Error starting sync:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let jobId: string | undefined
    try {
      const body = await request.json().catch(() => ({}))
      jobId = body?.jobId
    } catch {
      // no body
    }

    if (jobId) {
      const serviceSupabase = createServiceRoleClient()
      const { error } = await serviceSupabase
        .from('sync_jobs')
        .update({ status: 'cancelled' })
        .eq('job_id', jobId)
        .eq('sync_type', 'pokemon_cache')
        .eq('status', 'running')

      if (!error) {
        return NextResponse.json({ message: 'Sync cancelled' })
      }
    }

    return NextResponse.json({ message: 'No sync running' })
  } catch (error) {
    console.error('[Sync API] Error cancelling sync:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
