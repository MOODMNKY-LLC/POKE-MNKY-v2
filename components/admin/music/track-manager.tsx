"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Music2,
  Clock,
  HardDrive,
  CheckCircle2,
  XCircle,
  Upload
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Waveform } from "./waveform"

interface MusicTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
  file_size: number | null
  mood_tags?: string[]
  is_active?: boolean
  storage_url: string
  storageUrl?: string // Alternative field name from music-tracks endpoint
  storagePath?: string // Full path in storage bucket
  fileName?: string
  createdAt?: string
  created_at?: string
  playlist_enabled?: boolean // Whether track is enabled for in-app playlist
}

export function TrackManager() {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null) // Ref to track current audio element
  const [searchQuery, setSearchQuery] = useState("")
  const loadingDurationsRef = useRef<Set<string>>(new Set()) // Track which tracks are loading duration
  const { toast } = useToast()

  useEffect(() => {
    fetchTracks()
    
    // Cleanup audio on unmount
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current.src = ''
        audioElementRef.current = null
      }
    }
  }, [])

  const fetchTracks = async () => {
    setLoading(true)
    try {
      // Fetch tracks directly from storage bucket
      const response = await fetch('/api/music/music-tracks')
      const data = await response.json()
      
      console.log('[TrackManager] API response:', data)
      
      if (data.error) {
        console.error('[TrackManager] API error:', data.error)
        throw new Error(data.error)
      }
      
      if (!data.tracks || data.tracks.length === 0) {
        console.warn('[TrackManager] No tracks returned from API')
        setTracks([])
        return
      }
      
      console.log(`[TrackManager] Processing ${data.tracks.length} tracks`)
      
      // Normalize track data to match our interface
      const normalizedTracks = (data.tracks || []).map((track: any) => {
        console.log('[TrackManager] Normalizing track:', track)
        return {
          id: track.id,
          title: track.title,
          artist: track.artist || null,
          duration: track.duration || null,
          file_size: track.fileSize || null,
          mood_tags: track.mood_tags || [],
          is_active: true, // Storage tracks are always active
          storage_url: track.storageUrl || track.storage_url,
          storageUrl: track.storageUrl || track.storage_url,
          storagePath: track.storagePath || track.fileName,
          fileName: track.fileName,
          created_at: track.createdAt || track.created_at,
          playlist_enabled: track.playlist_enabled || false,
        }
      })
      
      console.log(`[TrackManager] Normalized ${normalizedTracks.length} tracks`)
      setTracks(normalizedTracks)
      
      // Load duration for tracks that don't have it yet
      normalizedTracks.forEach((track) => {
        if (!track.duration && track.storageUrl && !loadingDurationsRef.current.has(track.id)) {
          loadingDurationsRef.current.add(track.id)
          loadTrackDuration(track)
        }
      })
    } catch (error: any) {
      console.error('[TrackManager] Error fetching tracks:', error)
      toast({
        title: "Failed to Load Tracks",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
        console.log(`[TrackManager] Loaded duration for ${track.title}: ${durationSeconds}s`)
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
      console.warn(`[TrackManager] Failed to load duration for ${track.title}:`, e, audio.error)
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

    const handlePlay = (track: MusicTrack) => {
    // Check if this track is already loaded (either playing or paused)
    const existingAudio = audioElementRef.current
    const trackUrl = track.storageUrl || track.storage_url
    const isSameTrack = existingAudio && trackUrl && (
      existingAudio.src === trackUrl || 
      existingAudio.src.includes(track.fileName || '') ||
      (playingTrack === track.id)
    )
    
    if (isSameTrack && existingAudio) {
      // Same track - toggle play/pause
      if (!existingAudio.paused) {
        // Currently playing - pause it
        existingAudio.pause()
        setPlayingTrack(null)
        return
      } else {
        // Currently paused - resume from current position
        existingAudio.play().catch((error) => {
          console.error('Audio playback error:', error)
          toast({
            title: "Playback Failed",
            description: "Could not resume track.",
            variant: "destructive",
          })
        })
        setPlayingTrack(track.id)
        return
      }
    }

    // Stop current track if switching to a different track
    if (audioElementRef.current && !isSameTrack) {
      audioElementRef.current.pause()
      audioElementRef.current.src = ''
      audioElementRef.current = null
    }

    // Use storageUrl if available, otherwise fall back to storage_url
    const audioUrl = track.storageUrl || track.storage_url
    if (!audioUrl) {
      toast({
        title: "Playback Failed",
        description: "No audio URL available for this track.",
        variant: "destructive",
      })
      return
    }

    console.log('[TrackManager] Playing track:', {
      title: track.title,
      fileName: track.fileName,
      storagePath: track.storagePath,
      audioUrl: audioUrl
    })

    // Create new audio element if we don't have one for this track
    const audio = audioElementRef.current || new Audio(audioUrl)
    const isNewAudio = !audioElementRef.current
    
    if (isNewAudio) {
      audio.src = audioUrl
      audio.volume = 0.5
      
      // Load duration when metadata is available (only for new audio)
      audio.addEventListener('loadedmetadata', () => {
        if (!track.duration && audio.duration && !isNaN(audio.duration)) {
          // Update track duration in state if not set
          setTracks(prevTracks => 
            prevTracks.map(t => 
              t.id === track.id 
                ? { ...t, duration: Math.floor(audio.duration) }
                : t
            )
          )
        }
      }, { once: true })

      // Track if audio successfully started playing (only for new audio)
      let hasStartedPlaying = false
      audio.addEventListener('playing', () => {
        hasStartedPlaying = true
      }, { once: true })

      audio.onended = () => {
        setPlayingTrack(null)
        // Don't clear audioElementRef so it can be resumed if needed
        // audioElementRef.current = null
      }
      
      // Error handling (only for new audio)
      audio.onerror = (e) => {
        // Only show error if audio actually failed to load/play
        // Check error codes: 1=MEDIA_ERR_ABORTED, 2=MEDIA_ERR_NETWORK, 3=MEDIA_ERR_DECODE, 4=MEDIA_ERR_SRC_NOT_SUPPORTED
        const errorCode = audio.error?.code
        
        // Wait a bit to see if audio recovers (sometimes errors fire during initial load but resolve)
        // This is especially common in local development
        setTimeout(() => {
          // Check if this is still the current audio element (might have been replaced)
          if (audioElementRef.current !== audio) {
            return // This error is for a previous audio element, ignore it
          }
          
          // Check if audio is actually playing or has loaded successfully
          const isPlaying = !audio.paused && !audio.ended && audio.currentTime > 0
          const hasLoaded = audio.readyState >= 2 // HAVE_CURRENT_DATA or higher
          
          // Only show error if audio actually failed AND isn't playing/loaded AND hasn't started playing
          // In local dev, sometimes errors fire but audio still works
          if (errorCode && errorCode >= 2 && errorCode <= 4 && !isPlaying && !hasLoaded && !hasStartedPlaying) {
            // Final check: verify the error still exists and audio really failed
            if (audio.error && audio.error.code >= 2 && audio.readyState < 2) {
              console.error('Audio playback failed:', {
                errorCode: errorCode,
                errorMessage: audio.error?.message,
                src: audio.src,
                readyState: audio.readyState,
                networkState: audio.networkState
              })
              toast({
                title: "Playback Error",
                description: `Failed to load audio file. ${audio.error?.message || 'Please check the file URL.'}`,
                variant: "destructive",
              })
              setPlayingTrack(null)
              audioElementRef.current = null
            }
          }
          // If audio is playing, loaded, or has started playing, silently ignore the error (common in local dev)
        }, 1500) // Wait 1.5 seconds to see if audio recovers (longer for local dev quirks)
      }
    }
    
    // Play the audio (will resume if paused, or start if new)
    audio.play().catch((error) => {
      console.error('Audio playback error:', error)
      toast({
        title: "Playback Failed",
        description: "Could not play track. Please check the file format and URL.",
        variant: "destructive",
      })
    })

    setAudioElement(audio)
    audioElementRef.current = audio // Update ref immediately
    setPlayingTrack(track.id)
  }

  const handleToggleActive = async (track: MusicTrack) => {
    // For storage tracks, we can't toggle active status since they're not in the database
    // This is a no-op for storage-only tracks
    toast({
      title: "Note",
      description: "Storage tracks are always active. To manage track availability, use the database tracks feature.",
      variant: "default",
    })
  }

  const handleTogglePlaylist = async (track: MusicTrack, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/music/toggle-playlist-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath: track.storagePath || track.fileName,
          fileName: track.fileName,
          enabled: enabled,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to toggle playlist status')
      }

      // Update local state
      setTracks(prevTracks =>
        prevTracks.map(t =>
          t.id === track.id
            ? { ...t, playlist_enabled: enabled }
            : t
        )
      )

      toast({
        title: enabled ? "Track Added to Playlist" : "Track Removed from Playlist",
        description: `"${track.title}" ${enabled ? 'is now' : 'is no longer'} in the in-app playlist.`,
      })
    } catch (error: any) {
      toast({
        title: "Toggle Failed",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (track: MusicTrack) => {
    if (!confirm(`Are you sure you want to delete "${track.title}"? This will permanently remove the file from storage.`)) {
      return
    }

    try {
      // Delete from storage bucket
      const response = await fetch('/api/admin/music/delete-track', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: track.fileName,
          storagePath: track.storagePath || track.fileName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete track')
      }

      toast({
        title: "Track Deleted",
        description: "Track has been removed from storage.",
      })

      fetchTracks()
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      })
    }
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
      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search tracks by name or filename..."
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
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Waveform</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>In Playlist</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTracks.map((track) => (
                <TableRow key={track.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(track)}
                    >
                      {playingTrack === track.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{track.title}</TableCell>
                  <TableCell>{track.artist || 'Unknown'}</TableCell>
                  <TableCell>
                    <Waveform 
                      bars={30} 
                      className="w-full max-w-[200px]"
                      audioElement={playingTrack === track.id ? audioElementRef.current : null}
                      isPlaying={playingTrack === track.id && audioElementRef.current && !audioElementRef.current.paused}
                    />
                  </TableCell>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={track.playlist_enabled || false}
                        onCheckedChange={(checked) => handleTogglePlaylist(track, checked)}
                        aria-label={`${track.playlist_enabled ? 'Remove from' : 'Add to'} playlist`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {track.playlist_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(track)}
                        title="Delete track from storage"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            No tracks found. Upload tracks using the "Upload Track" button above.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
