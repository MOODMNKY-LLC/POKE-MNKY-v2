import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const activeOnly = searchParams.get('active') !== 'false'
    const contextType = searchParams.get('context')

    let query = supabase
      .from('music_playlists')
      .select('*')
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (contextType) {
      query = query.eq('context_type', contextType)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Get Playlists] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ playlists: data || [] })
  } catch (error: any) {
    console.error('[Get Playlists] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
