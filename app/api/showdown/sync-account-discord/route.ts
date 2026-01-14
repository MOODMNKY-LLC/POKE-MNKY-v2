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

    // Create Supabase client with service role key (bypasses RLS for server-to-server calls)
    const supabase = createServiceRoleClient()
    
    // Find user by Discord ID in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, discord_username, showdown_username, email')
      .eq('discord_id', discord_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found. Please link your Discord account in the app first.' },
        { status: 404 }
      )
    }

    // Get user email from auth.users using admin API
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    const userEmail = authUser?.user?.email || profile.email || ''

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
    const { error: updateError } = await supabase
      .from('profiles')
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
