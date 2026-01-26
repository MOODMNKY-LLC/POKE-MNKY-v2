import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const activeOnly = searchParams.get('active') !== 'false'
    const moodTag = searchParams.get('mood')
    const pixabayId = searchParams.get('pixabay_id')

    let query = supabase
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false })

    if (pixabayId) {
      query = query.eq('pixabay_id', parseInt(pixabayId))
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (moodTag) {
      query = query.contains('mood_tags', [moodTag])
    }

    const { data, error } = await query

    if (error) {
      console.error('[Get Tracks] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ tracks: data || [] })
  } catch (error: any) {
    console.error('[Get Tracks] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
