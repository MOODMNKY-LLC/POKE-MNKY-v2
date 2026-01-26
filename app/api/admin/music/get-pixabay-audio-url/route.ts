import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { PixabayClient } from '@/lib/pixabay/client'

/**
 * Get audio URL for preview from Pixabay
 * This endpoint tries multiple methods to get a playable audio URL
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
    const trackId = searchParams.get('id')

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      )
    }

    const pixabayClient = new PixabayClient()
    
    // Method 1: Try to get track details from API
    console.log('[Get Audio URL] Fetching track details for:', trackId)
    const track = await pixabayClient.getTrackById(parseInt(trackId))

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }

    // Method 2: Try getBestFormatUrl first (from formats object)
    let audioUrl = pixabayClient.getBestFormatUrl(track)
    
    if (audioUrl) {
      console.log('[Get Audio URL] Found URL from formats:', audioUrl)
      return NextResponse.json({ url: audioUrl, source: 'formats' })
    }

    // Method 3: Try to extract download URL from pageURL
    // Pixabay music pages might have download links we can extract
    if (track.pageURL) {
      console.log('[Get Audio URL] Attempting to extract URL from page:', track.pageURL)
      
      try {
        // Try fetching the page to extract download link
        const pageResponse = await fetch(track.pageURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
        
        if (pageResponse.ok) {
          const pageHtml = await pageResponse.text()
          
          // Look for download link patterns in the HTML
          // Pixabay typically has download links like: https://cdn.pixabay.com/music/...
          const downloadMatch = pageHtml.match(/https?:\/\/cdn\.pixabay\.com\/music\/[^"'\s]+\.(mp3|ogg)/i)
          if (downloadMatch) {
            console.log('[Get Audio URL] Found download URL from page:', downloadMatch[0])
            return NextResponse.json({ url: downloadMatch[0], source: 'page-extraction' })
          }
          
          // Also try looking for data attributes or JSON-LD that might contain the URL
          const jsonLdMatch = pageHtml.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is)
          if (jsonLdMatch) {
            try {
              const jsonLd = JSON.parse(jsonLdMatch[1])
              if (jsonLd.contentUrl || jsonLd.audio?.contentUrl) {
                const url = jsonLd.contentUrl || jsonLd.audio?.contentUrl
                console.log('[Get Audio URL] Found URL from JSON-LD:', url)
                return NextResponse.json({ url, source: 'json-ld' })
              }
            } catch (e) {
              // JSON-LD parsing failed, continue
            }
          }
        }
      } catch (error) {
        console.warn('[Get Audio URL] Failed to fetch page:', error)
      }
    }

    // Method 4: Try constructing URL from track ID
    // Some CDNs use predictable patterns: https://cdn.pixabay.com/music/{id}.mp3
    const constructedUrl = `https://cdn.pixabay.com/music/${trackId}.mp3`
    console.log('[Get Audio URL] Trying constructed URL:', constructedUrl)
    
    // Verify the URL exists by checking headers
    try {
      const headResponse = await fetch(constructedUrl, { method: 'HEAD' })
      if (headResponse.ok && headResponse.headers.get('content-type')?.startsWith('audio/')) {
        console.log('[Get Audio URL] Constructed URL is valid')
        return NextResponse.json({ url: constructedUrl, source: 'constructed' })
      }
    } catch (error) {
      console.warn('[Get Audio URL] Constructed URL not valid')
    }

    // No URL found
    console.warn('[Get Audio URL] No audio URL found for track:', trackId)
    return NextResponse.json(
      { error: 'No audio URL available for this track' },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('[Get Audio URL] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
