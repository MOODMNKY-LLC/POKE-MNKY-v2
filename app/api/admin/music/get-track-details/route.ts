import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { PixabayClient } from '@/lib/pixabay/client'

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
    const trackId = searchParams.get('id')

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      )
    }

    const pixabayClient = new PixabayClient()
    
    // Log the raw API response for debugging
    console.log('[Get Track Details] Fetching track:', trackId)
    
    const track = await pixabayClient.getTrackById(parseInt(trackId))

    if (!track) {
      console.error('[Get Track Details] Track not found for ID:', trackId)
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }

    // Log the FULL track structure for debugging
    console.log('[Get Track Details] Full track response:', JSON.stringify(track, null, 2))
    console.log('[Get Track Details] Track structure summary:', {
      id: track.id,
      pageURL: track.pageURL,
      hasFormats: !!(track.formats && Object.keys(track.formats).length > 0),
      formatKeys: track.formats ? Object.keys(track.formats) : [],
      formatsValue: track.formats,
      allKeys: Object.keys(track),
      // Check for alternative field names that might contain audio URLs
      hasAudio: !!(track as any).audio,
      hasUrl: !!(track as any).url,
      hasDownloadUrl: !!(track as any).downloadUrl,
      hasPreviewUrl: !!(track as any).previewURL,
    })

    return NextResponse.json({ track })
  } catch (error: any) {
    console.error('[Get Track Details] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
