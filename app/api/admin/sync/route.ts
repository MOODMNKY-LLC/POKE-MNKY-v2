import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { resolve } from 'path'

const execAsync = promisify(exec)

interface SyncStatus {
  status: 'idle' | 'running' | 'completed' | 'failed'
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

// In-memory sync status (in production, use Redis or database)
let syncStatus: SyncStatus = {
  status: 'idle',
}

let syncProcess: ReturnType<typeof exec> | null = null

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you may want to add RBAC check here)
    // For now, just check authentication

    // Get current sync status
    return NextResponse.json({
      status: syncStatus.status,
      progress: syncStatus.progress,
      error: syncStatus.error,
      startTime: syncStatus.startTime,
      endTime: syncStatus.endTime,
    })
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

    // Check if sync is already running
    if (syncStatus.status === 'running') {
      return NextResponse.json(
        { 
          error: 'Sync is already running',
          message: `A sync is currently in progress. Started at ${syncStatus.startTime ? new Date(syncStatus.startTime).toLocaleString() : 'unknown'}. Please wait for it to complete or cancel it first.`,
          currentStatus: syncStatus,
        },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { start = 1, end = 1025, batchSize = 50, rateLimitMs = 100 } = body

    // Validate inputs
    if (start < 1 || end > 1025 || start > end) {
      return NextResponse.json(
        { error: 'Invalid range. Start must be >= 1, end must be <= 1025, and start must be <= end' },
        { status: 400 }
      )
    }

    // Reset status
    syncStatus = {
      status: 'running',
      startTime: Date.now(),
      progress: {
        synced: 0,
        skipped: 0,
        failed: 0,
        total: end - start + 1,
        percent: 0,
      },
    }

    // Start sync process
    const scriptPath = resolve(process.cwd(), 'scripts', 'sync-pokemon-data.ts')
    const command = `npx tsx "${scriptPath}" --start ${start} --end ${end} --batchSize ${batchSize} --rateLimitMs ${rateLimitMs}`

    syncProcess = exec(command, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
    })

    // Handle process output (for progress tracking)
    let output = ''
    syncProcess.stdout?.on('data', (data) => {
      const chunk = data.toString()
      output += chunk
      
      // Get the last line (since sync script uses \r to overwrite)
      const lines = output.split('\n')
      const lastLine = lines[lines.length - 1] || output.split('\r').pop() || ''
      
      // Parse progress from output
      // Format: [X/Y] Syncing pokemon-name... (Z%) | ETA: Xm Ys
      // Note: X = synced + skipped + failed (total processed), Y = total
      // Script uses \r to overwrite, so we need to parse the latest line
      const progressMatch = lastLine.match(/\[(\d+)\/(\d+)\].*?\((\d+\.?\d*)%\)/)
      if (progressMatch && syncStatus.status === 'running' && syncStatus.progress) {
        const processed = parseInt(progressMatch[1]) // synced + skipped + failed
        const total = parseInt(progressMatch[2])
        const percent = parseFloat(progressMatch[3])
        
        // Update progress - preserve individual counts if we have them from summary
        // Otherwise, estimate synced = processed (we'll update when summary appears)
        syncStatus.progress = {
          synced: syncStatus.progress.synced !== undefined ? syncStatus.progress.synced : processed,
          skipped: syncStatus.progress.skipped || 0,
          failed: syncStatus.progress.failed || 0,
          total: total,
          percent: percent,
        }
      }
      
      // Parse summary lines (appears during sync and at the end)
      // Format: ✅ Synced: X/Y, ⏭️ Skipped: X/Y, ❌ Failed: X/Y
      const syncedMatch = output.match(/✅ Synced: (\d+)\/(\d+)/)
      const skippedMatch = output.match(/⏭️.*?Skipped: (\d+)\/(\d+)/)
      const failedMatch = output.match(/❌ Failed: (\d+)\/(\d+)/)
      
      // Update progress with actual counts when summary is available
      if (syncedMatch && syncStatus.status === 'running' && syncStatus.progress) {
        const synced = parseInt(syncedMatch[1])
        const skipped = skippedMatch ? parseInt(skippedMatch[1]) : (syncStatus.progress.skipped || 0)
        const failed = failedMatch ? parseInt(failedMatch[1]) : (syncStatus.progress.failed || 0)
        const total = parseInt(syncedMatch[2])
        
        syncStatus.progress = {
          synced,
          skipped,
          failed,
          total,
          percent: syncStatus.progress.percent || (total > 0 ? Math.round(((synced + skipped + failed) / total) * 100) : 0),
        }
      }
    })

    syncProcess.stderr?.on('data', (data) => {
      console.error('[Sync Process] Error:', data.toString())
    })

    syncProcess.on('close', (code) => {
      // Parse final summary from output
      const syncedMatch = output.match(/✅ Synced: (\d+)\/(\d+)/)
      const skippedMatch = output.match(/⏭️.*?Skipped: (\d+)\/(\d+)/)
      const failedMatch = output.match(/❌ Failed: (\d+)\/(\d+)/)
      
      const synced = syncedMatch ? parseInt(syncedMatch[1]) : (syncStatus.progress?.synced || 0)
      const skipped = skippedMatch ? parseInt(skippedMatch[1]) : (syncStatus.progress?.skipped || 0)
      const failed = failedMatch ? parseInt(failedMatch[1]) : (syncStatus.progress?.failed || 0)
      const total = syncedMatch ? parseInt(syncedMatch[2]) : (syncStatus.progress?.total || 0)
      
      if (code === 0) {
        syncStatus = {
          ...syncStatus,
          status: 'completed',
          progress: {
            synced,
            skipped,
            failed,
            total,
            percent: 100,
          },
          endTime: Date.now(),
        }
      } else {
        syncStatus = {
          ...syncStatus,
          status: 'failed',
          error: `Sync process exited with code ${code}`,
          progress: {
            synced,
            skipped,
            failed,
            total,
            percent: total > 0 ? Math.round(((synced + skipped + failed) / total) * 100) : 0,
          },
          endTime: Date.now(),
        }
      }
      syncProcess = null
    })

    syncProcess.on('error', (error) => {
      syncStatus = {
        ...syncStatus,
        status: 'failed',
        error: error.message,
        endTime: Date.now(),
      }
      syncProcess = null
    })

    return NextResponse.json({
      message: 'Sync started',
      status: syncStatus.status,
    })
  } catch (error) {
    console.error('[Sync API] Error starting sync:', error)
    syncStatus = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Internal server error',
      endTime: Date.now(),
    }
    return NextResponse.json(
      { error: syncStatus.error },
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

    // Stop sync if running
    if (syncStatus.status === 'running' && syncProcess) {
      syncProcess.kill('SIGTERM')
      syncStatus = {
        ...syncStatus,
        status: 'failed',
        error: 'Sync cancelled by user',
        endTime: Date.now(),
      }
      syncProcess = null
      return NextResponse.json({ message: 'Sync cancelled' })
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
