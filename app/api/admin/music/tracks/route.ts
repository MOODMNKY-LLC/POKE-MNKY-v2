import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { createServiceRoleClient } from '@/lib/supabase/service'

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
    const { trackId, updates } = body

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()
    const { data, error } = await serviceSupabase
      .from('music_tracks')
      .update(updates)
      .eq('id', trackId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ track: data })
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
    const trackId = searchParams.get('id')

    if (!trackId) {
      return NextResponse.json(
        { error: 'track id is required' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()
    
    // Soft delete (set is_active = false)
    const { data, error } = await serviceSupabase
      .from('music_tracks')
      .update({ is_active: false })
      .eq('id', trackId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, track: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
