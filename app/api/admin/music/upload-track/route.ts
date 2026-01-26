import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { createServiceRoleClient } from '@/lib/supabase/service'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const artist = formData.get('artist') as string || 'Unknown Artist'
    const moodTagsStr = formData.get('moodTags') as string || ''

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 10MB limit. File is ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'File must be an audio file' },
        { status: 400 }
      )
    }

    // Parse mood tags
    const moodTags = moodTagsStr
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    const serviceSupabase = createServiceRoleClient()

    // Generate storage path
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const fileExt = file.name.split('.').pop() || 'mp3'
    const fileName = `${Date.now()}-${sanitizedTitle}.${fileExt}`
    const storagePath = `tracks/${fileName}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from('music-tracks')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload Track] Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload track: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = serviceSupabase.storage
      .from('music-tracks')
      .getPublicUrl(storagePath)

    // Create audio element to get duration
    // Note: This is a simplified approach - in production you might want to use a library
    // that can read audio metadata from the buffer
    let duration: number | null = null
    try {
      // We'll set duration to null for now and let it be updated later if needed
      // Or use a library like 'music-metadata' to extract duration from buffer
    } catch (error) {
      console.warn('[Upload Track] Could not extract duration:', error)
    }

    // Save track metadata to database
    const { data: trackData, error: dbError } = await serviceSupabase
      .from('music_tracks')
      .insert({
        title: title.trim(),
        artist: artist.trim() || 'Unknown Artist',
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        duration: duration,
        file_size: buffer.length,
        mood_tags: moodTags.length > 0 ? moodTags : [],
        is_active: true,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Upload Track] Database error:', dbError)
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
    console.error('[Upload Track] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
