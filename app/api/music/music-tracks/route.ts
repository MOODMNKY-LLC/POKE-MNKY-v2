import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

/**
 * List all audio files directly from the music-tracks storage bucket
 * This endpoint scans the bucket and returns file metadata for local playback
 */
export async function GET(request: NextRequest) {
  try {
    // Use service role client for listing files (listing requires admin permissions even for public buckets)
    const supabase = createServiceRoleClient()
    
    // List all files in the music-tracks bucket (including subdirectories)
    // First, try root level
    console.log('[Music API] Listing files from music-tracks bucket at root level...')
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('music-tracks')
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      })
    
    console.log('[Music API] List result:', { 
      filesCount: rootFiles?.length || 0, 
      error: rootError?.message || null,
      files: rootFiles?.map(f => ({ name: f.name, id: f.id, hasMetadata: !!f.metadata, size: f.metadata?.size })) || []
    })
    
    if (rootError) {
      console.error('[Music API] Error listing root files:', rootError)
      return NextResponse.json(
        { error: rootError.message, details: rootError },
        { status: 500 }
      )
    }
    
    // Also check common subdirectories (ignore errors if folder doesn't exist)
    let tracksFiles: any[] = []
    const { data: subdirFiles, error: tracksError } = await supabase.storage
      .from('music-tracks')
      .list('tracks', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      })
    
    // Only add subdirectory files if they exist (ignore errors for missing folders)
    if (!tracksError && subdirFiles) {
      tracksFiles = subdirFiles.map(file => ({ ...file, name: `tracks/${file.name}` }))
    } else if (tracksError) {
      console.log('[Music API] No tracks subdirectory (this is fine):', tracksError.message)
    }
    
    // Combine files from root and subdirectories
    const files = [
      ...(rootFiles || []),
      ...tracksFiles
    ]
    
    console.log('[Music API] Combined files:', files.length, 'total (root:', rootFiles?.length || 0, ', subdirs:', tracksFiles.length, ')')
    
    if (!files || files.length === 0) {
      console.warn('[Music API] No files found in music-tracks bucket')
      return NextResponse.json({ tracks: [], message: 'No files found in bucket' })
    }

    // Filter to only audio files and build track objects
    const audioExtensions = ['.mp3', '.ogg', '.wav', '.webm', '.m4a']
    const tracks = files
      .filter(file => {
        // Skip folders - folders typically don't have metadata.size or have size === null
        const hasSize = file.metadata?.size !== undefined && file.metadata?.size !== null
        
        if (!hasSize) {
          return false
        }
        
        // Check if file has audio extension
        const fileName = file.name.toLowerCase()
        return audioExtensions.some(ext => fileName.endsWith(ext))
      })
      .map(file => {
        const fileName = file.name.includes('/') ? file.name.split('/').pop()! : file.name
        const filePath = file.name // Preserve full path including subdirectories
        
        // Get public URL for the file
        const { data: urlData } = supabase.storage
          .from('music-tracks')
          .getPublicUrl(filePath)
        
        // Extract title from filename (remove extension)
        const title = fileName
          .replace(/\.(mp3|ogg|wav|webm|m4a)$/i, '')
          .replace(/[-_]/g, ' ')
          .trim()

        const trackData = {
          id: file.id || fileName,
          title: title || 'Untitled Track',
          artist: 'Local Track',
          fileName: fileName,
          storagePath: filePath,
          storageUrl: urlData.publicUrl,
          fileSize: file.metadata?.size || 0,
          mimeType: file.metadata?.mimetype || 'audio/mpeg',
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          // Local storage tracks don't have duration in metadata
          // Duration will be determined client-side when audio loads
          duration: null,
        }
        
        console.log(`[Music API] Generated track URL for ${fileName}:`, urlData.publicUrl)
        
        return trackData
      })

    // Fetch playlist enabled status for all tracks
    let tracksWithStatus = tracks
    if (tracks.length > 0) {
      const storagePaths = tracks.map(t => t.storagePath)
      const { data: playlistStatuses } = await supabase
        .from('storage_track_playlist_status')
        .select('storage_path, is_playlist_enabled')
        .in('storage_path', storagePaths)
      
      // Create a map for quick lookup
      const playlistStatusMap = new Map(
        (playlistStatuses || []).map((s: any) => [s.storage_path, s.is_playlist_enabled])
      )
      
      // Add playlist_enabled status to each track
      tracksWithStatus = tracks.map(track => ({
        ...track,
        playlist_enabled: playlistStatusMap.get(track.storagePath) || false,
      }))
    }

    console.log(`[Music API] Found ${tracksWithStatus.length} audio track(s) in music-tracks bucket`)
    return NextResponse.json({ tracks: tracksWithStatus })
  } catch (error: any) {
    console.error('[Music API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
