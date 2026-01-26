"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, 
  Music2,
  Clock,
  HardDrive,
} from "lucide-react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

interface MusicTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
  file_size: number | null
  storageUrl?: string
  storage_url?: string
  fileName?: string
}

export function PlaylistBuilder() {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const loadingDurationsRef = useRef<Set<string>>(new Set()) // Track which tracks are loading duration

  useEffect(() => {
    fetchTracks(true)
    
    // Refresh tracks every 5 seconds to catch toggle changes from other tabs (without showing loading)
    const interval = setInterval(() => {
      fetchTracks(false)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchTracks = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      // Fetch storage tracks and filter to only playlist-enabled ones
      const response = await fetch('/api/music/music-tracks')
      const data = await response.json()
      
      // Only show tracks that are enabled for the playlist
      const enabledTracks = (data.tracks || []).filter((track: any) => track.playlist_enabled === true)
      const mappedTracks = enabledTracks.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist || null,
        duration: track.duration || null,
        file_size: track.fileSize || null,
        storageUrl: track.storageUrl || track.storage_url,
        storage_url: track.storageUrl || track.storage_url,
        fileName: track.fileName,
      }))
      
      setTracks(mappedTracks)
      
      // Load duration for tracks that don't have it yet (only if not already loading)
      mappedTracks.forEach((track) => {
        if (!track.duration && track.storageUrl && !loadingDurationsRef.current.has(track.id)) {
          loadingDurationsRef.current.add(track.id)
          loadTrackDuration(track)
        }
      })
    } catch (error: any) {
      console.error('Failed to fetch tracks:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const loadTrackDuration = (track: MusicTrack) => {
    if (!track.storageUrl) {
      loadingDurationsRef.current.delete(track.id)
      return
    }
    
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.crossOrigin = 'anonymous'
    
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        const durationSeconds = Math.floor(audio.duration)
        console.log(`[PlaylistBuilder] Loaded duration for ${track.title}: ${durationSeconds}s`)
        setTracks(prevTracks =>
          prevTracks.map(t =>
            t.id === track.id
              ? { ...t, duration: durationSeconds }
              : t
          )
        )
      }
      // Clean up
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('error', handleError)
      audio.src = ''
      loadingDurationsRef.current.delete(track.id)
    }
    
    const handleError = (e: Event) => {
      console.warn(`[PlaylistBuilder] Failed to load duration for ${track.title}:`, e, audio.error)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('error', handleError)
      loadingDurationsRef.current.delete(track.id)
    }
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('error', handleError)
    
    // Set src and load metadata
    audio.src = track.storageUrl
    audio.load()
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const filteredTracks = tracks.filter(track => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        track.title.toLowerCase().includes(query) ||
        (track.artist && track.artist.toLowerCase().includes(query)) ||
        (track.fileName && track.fileName.toLowerCase().includes(query))
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Track count */}
      <div className="flex items-center justify-end">
        <div className="text-sm text-muted-foreground">
          {tracks.length} track{tracks.length !== 1 ? 's' : ''} enabled
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search playlist tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Tracks Table */}
      {filteredTracks.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTracks.map((track) => (
                <TableRow key={track.id}>
                  <TableCell className="font-medium">{track.title}</TableCell>
                  <TableCell>{track.artist || 'Unknown'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDuration(track.duration)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3 text-muted-foreground" />
                      {formatFileSize(track.file_size)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Alert>
          <Music2 className="h-4 w-4" />
          <AlertDescription>
            {tracks.length === 0 
              ? "No tracks enabled for the playlist. Enable tracks in the \"Downloaded Tracks\" tab to add them to the playlist."
              : "No tracks match your search."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
