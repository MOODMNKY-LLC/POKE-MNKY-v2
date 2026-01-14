/**
 * Discord Bot Bridge Authentication API Endpoint
 * Syncs Supabase user account to Showdown loginserver via Discord user ID
 * 
 * POST /api/showdown/sync-account-discord
 * Body: { discord_id: string }
 */

import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateShowdownPassword } from '@/lib/showdown/sync'
import { NextRequest, NextResponse } from 'next/server'

// Internal function to get challenge string (duplicated from sync.ts)
async function getChallengeString(): Promise<string> {
  const showdownServerUrl = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com'
  const wsUrl = showdownServerUrl
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/$/, '') + '/showdown/websocket'

  const WebSocket = (globalThis as any).WebSocket
  if (!WebSocket) {
    throw new Error('WebSocket not available. Node.js 18+ required.')
  }

  return new Promise((resolve, reject) => {
    let resolved = false
    const ws = new WebSocket(wsUrl)
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        ws.close()
        reject(new Error('Timeout waiting for challenge string'))
      }
    }, 10000)

    ws.onopen = () => {}

    ws.onmessage = (event: MessageEvent | { data: Buffer | string }) => {
      if (resolved) return
      const message = typeof event.data === 'string' 
        ? event.data 
        : Buffer.isBuffer(event.data)
        ? event.data.toString('utf-8')
        : String(event.data)
      
      if (message.includes('|challstr|')) {
        const parts = message.split('|')
        const challstrIndex = parts.findIndex(p => p === 'challstr')
        if (challstrIndex !== -1 && parts[challstrIndex + 1]) {
          const challstr = parts.slice(challstrIndex + 1).join('|')
          if (challstr && !resolved) {
            resolved = true
            clearTimeout(timeout)
            ws.close()
            resolve(challstr)
          }
        }
      }
    }

    ws.onerror = (error: Event | Error) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        const errorMsg = error instanceof Error ? error.message : (error as Event).type
        reject(new Error(`WebSocket error: ${errorMsg}`))
      }
    }

    ws.onclose = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        reject(new Error('WebSocket closed before receiving challenge string'))
      }
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    // Get Discord ID from request body
    const body = await request.json()
    const { discord_id } = body

    if (!discord_id) {
      return NextResponse.json(
        { error: 'discord_id is required' },
        { status: 400 }
      )
    }

    // Ensure discord_id is a string (Discord IDs are strings in database)
    const discordId = String(discord_id).trim()

    // Verify service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Showdown Sync] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // Create Supabase client with service role key (bypasses RLS for server-to-server calls)
    const supabase = createServiceRoleClient()
    
    // Test database connection by checking if we can query profiles table at all
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('[Showdown Sync] Database connection test failed:', testError)
      return NextResponse.json(
        {
          success: false,
          error: `Database connection error: ${testError.message}`,
          error_code: testError.code,
          error_details: testError.details
        },
        { status: 500 }
      )
    }
    
    console.log('[Showdown Sync] Database connection test passed, found', testData?.length || 0, 'profiles')
    
    // Test if we can select discord_id column specifically
    // Verifying discord_id column exists in public.profiles table
    const { data: columnTest, error: columnError } = await supabase
      .from('profiles')  // public.profiles table
      .select('discord_id')
      .limit(1)
    
    if (columnError) {
      console.error('[Showdown Sync] Column test failed:', columnError)
      return NextResponse.json(
        {
          success: false,
          error: `Column access error: ${columnError.message}`,
          error_code: columnError.code,
          error_details: columnError.details,
          hint: 'The discord_id column may not exist or may have a different name'
        },
        { status: 500 }
      )
    }
    
    console.log('[Showdown Sync] Column test passed, discord_id column accessible')
    
    // Debug logging
    console.log('[Showdown Sync] Looking up user with discord_id:', {
      discord_id: discordId,
      type: typeof discordId,
      original: discord_id,
      originalType: typeof discord_id
    })
    
    // Find user by Discord ID in profiles table
    // IMPORTANT: Querying public.profiles (NOT auth.users)
    // - public.profiles has discord_id column
    // - auth.users does NOT have discord_id column
    // - email is in auth.users, NOT in public.profiles
    // - .from('profiles') queries public.profiles by default
    // Use maybeSingle() instead of single() to avoid errors when no rows found
    const { data: profile, error: profileError } = await supabase
      .from('profiles')  // Queries public.profiles table (has discord_id column)
      .select('id, discord_id, discord_username, showdown_username')  // email is NOT in profiles table
      .eq('discord_id', discordId)
      .maybeSingle()

    // Enhanced error logging with full details
    if (profileError) {
      const errorDetails = {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        discord_id: discordId,
        // Log the exact query being executed
        query: {
          table: 'profiles',
          columns: ['id', 'discord_id', 'discord_username', 'showdown_username'],  // email not in profiles
          filter: { discord_id: discordId }
        }
      }
      
      console.error('[Showdown Sync] Profile query error (FULL DETAILS):', JSON.stringify(errorDetails, null, 2))
      
      // If there's an actual database error (not just "not found"), return 500 with details
      // PGRST116 = "not found" (expected when user doesn't exist)
      // PGRST301 = JWT expired/invalid
      // 42703 = column does not exist
      // 42P01 = table does not exist
      // 42501 = insufficient privilege
      if (profileError.code !== 'PGRST116') {
        // Return detailed error information for debugging
        return NextResponse.json(
          { 
            success: false,
            error: `Database error while looking up user: ${profileError.message}`,
            error_code: profileError.code,
            error_message: profileError.message,
            error_details: profileError.details,
            error_hint: profileError.hint,
            discord_id: discordId,
            // Always include full error details for debugging
            query_info: {
              table: 'profiles',
              filter_column: 'discord_id',
              filter_value: discordId
            }
          },
          { status: 500 }
        )
      }
    }

    // If not found, try a broader search to see if user exists with different discord_id format
    if (!profile && !profileError) {
      console.log('[Showdown Sync] User not found, checking if any profiles exist with discord_id column')
      const { data: allProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('id, discord_id, discord_username')
        .limit(5)
      
      console.log('[Showdown Sync] Sample profiles check:', {
        found: allProfiles?.length || 0,
        check_error: checkError,
        sample_discord_ids: allProfiles?.map(p => ({ 
          id: p.id, 
          discord_id: p.discord_id, 
          discord_id_type: typeof p.discord_id,
          matches_search: p.discord_id === discordId
        }))
      })
    }

    // Check if profile was found
    if (!profile) {
      // Try alternative query to see if user exists with different format
      const { data: altProfile } = await supabase
        .from('profiles')  // public.profiles table
        .select('id, discord_id, discord_username')
        .eq('discord_id', discordId)
        .maybeSingle()

      console.log('[Showdown Sync] User not found. Alternative query result:', {
        found: !!altProfile,
        profile: altProfile,
        searched_discord_id: discordId
      })

      return NextResponse.json(
        { 
          error: 'User not found. Please link your Discord account in the app first.',
          debug: process.env.NODE_ENV === 'development' ? {
            discord_id: discordId,
            query_error: profileError,
            alternative_query_found: !!altProfile
          } : undefined
        },
        { status: 404 }
      )
    }

    console.log('[Showdown Sync] User found:', {
      id: profile.id,
      discord_id: profile.discord_id,
      discord_username: profile.discord_username
    })

    // Get user email from auth.users using admin API
    // Note: email is NOT in public.profiles table - it's only in auth.users
    // This is the correct way to get email from auth.users table
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    const userEmail = authUser?.user?.email || ''  // email comes from auth.users, not profiles

    // Determine Showdown username (priority: showdown_username > discord_username > email prefix > user ID)
    let showdownUsername: string
    if (profile.showdown_username) {
      showdownUsername = profile.showdown_username
    } else if (profile.discord_username) {
      // Clean Discord username (remove #1234 discriminator if present)
      showdownUsername = profile.discord_username.split('#')[0].slice(0, 18)
    } else if (userEmail) {
      const emailPrefix = userEmail.split('@')[0]
      // Clean email prefix (alphanumeric + underscore only, max 18 chars)
      showdownUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18)
    } else {
      // Final fallback: user ID (max 18 chars for Showdown)
      showdownUsername = profile.id.slice(0, 18)
    }
    
    // Generate deterministic password
    const password = generateShowdownPassword(profile.id)

    // Get challenge string from Showdown server WebSocket
    let challstr: string
    try {
      challstr = await getChallengeString()
    } catch (error: any) {
      console.error('Failed to get challenge string:', error)
      return NextResponse.json({
        success: false,
        error: `Failed to get challenge string: ${error.message}`
      }, { status: 500 })
    }

    // Call loginserver API
    const loginserverUrl = process.env.LOGINSERVER_URL || 'https://aab-login.moodmnky.com'
    
    const payload = {
      act: 'register',
      username: showdownUsername,
      password: password,
      cpassword: password,
      captcha: 'pikachu',
      challstr: challstr,
      email: userEmail,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    let response: Response
    try {
      response = await fetch(`${loginserverUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        return NextResponse.json({ success: false, error: 'Request timeout' }, { status: 500 })
      }
      throw error
    }

    const responseText = await response.text()
    let responseData: any = {}
    try {
      responseData = JSON.parse(responseText)
    } catch {}

    // Handle response - "username already taken" is considered success
    if (!response.ok) {
      const errorMessage = responseData.error || responseData.message || responseText
      
      if (
        response.status === 409 ||
        errorMessage.includes('already taken') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('username is taken')
      ) {
        console.log(`Username ${showdownUsername} already exists in loginserver - treating as success`)
      } else {
        console.error('Loginserver API error:', errorMessage)
        return NextResponse.json({
          success: false,
          error: `Failed to sync with loginserver: ${errorMessage}`
        }, { status: 500 })
      }
    }

    // Update Supabase profile with sync status
    // Updating public.profiles table (has showdown_username, showdown_account_synced columns)
    const { error: updateError } = await supabase
      .from('profiles')  // public.profiles table
      .update({
        showdown_username: showdownUsername,
        showdown_account_synced: true,
        showdown_account_synced_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      return NextResponse.json({
        success: true,
        showdown_username: showdownUsername,
        error: 'Synced to loginserver but failed to update profile'
      })
    }

    return NextResponse.json({
      success: true,
      showdown_username: showdownUsername,
      message: `Showdown account synced! Username: ${showdownUsername}`,
    })
  } catch (error: any) {
    console.error('Error in sync-account-discord endpoint:', error)
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorStack = error?.stack || ''
    
    // Log full error details for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error?.name,
      type: typeof error
    })
    
    return NextResponse.json(
      { 
        success: false,
        error: `Internal server error: ${errorMessage}`,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}
