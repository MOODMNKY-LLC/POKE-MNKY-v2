/**
 * Test script for loginserver API
 * Tests challenge string fetching and registration
 * Run with: pnpm tsx scripts/test-loginserver-api.ts
 */

const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com'
const LOGINSERVER_URL = process.env.LOGINSERVER_URL || 'https://aab-login.moodmnky.com'

async function testChallengeString() {
  console.log(`\n🔍 Testing Challenge String Fetch from: ${SHOWDOWN_SERVER_URL}\n`)

  const wsUrl = SHOWDOWN_SERVER_URL
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/$/, '') + '/showdown/websocket'

  console.log(`WebSocket URL: ${wsUrl}`)

  return new Promise<string>((resolve, reject) => {
    let resolved = false
    const WebSocket = (globalThis as any).WebSocket || require('ws')
    const ws = new WebSocket(wsUrl)
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        ws.close()
        reject(new Error('Timeout waiting for challenge string'))
      }
    }, 10000)

    ws.onopen = () => {
      console.log('✅ WebSocket connected, waiting for challstr...')
    }

    ws.onmessage = (event: any) => {
      if (resolved) return
      
      const message = typeof event.data === 'string' 
        ? event.data 
        : Buffer.isBuffer(event.data)
        ? event.data.toString('utf-8')
        : String(event.data)
      
      console.log(`📥 Received message: ${message}`)
      
      if (message.includes('|challstr|')) {
        const parts = message.split('|')
        const challstrIndex = parts.findIndex(p => p === 'challstr')
        if (challstrIndex !== -1 && parts[challstrIndex + 1]) {
          const challstr = parts.slice(challstrIndex + 1).join('|')
          console.log(`✅ Challenge string received: ${challstr}`)
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            ws.close()
            resolve(challstr)
          }
        }
      }
    }

    ws.onerror = (error: any) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        const errorMsg = error instanceof Error ? error.message : error.type || 'Unknown error'
        console.error(`❌ WebSocket error: ${errorMsg}`)
        reject(new Error(`WebSocket error: ${errorMsg}`))
      }
    }

    ws.onclose = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        console.error('❌ WebSocket closed before receiving challenge string')
        reject(new Error('WebSocket closed before receiving challenge string'))
      }
    }
  })
}

async function testRegister() {
  console.log(`\n🔍 Testing Loginserver Registration: ${LOGINSERVER_URL}/api/register\n`)

  try {
    // Get challenge string first
    const challstr = await testChallengeString()
    
    const payload = {
      act: 'register',
      username: 'testuser' + Date.now(),
      password: 'testpass123',
      cpassword: 'testpass123',
      captcha: 'pikachu',
      challstr: challstr,
      email: 'test@example.com',
    }

    console.log('📤 Sending registration request...')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    const response = await fetch(`${LOGINSERVER_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`)
    const responseText = await response.text()
    console.log(`Response Body: ${responseText}`)

    if (response.ok) {
      console.log('\n✅ SUCCESS: Registration endpoint works!')
      return true
    } else {
      console.log(`\n⚠️  Registration returned status ${response.status}`)
      // Check if it's "username already taken" (which is OK)
      if (responseText.includes('already taken') || responseText.includes('already exists')) {
        console.log('✅ Username conflict handled correctly')
        return true
      }
      return false
    }
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message)
    return false
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Loginserver API Test')
  console.log('='.repeat(60))

  try {
    const success = await testRegister()
    
    console.log('\n' + '='.repeat(60))
    console.log('Summary')
    console.log('='.repeat(60))
    
    if (success) {
      console.log('✅ All tests passed!')
      console.log('   Loginserver API is ready for bridge authentication')
    } else {
      console.log('❌ Tests failed')
      console.log('   Check error messages above')
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
  }

  console.log('\n')
}

main().catch(console.error)
