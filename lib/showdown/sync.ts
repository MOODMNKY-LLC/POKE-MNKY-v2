/**
 * Showdown Account Sync Utilities
 * Bridges Supabase authentication to Showdown loginserver
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * Generate deterministic password from user ID
 * Password is generated from user ID + secret key, so it's consistent
 * but user doesn't know it (they use app auth)
 * Uses base64url encoding to avoid invalid characters (+, /, =)
 */
export function generateShowdownPassword(userId: string): string {
  const secret = process.env.SHOWDOWN_PASSWORD_SECRET || 'change-me-in-production'
  
  // Generate deterministic password using HMAC
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(userId)
  const hash = hmac.digest('base64')
  
  // Convert base64 to base64url (replace + with -, / with _, remove = padding)
  const base64url = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  
  // Take first 20 characters (Showdown password requirements: 6-20 chars)
  return base64url.slice(0, 20)
}

/**
 * Get challenge string from Showdown server WebSocket
 * Required for loginserver registration
 * Connects to Showdown server WebSocket and waits for |challstr| message
 */
export async function getChallengeString(): Promise<string> {
  const showdownServerUrl = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com'
  
  // Convert HTTPS URL to WebSocket URL
  const wsUrl = showdownServerUrl
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/$/, '') + '/showdown/websocket'

  // Use native WebSocket (available in Node.js 18+)
  // Node.js 18+ has native WebSocket support globally
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
    }, 10000) // 10 second timeout

    ws.onopen = () => {
      // Connection opened, wait for challstr message
      // Showdown server will send |challstr| automatically
    }

    ws.onmessage = (event: MessageEvent | { data: Buffer | string }) => {
      if (resolved) return
      
      const message = typeof event.data === 'string' 
        ? event.data 
        : Buffer.isBuffer(event.data)
        ? event.data.toString('utf-8')
        : String(event.data)
      
      // Parse Showdown protocol message: |challstr|<challenge_string>
      // Message format: |challstr|<challenge_string> or |challstr|<part1>|<part2>
      if (message.includes('|challstr|')) {
        const parts = message.split('|')
        const challstrIndex = parts.findIndex(p => p === 'challstr')
        if (challstrIndex !== -1 && parts[challstrIndex + 1]) {
          // Get everything after 'challstr' and join with | (in case challenge string contains |)
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

/**
 * Determine Showdown username from user profile
 * Priority: showdown_username > discord_username > email prefix > user ID
 */
export async function getShowdownUsername(userId: string): Promise<string> {
  const supabase = await createClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('showdown_username, discord_username')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    // Fallback to user ID if profile not found
    return userId.slice(0, 18)
  }

  // Priority order: showdown_username > discord_username > email prefix > user ID
  if (profile.showdown_username) {
    return profile.showdown_username
  }

  if (profile.discord_username) {
    // Clean Discord username (remove #1234 discriminator if present)
    return profile.discord_username.split('#')[0].slice(0, 18)
  }

  // Try to get email from auth.users
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email) {
    const emailPrefix = user.email.split('@')[0]
    // Clean email prefix (alphanumeric + underscore only, max 18 chars)
    return emailPrefix.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18)
  }

  // Final fallback: user ID (max 18 chars for Showdown)
  return userId.slice(0, 18)
}

/**
 * Sync Supabase user account to Showdown loginserver
 * Creates or updates Showdown account via loginserver API
 */
export async function syncShowdownAccount(userId: string): Promise<{
  success: boolean
  showdown_username?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Get user and profile
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('showdown_username, discord_username, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' }
    }

    // Determine Showdown username
    const showdownUsername = await getShowdownUsername(userId)
    
    // Generate deterministic password
    const password = generateShowdownPassword(userId)

    // Get challenge string from Showdown server WebSocket
    let challstr: string
    try {
      challstr = await getChallengeString()
    } catch (error: any) {
      console.error('Failed to get challenge string:', error)
      return {
        success: false,
        error: `Failed to get challenge string: ${error.message}`
      }
    }

    // Call loginserver API
    const loginserverUrl = process.env.LOGINSERVER_URL || 'https://aab-login.moodmnky.com'
    
    // Build request payload with all required fields
    const payload = {
      act: 'register',
      username: showdownUsername,
      password: password,
      cpassword: password, // Confirm password (must match password)
      captcha: 'pikachu', // Anti-spam captcha
      challstr: challstr, // Challenge string from Showdown server
      email: user.email || profile.email || '',
    }

    // Add timeout to request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let response: Response
    try {
      response = await fetch(`${loginserverUrl}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timeout' }
      }
      throw error
    }

    // Parse response
    const responseText = await response.text()
    let responseData: any = {}
    try {
      responseData = JSON.parse(responseText)
    } catch {
      // Response might not be JSON
    }

    // Handle response - "username already taken" is considered success
    if (!response.ok) {
      const errorMessage = responseData.error || responseData.message || responseText
      
      // If username already exists, treat as success (account already synced)
      if (
        response.status === 409 ||
        errorMessage.includes('already taken') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('username is taken')
      ) {
        console.log(`Username ${showdownUsername} already exists in loginserver - treating as success`)
        // Continue to update Supabase profile
      } else {
        console.error('Loginserver API error:', errorMessage)
        return {
          success: false,
          error: `Failed to sync with loginserver: ${errorMessage}`
        }
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
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      // Still return success if loginserver sync worked
      return { 
        success: true, 
        showdown_username: showdownUsername,
        error: 'Synced to loginserver but failed to update profile'
      }
    }

    return { 
      success: true, 
      showdown_username: showdownUsername 
    }
  } catch (error: any) {
    console.error('Error syncing Showdown account:', error)
    return { 
      success: false, 
      error: error.message || 'Internal server error' 
    }
  }
}

