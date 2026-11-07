/**
 * Bridge Authentication API Endpoint
 * Syncs Supabase user account to Showdown loginserver
 * 
 * POST /api/showdown/sync-account
 */

import { createClient } from '@/lib/supabase/server'
import { syncShowdownAccount } from '@/lib/showdown/sync'
import { legacyShowdownSyncDeniedResponse } from '@/lib/showdown/identity-flags'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  try {
    const denied = legacyShowdownSyncDeniedResponse()
    if (denied) return denied

    // Get authenticated user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    // Legacy parallel loginserver register (not central-account verification)
    const result = await syncShowdownAccount(user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to sync account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      showdown_username: result.showdown_username,
    })
  } catch (error: any) {
    console.error('Error in sync-account endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
