import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac'
import { createServiceRoleClient } from '@/lib/supabase/service'

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

    const body = await request.json()
    const { fileName, storagePath } = body

    if (!fileName && !storagePath) {
      return NextResponse.json(
        { error: 'fileName or storagePath is required' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()
    
    // Determine the file path
    // If storagePath is provided, use it; otherwise construct from fileName
    const filePath = storagePath || fileName

    // Delete from storage bucket
    const { data: deleteData, error: deleteError } = await serviceSupabase.storage
      .from('music-tracks')
      .remove([filePath])

    if (deleteError) {
      console.error('[Delete Track] Storage error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete track from storage: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // Optionally delete from database if track exists there
    // Try to find track by storage_path or storage_url
    const { data: trackData } = await serviceSupabase
      .from('music_tracks')
      .select('id, storage_path')
      .or(`storage_path.eq.${filePath},storage_url.ilike.%${fileName}%`)
      .limit(1)
      .single()

    if (trackData) {
      // Soft delete from database (set is_active = false)
      await serviceSupabase
        .from('music_tracks')
        .update({ is_active: false })
        .eq('id', trackData.id)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Track deleted successfully',
      deletedFiles: deleteData || []
    })
  } catch (error: any) {
    console.error('[Delete Track] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
