import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { PixabayClient } from '@/lib/pixabay/client'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const userIsAdmin = await isAdmin(supabase, user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { pixabayId, pixabayUrl, title, artist, moodTags } = body

    if (!pixabayId || !pixabayUrl) {
      return NextResponse.json(
        { error: 'pixabayId and pixabayUrl are required' },
        { status: 400 }
      )
    }

    // Check if track already exists
    const serviceSupabase = createServiceRoleClient()
    const { data: existingTrack } = await serviceSupabase
      .from('music_tracks')
      .select('id')
      .eq('pixabay_id', pixabayId)
      .maybeSingle()

    if (existingTrack) {
      return NextResponse.json(
        { error: 'Track already exists', trackId: existingTrack.id },
        { status: 409 }
      )
    }

    // Initialize Pixabay client
    const pixabayClient = new PixabayClient()

    // Get track details
    const track = await pixabayClient.getTrackById(pixabayId)
    if (!track) {
      return NextResponse.json(
        { error: 'Track not found on Pixabay' },
        { status: 404 }
      )
    }

    // Log track data for debugging
    console.log('[Download Track] Pixabay track data:', JSON.stringify(track, null, 2))
    console.log('[Download Track] Track title from API:', track.title)
    console.log('[Download Track] Title from request body:', title)
    
    // Use PixabayClient helper to get the best track title
    const extractedTitle = pixabayClient.getTrackTitle(track)
    console.log('[Download Track] Extracted title from URL:', extractedTitle)

    // Get best format URL
    const downloadUrl = pixabayClient.getBestFormatUrl(track)
    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'No download URL available for this track' },
        { status: 400 }
      )
    }

    // Download track file
    const trackBuffer = await pixabayClient.downloadTrack(downloadUrl)

    // Generate storage path
    const sanitizedTitle = (title || track.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const fileName = `${pixabayId}-${sanitizedTitle}.mp3`
    const storagePath = `pokemon-lofi/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from('music-tracks')
      .upload(storagePath, trackBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      })

    if (uploadError) {
      console.error('[Download Track] Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload track: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = serviceSupabase.storage
      .from('music-tracks')
      .getPublicUrl(storagePath)

    // Extract duration from track (in seconds)
    const duration = track.duration || track.formats?.[Object.keys(track.formats)[0]]?.duration || 0

    // Use PixabayClient helper to get the best track title
    // This prioritizes API title, then extracts from URL, then falls back to request body
    const finalTitle = pixabayClient.getTrackTitle(track) || title || 'Untitled Track'
    const finalArtist = track.user || artist || 'Unknown Artist'

    // Save track metadata to database
    const { data: trackData, error: dbError } = await serviceSupabase
      .from('music_tracks')
      .insert({
        title: finalTitle,
        artist: finalArtist,
        pixabay_id: pixabayId,
        pixabay_url: pixabayUrl,
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        duration: Math.round(duration),
        file_size: trackBuffer.length,
        mood_tags: moodTags || [],
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Download Track] Database error:', dbError)
      // Try to clean up uploaded file
      await serviceSupabase.storage
        .from('music-tracks')
        .remove([storagePath])
      
      return NextResponse.json(
        { error: `Failed to save track metadata: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      track: trackData,
    })
  } catch (error: any) {
    console.error('[Download Track] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
