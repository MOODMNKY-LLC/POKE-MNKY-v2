import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { PixabayClient } from '@/lib/pixabay/client'

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
    const query = searchParams.get('q') || 'pokemon lofi'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const minDuration = searchParams.get('min_duration')
    const maxDuration = searchParams.get('max_duration')

    const pixabayClient = new PixabayClient()
    
    const results = await pixabayClient.searchMusic(query, {
      per_page: perPage,
      page,
      min_duration: minDuration ? parseInt(minDuration) : undefined,
      max_duration: maxDuration ? parseInt(maxDuration) : undefined,
    })

    // Warn if no music results found
    if (results.hits.length === 0 && results.totalHits === 0) {
      console.warn(
        '[Search Pixabay] No music tracks found. ' +
        'Pixabay API does not support music search - only images and videos are available via API.'
      )
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('[Search Pixabay] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
