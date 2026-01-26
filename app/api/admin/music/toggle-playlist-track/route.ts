import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { createServiceRoleClient } from '@/lib/supabase/service'

/**
 * Toggle whether a storage track is enabled for the in-app playlist
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
    const { storagePath, fileName, enabled } = body

    if (!storagePath && !fileName) {
      return NextResponse.json(
        { error: 'storagePath or fileName is required' },
        { status: 400 }
      )
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()
    const path = storagePath || fileName

    // Upsert the playlist status
    const { data, error } = await serviceSupabase
      .from('storage_track_playlist_status')
      .upsert({
        storage_path: path,
        file_name: fileName || path.split('/').pop() || path,
        is_playlist_enabled: enabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'storage_path',
      })
      .select()
      .single()

    if (error) {
      console.error('[Toggle Playlist Track] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      track: data,
    })
  } catch (error: any) {
    console.error('[Toggle Playlist Track] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
