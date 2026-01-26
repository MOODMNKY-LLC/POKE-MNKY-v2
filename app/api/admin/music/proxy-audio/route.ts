import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'

/**
 * Proxy route for Pixabay audio files to avoid CORS issues
 * Fetches audio from Pixabay server-side and streams to client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(supabase, user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const audioUrl = searchParams.get('url')

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Audio URL is required' },
        { status: 400 }
      )
    }

    // Validate that URL is from Pixabay CDN
    if (!audioUrl.includes('pixabay.com') && !audioUrl.includes('cdn.pixabay.com')) {
      return NextResponse.json(
        { error: 'Invalid audio source' },
        { status: 400 }
      )
    }

    console.log('[Audio Proxy] Fetching audio from:', audioUrl)

    // Fetch audio file from Pixabay
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'POKE-MNKY/1.0',
        'Referer': 'https://poke-mnky.moodmnky.com',
      },
    })

    console.log('[Audio Proxy] Response status:', audioResponse.status, audioResponse.statusText)
    console.log('[Audio Proxy] Response headers:', Object.fromEntries(audioResponse.headers.entries()))

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text().catch(() => 'Unknown error')
      console.error('[Audio Proxy] Failed to fetch audio:', {
        status: audioResponse.status,
        statusText: audioResponse.statusText,
        body: errorText.substring(0, 200), // First 200 chars
      })
      return NextResponse.json(
        { error: `Failed to fetch audio: ${audioResponse.statusText}`, details: errorText.substring(0, 200) },
        { status: audioResponse.status }
      )
    }

    // Get audio content type
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg'
    const contentLength = audioResponse.headers.get('content-length')
    
    console.log('[Audio Proxy] Content-Type:', contentType)
    console.log('[Audio Proxy] Content-Length:', contentLength)

    // Check if response is actually audio (not JSON error)
    const firstBytes = await audioResponse.clone().arrayBuffer().then(buf => {
      const view = new Uint8Array(buf.slice(0, 4))
      return Array.from(view).map(b => b.toString(16).padStart(2, '0')).join('')
    })
    
    console.log('[Audio Proxy] First bytes (hex):', firstBytes)
    
    // MP3 files start with FF FB or FF F3, OGG starts with 4F 67 67 53
    // JSON starts with 7B (opening brace)
    if (firstBytes.startsWith('7b')) {
      const errorText = await audioResponse.text()
      console.error('[Audio Proxy] Response is JSON, not audio:', errorText.substring(0, 500))
      return NextResponse.json(
        { error: 'Invalid audio response from Pixabay', details: JSON.parse(errorText) },
        { status: 500 }
      )
    }

    // Stream audio to client with proper headers
    const audioBuffer = await audioResponse.arrayBuffer()
    
    console.log('[Audio Proxy] Audio buffer size:', audioBuffer.byteLength, 'bytes')

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || String(audioBuffer.byteLength),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Accept-Ranges': 'bytes', // Enable range requests for audio
      },
    })
  } catch (error: any) {
    console.error('[Audio Proxy] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
