import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { createClient } from '@supabase/supabase-js'

/**
 * Download tracks from Pixabay music search page
 * 
 * This endpoint scrapes the Pixabay music search page, extracts track information,
 * downloads the audio files, and stores them in Supabase Storage.
 * 
 * Since Pixabay's API doesn't support music, we scrape the HTML page directly.
 * Uses FireCrawl API for reliable scraping with fallback to direct fetch.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { searchUrl } = body

    if (!searchUrl || !searchUrl.includes('pixabay.com/music')) {
      return NextResponse.json(
        { error: 'Invalid search URL. Must be a Pixabay music search URL.' },
        { status: 400 }
      )
    }

    // Use service role client for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Service role key or Supabase URL not configured' },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch the Pixabay search page
    console.log('[Download Pixabay Page] Fetching:', searchUrl)
    
    let html = ''
    
    // Use direct fetch with comprehensive headers to avoid bot detection
    try {
      const pageResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
        },
      })

      if (!pageResponse.ok) {
        const errorText = await pageResponse.text().catch(() => pageResponse.statusText)
        console.error('[Download Pixabay Page] Response error:', {
          status: pageResponse.status,
          statusText: pageResponse.statusText,
          headers: Object.fromEntries(pageResponse.headers.entries()),
        })
        throw new Error(`Failed to fetch Pixabay page: ${pageResponse.status} ${pageResponse.statusText}`)
      }

      html = await pageResponse.text()
      console.log('[Download Pixabay Page] Successfully fetched HTML, length:', html.length)
      
      if (html.length < 1000) {
        console.warn('[Download Pixabay Page] HTML seems too short, might be blocked or error page')
      }
    } catch (fetchError: any) {
      console.error('[Download Pixabay Page] Fetch error:', fetchError)
      throw new Error(`Failed to fetch Pixabay page: ${fetchError.message}`)
    }

    if (!html) {
      throw new Error('Failed to retrieve HTML content from Pixabay')
    }
    
    // Parse HTML to extract track information
    const tracks = extractTracksFromHtml(html)

    // Remove duplicates
    const uniqueTracks = Array.from(
      new Map(tracks.map(t => [t.id, t])).values()
    )

    console.log(`[Download Pixabay Page] Found ${uniqueTracks.length} tracks`)

    // Download and store each track
    const results = []
    for (const track of uniqueTracks.slice(0, 20)) { // Limit to first 20 tracks
      try {
        const result = await downloadAndStoreTrack(track, adminClient)
        results.push(result)
      } catch (error: any) {
        console.error(`[Download Pixabay Page] Error processing track ${track.id}:`, error)
        results.push({
          id: track.id,
          title: track.title,
          success: false,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      tracksFound: uniqueTracks.length,
      tracksProcessed: results.length,
      results,
    })
  } catch (error: any) {
    console.error('[Download Pixabay Page] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Extract track information from HTML
 */
function extractTracksFromHtml(html: string): Array<{
  id: number
  title: string
  artist: string
  pageUrl: string
  downloadUrl?: string
  duration?: number
}> {
  const tracks: Array<{
    id: number
    title: string
    artist: string
    pageUrl: string
    downloadUrl?: string
    duration?: number
  }> = []

  // Method 1: Extract from JSON-LD structured data
  const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/g, '').trim()
        const data = JSON.parse(jsonContent)
        
        if (data['@type'] === 'MusicRecording' || data['@type'] === 'AudioObject') {
          const trackId = data.url?.match(/\/(\d+)\//)?.[1]
          if (trackId) {
            tracks.push({
              id: parseInt(trackId),
              title: data.name || data.headline || 'Untitled Track',
              artist: data.byArtist?.name || data.author?.name || 'Unknown Artist',
              pageUrl: data.url || `https://pixabay.com/music/id-${trackId}/`,
              downloadUrl: data.contentUrl || data.audio?.contentUrl,
              duration: data.duration ? parseDuration(data.duration) : undefined,
            })
          }
        }
      } catch (e) {
        // Skip invalid JSON-LD
        console.warn('[Download Pixabay Page] Failed to parse JSON-LD:', e)
      }
    }
  }

  // Method 2: Extract from data attributes in HTML
  const trackElementMatches = html.match(/data-track-id="(\d+)"[^>]*data-track-title="([^"]*)"[^>]*data-track-url="([^"]*)"/g)
  if (trackElementMatches) {
    for (const match of trackElementMatches) {
      const idMatch = match.match(/data-track-id="(\d+)"/)
      const titleMatch = match.match(/data-track-title="([^"]*)"/)
      const urlMatch = match.match(/data-track-url="([^"]*)"/)
      
      if (idMatch && titleMatch && urlMatch) {
        const existingTrack = tracks.find(t => t.id === parseInt(idMatch[1]))
        if (!existingTrack) {
          tracks.push({
            id: parseInt(idMatch[1]),
            title: decodeURIComponent(titleMatch[1]),
            artist: 'Unknown Artist',
            pageUrl: urlMatch[1],
          })
        }
      }
    }
  }

  // Method 3: Extract from href links to music tracks
  const musicLinkMatches = html.match(/href="(https:\/\/pixabay\.com\/music\/[^"]+)"[^>]*>/g)
  if (musicLinkMatches) {
    for (const match of musicLinkMatches) {
      const urlMatch = match.match(/href="([^"]+)"/)
      if (urlMatch) {
        const url = urlMatch[1]
        const idMatch = url.match(/\/(\d+)\//)
        if (idMatch) {
          const trackId = parseInt(idMatch[1])
          const existingTrack = tracks.find(t => t.id === trackId)
          if (!existingTrack) {
            // Extract title from URL slug
            const slugMatch = url.match(/\/music\/([^\/]+)\//)
            const title = slugMatch
              ? slugMatch[1]
                  .replace(/-\d+$/, '')
                  .split('-')
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')
              : 'Untitled Track'

            tracks.push({
              id: trackId,
              title,
              artist: 'Unknown Artist',
              pageUrl: url,
            })
          }
        }
      }
    }
  }

  return tracks
}

/**
 * Download and store a single track
 */
async function downloadAndStoreTrack(
  track: {
    id: number
    title: string
    artist: string
    pageUrl: string
    downloadUrl?: string
    duration?: number
  },
  adminClient: any
): Promise<{
  id: number
  title: string
  success: boolean
  storageUrl?: string
  error?: string
}> {
  // Fetch the track page to get download URL
  let trackPageHtml = ''
  
  const trackPageResponse = await fetch(track.pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://pixabay.com/',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  if (!trackPageResponse.ok) {
    throw new Error(`Failed to fetch track page: ${trackPageResponse.statusText}. Status: ${trackPageResponse.status}`)
  }

  trackPageHtml = await trackPageResponse.text()
  
  // Extract download URL from track page
  let downloadUrl = track.downloadUrl
  if (!downloadUrl) {
    // Try to find download link
    const downloadMatch = trackPageHtml.match(/href="([^"]*download[^"]*\.(mp3|ogg|wav))"/i)
    if (downloadMatch) {
      downloadUrl = downloadMatch[1].startsWith('http')
        ? downloadMatch[1]
        : `https://pixabay.com${downloadMatch[1]}`
    } else {
      // Try to find audio source
      const audioMatch = trackPageHtml.match(/<audio[^>]*src="([^"]+)"/i)
      if (audioMatch) {
        downloadUrl = audioMatch[1].startsWith('http')
          ? audioMatch[1]
          : `https://pixabay.com${audioMatch[1]}`
      }
    }
  }

  if (!downloadUrl) {
    throw new Error('No download URL found for track')
  }

  // Download the audio file
  console.log(`[Download Pixabay Page] Downloading track ${track.id} from ${downloadUrl}`)
  const audioResponse = await fetch(downloadUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': track.pageUrl,
    },
  })

  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.statusText}`)
  }

  const audioBuffer = await audioResponse.arrayBuffer()
  const fileExtension = downloadUrl.match(/\.(mp3|ogg|wav|webm)$/i)?.[1] || 'mp3'
  const fileName = `${track.id}.${fileExtension}`
  const storagePath = `tracks/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await adminClient.storage
    .from('music-tracks')
    .upload(storagePath, audioBuffer, {
      contentType: `audio/${fileExtension === 'ogg' ? 'ogg' : 'mpeg'}`,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = adminClient.storage
    .from('music-tracks')
    .getPublicUrl(storagePath)

  // Save track metadata to database
  const { error: dbError } = await adminClient
    .from('music_tracks')
    .upsert({
      pixabay_id: track.id,
      pixabay_url: track.pageUrl,
      title: track.title,
      artist: track.artist,
      storage_path: storagePath,
      storage_url: urlData.publicUrl,
      duration: track.duration,
      file_size: audioBuffer.byteLength,
      mood_tags: ['pokemon', 'lofi'],
      is_active: true,
    }, {
      onConflict: 'pixabay_id',
    })

  if (dbError) {
    throw new Error(`Database error: ${dbError.message}`)
  }

  console.log(`[Download Pixabay Page] Successfully processed track ${track.id}`)
  
  return {
    id: track.id,
    title: track.title,
    success: true,
    storageUrl: urlData.publicUrl,
  }
}

/**
 * Parse ISO 8601 duration (PT1M30S) to seconds
 */
function parseDuration(duration: string): number | undefined {
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return undefined

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    return hours * 3600 + minutes * 60 + seconds
  } catch {
    return undefined
  }
}
