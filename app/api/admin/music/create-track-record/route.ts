import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { createServiceRoleClient } from '@/lib/supabase/service'

const MUSIC_BUCKET = 'music-tracks'

/**
 * Creates a music_tracks record after the client has uploaded the file directly to Supabase Storage.
 * This bypasses Vercel's 4.5MB body limit by never receiving the file in the API route.
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
    const { storagePath, title, artist, moodTags: moodTagsStr, fileSize } = body as {
      storagePath?: string
      title?: string
      artist?: string
      moodTags?: string
      fileSize?: number
    }

    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json({ error: 'storagePath is required' }, { status: 400 })
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Sanitize path - must be under tracks/
    if (!storagePath.startsWith('tracks/') || storagePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { data: urlData } = serviceSupabase.storage
      .from(MUSIC_BUCKET)
      .getPublicUrl(storagePath)

    const moodTags = (moodTagsStr || '')
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0)

    const { data: trackData, error: dbError } = await serviceSupabase
      .from('music_tracks')
      .insert({
        title: title.trim(),
        artist: (artist || 'Unknown Artist').trim(),
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        duration: null,
        file_size: typeof fileSize === 'number' ? fileSize : null,
        mood_tags: moodTags.length > 0 ? moodTags : [],
        is_active: true,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Create Track Record] Database error:', dbError)
      return NextResponse.json(
        { error: `Failed to save track metadata: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      track: trackData,
    })
  } catch (error: unknown) {
    console.error('[Create Track Record] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
