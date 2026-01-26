import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { createServiceRoleClient } from '@/lib/supabase/service'

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
    const { name, description, context_type, track_ids, is_default } = body

    if (!name || !context_type) {
      return NextResponse.json(
        { error: 'name and context_type are required' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()
    
    // If setting as default, unset other defaults for this context
    if (is_default) {
      await serviceSupabase
        .from('music_playlists')
        .update({ is_default: false })
        .eq('context_type', context_type)
    }

    const { data, error } = await serviceSupabase
      .from('music_playlists')
      .insert({
        name,
        description,
        context_type,
        track_ids: track_ids || [],
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ playlist: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    const { playlistId, updates } = body

    if (!playlistId) {
      return NextResponse.json(
        { error: 'playlistId is required' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()
    
    // If setting as default, unset other defaults for this context
    if (updates.is_default) {
      const { data: currentPlaylist } = await serviceSupabase
        .from('music_playlists')
        .select('context_type')
        .eq('id', playlistId)
        .single()

      if (currentPlaylist) {
        await serviceSupabase
          .from('music_playlists')
          .update({ is_default: false })
          .eq('context_type', currentPlaylist.context_type)
          .neq('id', playlistId)
      }
    }

    const { data, error } = await serviceSupabase
      .from('music_playlists')
      .update(updates)
      .eq('id', playlistId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ playlist: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const playlistId = searchParams.get('id')

    if (!playlistId) {
      return NextResponse.json(
        { error: 'playlist id is required' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()
    
    // Soft delete (set is_active = false)
    const { data, error } = await serviceSupabase
      .from('music_playlists')
      .update({ is_active: false })
      .eq('id', playlistId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, playlist: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
