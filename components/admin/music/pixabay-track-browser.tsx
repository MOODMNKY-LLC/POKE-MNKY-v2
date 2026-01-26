"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, 
  Download, 
  Play, 
  Pause, 
  Loader2, 
  Music2,
  Clock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { PixabayClient, type PixabayMusicTrack } from "@/lib/pixabay/client"
import { Waveform } from "./waveform"

export function PixabayTrackBrowser() {
  const [query, setQuery] = useState("pokemon lofi")
  const [tracks, setTracks] = useState<PixabayMusicTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<Set<number>>(new Set())
  const [playingTrack, setPlayingTrack] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [page, setPage] = useState(1)
  const [totalHits, setTotalHits] = useState(0)
  const { toast } = useToast()
  const [trackDetailsCache, setTrackDetailsCache] = useState<Map<number, PixabayMusicTrack>>(new Map())
  
  // Create PixabayClient instance once using useMemo
  const pixabayClient = useMemo(() => new PixabayClient(), [])

  const searchTracks = async (searchQuery: string, pageNum: number = 1) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/music/search-pixabay?q=${encodeURIComponent(searchQuery)}&page=${pageNum}&per_page=20`
      )

      if (!response.ok) {
        throw new Error('Failed to search tracks')
      }

      const data = await response.json()
      
      // Check if we got any results
      if (!data.hits || data.hits.length === 0) {
        toast({
          title: "No Music Tracks Found",
          description: "Pixabay's API does not support music search. Only images and videos are available via their API. Music tracks must be manually curated or accessed through alternative methods.",
          variant: "default",
        })
      } else {
        // Log the first track to debug structure
        console.log('[Pixabay API Response] First track:', JSON.stringify(data.hits[0], null, 2))
        
        // Verify we actually got music tracks (not images)
        const hasMusicTracks = data.hits.some((hit: PixabayMusicTrack) => {
          const pageURL = hit.pageURL?.toLowerCase() || ''
          return pageURL.includes('/music/')
        })
        
        if (!hasMusicTracks && data.hits.length > 0) {
          toast({
            title: "Warning: Non-Music Results",
            description: "Pixabay API returned images instead of music tracks. Pixabay's API does not support music search - only images and videos are available.",
            variant: "destructive",
          })
        }
      }
      
      setTracks(data.hits || [])
      setTotalHits(data.totalHits || 0)
      setPage(pageNum)
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial search
    searchTracks(query)
  }, [])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const handleDownload = async (track: PixabayMusicTrack) => {
    setDownloading(prev => new Set(prev).add(track.id))

    try {
      // Stop playing if this track is playing
      if (playingTrack === track.id && audioRef.current) {
        audioRef.current.pause()
        setPlayingTrack(null)
      }

      const response = await fetch('/api/admin/music/download-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixabayId: track.id,
          pixabayUrl: track.pageURL,
          title: track.title,
          artist: track.user,
          moodTags: track.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            title: "Track Already Exists",
            description: "This track has already been downloaded.",
            variant: "default",
          })
        } else {
          throw new Error(data.error || 'Download failed')
        }
      } else {
        toast({
          title: "Download Successful",
          description: `"${track.title}" has been added to your library.`,
        })
      }
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDownloading(prev => {
        const next = new Set(prev)
        next.delete(track.id)
        return next
      })
    }
  }

  // Synchronous check for formats (for UI display)
  const hasFormats = (track: PixabayMusicTrack): boolean => {
    const cachedTrack = trackDetailsCache.get(track.id)
    const trackToUse = cachedTrack || track
    const formats = trackToUse.formats || {}
    return Object.keys(formats).length > 0
  }

  // Async function to get track URL
  // IMPORTANT: Pixabay doesn't provide direct streaming URLs for music.
  // We need to check if the track is already downloaded to our storage first.
  const getTrackUrl = async (track: PixabayMusicTrack): Promise<string | null> => {
    // First, check if track is already downloaded to our storage
    try {
      const response = await fetch(`/api/music/tracks?pixabay_id=${track.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.tracks && data.tracks.length > 0 && data.tracks[0].storage_url) {
          console.log('[getTrackUrl] Found downloaded track in storage:', data.tracks[0].storage_url)
          return data.tracks[0].storage_url
        }
      }
    } catch (error) {
      console.warn('[getTrackUrl] Failed to check downloaded tracks:', error)
    }

    // If not downloaded, check Pixabay API for formats (though they may be empty)
    let cachedTrack = trackDetailsCache.get(track.id)
    let trackToUse = cachedTrack || track
    
    let formats = trackToUse.formats || {}
    
    // If formats are empty, fetch track details from Pixabay API
    if (Object.keys(formats).length === 0) {
      console.log('[getTrackUrl] Formats empty, fetching track details for:', track.id)
      try {
        const response = await fetch(`/api/admin/music/get-track-details?id=${track.id}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[getTrackUrl] API error:', response.status, errorData)
          return null
        }
        
        const detailData = await response.json()
        console.log('[getTrackUrl] Full track details response:', JSON.stringify(detailData, null, 2))
        
        if (detailData.track) {
          // Check if formats exist in the response
          if (detailData.track.formats && Object.keys(detailData.track.formats).length > 0) {
            formats = detailData.track.formats
            cachedTrack = detailData.track
            setTrackDetailsCache(prev => new Map(prev).set(track.id, detailData.track))
            console.log('[getTrackUrl] Fetched track details, formats:', Object.keys(formats))
          } else {
            // Pixabay music API doesn't provide streaming URLs
            // Tracks must be downloaded first
            console.warn('[getTrackUrl] No formats found - Pixabay music requires download first')
            return null
          }
        } else {
          console.error('[getTrackUrl] No track in response:', detailData)
        }
      } catch (error) {
        console.error('[getTrackUrl] Failed to fetch track details:', error)
        return null
      }
    }
    
    // Update trackToUse with fetched formats if we got them
    if (cachedTrack && Object.keys(formats).length > 0) {
      trackToUse = { ...trackToUse, formats }
    }
    
    // Use PixabayClient's getBestFormatUrl method
    const url = pixabayClient.getBestFormatUrl(trackToUse)
    
    if (url) {
      console.log('[getTrackUrl] Found URL via getBestFormatUrl:', url)
      return url
    }

    // No URL available - track needs to be downloaded first
    console.warn('[getTrackUrl] No URL found for track:', track.id, '- track must be downloaded first')
    return null
  }

  const handlePlayTrack = async (track: PixabayMusicTrack) => {
    // Stop current track if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current.load()
      // Remove all event listeners by creating new element
      audioRef.current = null
    }

    if (playingTrack === track.id) {
      console.log('[Play] Pausing track')
      setPlayingTrack(null)
      return
    }

    // Show loading state
    setPlayingTrack(track.id)

    const trackUrl = await getTrackUrl(track)
    console.log('[Play] Track URL:', trackUrl)

    if (!trackUrl) {
      toast({
        title: "Preview Unavailable",
        description: "Could not retrieve preview URL from Pixabay. The track may need to be downloaded first, or Pixabay may not provide streaming access.",
        variant: "default",
      })
      setPlayingTrack(null)
      return
    }

    // Use proxy route to avoid CORS issues
    // If URL is from Pixabay CDN, use our proxy; otherwise use direct URL
    const audioSrc = trackUrl.includes('pixabay.com') || trackUrl.includes('cdn.pixabay.com')
      ? `/api/admin/music/proxy-audio?url=${encodeURIComponent(trackUrl)}`
      : trackUrl

    console.log('[Play] Original URL:', trackUrl)
    console.log('[Play] Using audio source:', audioSrc)

    // Validate URL format
    try {
      new URL(trackUrl)
    } catch (e) {
      console.error('[Play] Invalid URL format:', trackUrl)
      toast({
        title: "Invalid Audio URL",
        description: "The track URL is invalid. Please try downloading the track first.",
        variant: "default",
      })
      setPlayingTrack(null)
      return
    }

    // Create new audio element
    const audio = new Audio(audioSrc)
    audio.volume = 0.5
    audio.preload = "auto"
    audio.crossOrigin = "anonymous" // Required for CORS
    
    // Add loadstart event to verify the audio is loading
    audio.addEventListener('loadstart', () => {
      console.log('[Play] Audio load started, src:', audio.src)
    })
    
    // Add loadedmetadata event to verify metadata loaded
    audio.addEventListener('loadedmetadata', () => {
      console.log('[Play] Audio metadata loaded:', {
        duration: audio.duration,
        readyState: audio.readyState,
        networkState: audio.networkState,
      })
    })
    
    // Add canplay event to verify audio can play
    audio.addEventListener('canplay', () => {
      console.log('[Play] Audio can play, readyState:', audio.readyState)
    })
    
    // Add canplaythrough event
    audio.addEventListener('canplaythrough', () => {
      console.log('[Play] Audio can play through')
    })
    
    // Add stalled event to detect network issues
    audio.addEventListener('stalled', () => {
      console.warn('[Play] Audio stalled - network issue?', {
        networkState: audio.networkState,
        readyState: audio.readyState,
      })
    })
    
    // Add suspend event
    audio.addEventListener('suspend', () => {
      console.warn('[Play] Audio loading suspended')
    })
    
    // Add waiting event
    audio.addEventListener('waiting', () => {
      console.warn('[Play] Audio waiting for data')
    })
    
    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement
      const errorDetails = {
        error: audioElement.error,
        errorCode: audioElement.error?.code,
        errorMessage: audioElement.error?.message,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState,
        src: audioElement.src,
        currentSrc: audioElement.currentSrc,
      }
      console.error('Audio playback error:', errorDetails)
      console.error('Audio element state:', {
        networkState: audioElement.networkState, // 0=EMPTY, 1=IDLE, 2=LOADING, 3=NO_SOURCE
        readyState: audioElement.readyState, // 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
        error: audioElement.error,
      })
      
      let errorMessage = "Could not play track."
      if (audioElement.error) {
        switch (audioElement.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Playback was aborted."
            break
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Network error. The track may be unavailable or blocked by CORS."
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "Audio decoding error. The file format may be unsupported."
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Audio format not supported. The URL may be invalid or require authentication."
            break
          default:
            errorMessage = `Playback error (code: ${audioElement.error.code}). The track may be unavailable.`
        }
      }
      
      toast({
        title: "Playback Failed",
        description: errorMessage,
        variant: "default",
      })
      setPlayingTrack(null)
      audioRef.current = null
    }

    const handleEnded = () => {
      setPlayingTrack(null)
      audioRef.current = null
    }

    audio.addEventListener('error', handleError)
    audio.addEventListener('ended', handleEnded)

    audio.play().catch((error) => {
      console.error('Play failed:', error)
      toast({
        title: "Playback Failed",
        description: "Could not play track. Check your browser's autoplay settings or try downloading the track.",
        variant: "default",
      })
      setPlayingTrack(null)
      audioRef.current = null
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('ended', handleEnded)
    })

    audioRef.current = audio
    setPlayingTrack(track.id)
  }

  // Generate gradient colors for album art thumbnails
  const getThumbnailGradient = (id: number) => {
    const gradients = [
      "from-blue-400 to-green-400",
      "from-blue-500 to-blue-600",
      "from-yellow-400 to-orange-400",
      "from-purple-400 to-pink-400",
      "from-green-400 to-teal-400",
      "from-red-400 to-pink-400",
      "from-indigo-400 to-purple-400",
      "from-orange-400 to-red-400",
    ]
    return gradients[id % gradients.length]
  }

  const formatDuration = (seconds: number | undefined | null) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPrimaryTag = (tags: string) => {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
    return tagList[0] || 'Music'
  }

  const getSecondaryTags = (tags: string) => {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
    return tagList.slice(1).join(', ')
  }

  const [downloadingPage, setDownloadingPage] = useState(false)

  const handleDownloadPage = async () => {
    const searchUrl = 'https://pixabay.com/music/search/pokemon%20lofi/'
    setDownloadingPage(true)
    
    try {
      const response = await fetch('/api/admin/music/download-pixabay-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Download failed')
      }

      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${data.tracksProcessed} tracks from Pixabay. Found ${data.tracksFound} total tracks.`,
      })

      // Refresh the tracks list if we're on the tracks tab
      // (This would require parent component coordination, but for now just show success)
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || 'Failed to download tracks from Pixabay',
        variant: "destructive",
      })
    } finally {
      setDownloadingPage(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Download Page Button */}
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Pixabay API doesn't support music search. Download tracks directly from the search page.
          </span>
          <Button
            onClick={handleDownloadPage}
            disabled={downloadingPage}
            size="sm"
            variant="outline"
            className="ml-4"
          >
            {downloadingPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download First Page
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>

      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search for music tracks (e.g., 'pokemon lofi', 'chill beats')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              searchTracks(query, 1)
            }
          }}
          className="flex-1"
        />
        <Button onClick={() => searchTracks(query, 1)} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Results Count */}
      {totalHits > 0 && (
        <p className="text-sm text-muted-foreground">
          Found {totalHits} tracks
        </p>
      )}

      {/* Tracks List */}
      {tracks.length > 0 ? (
        <div className="space-y-2">
          {tracks.map((track) => {
            // Check if we have cached details with formats, or if track has formats
            const trackHasFormats = hasFormats(track)
            const isPlaying = playingTrack === track.id
            const gradient = getThumbnailGradient(track.id)
            const primaryTag = getPrimaryTag(track.tags)
            const secondaryTags = getSecondaryTags(track.tags)
            
            // Use PixabayClient helper to get the best track title
            // This handles API title, URL extraction, and fallbacks
            const trackName = pixabayClient.getTrackTitle(track)
            const artistName = track.user || 'Unknown Artist'
            
            // Debug: Log if title extraction failed
            if (trackName === 'Untitled Track') {
              console.warn('[PixabayTrackBrowser] Failed to extract title for track:', {
                id: track.id,
                title: track.title,
                pageURL: track.pageURL,
                allKeys: Object.keys(track)
              })
            }

            return (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                onClick={(e) => {
                  // Prevent parent div from interfering with button clicks
                  e.stopPropagation()
                }}
              >
                {/* Play/Pause Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('[Button Click] Track clicked:', track.id, 'hasFormats:', trackHasFormats)
                    handlePlayTrack(track)
                  }}
                  className={cn(
                    "w-14 h-14 rounded-lg bg-gradient-to-br flex items-center justify-center transition-all shrink-0 relative z-10",
                    gradient,
                    isPlaying && "ring-2 ring-primary ring-offset-2",
                    "cursor-pointer hover:opacity-90 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  )}
                  type="button"
                  aria-label={isPlaying ? "Pause track" : "Play track"}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 text-white pointer-events-none" />
                  ) : (
                    <Play className="h-6 w-6 text-white ml-0.5 pointer-events-none" />
                  )}
                </button>

                {/* Track Name & Artist (Subtext) */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1 max-w-[200px]">
                  <h3 className="font-semibold text-sm truncate leading-tight">{trackName}</h3>
                  <p className="text-xs text-muted-foreground truncate leading-tight">
                    {artistName}
                  </p>
                </div>

                {/* Waveform */}
                <div className="flex-1 min-w-0 max-w-md hidden md:flex items-center">
                  <Waveform bars={40} />
                </div>

                {/* Duration */}
                <div className="shrink-0 text-sm text-muted-foreground flex items-center gap-1 min-w-[60px]">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{formatDuration(track.duration)}</span>
                </div>

                {/* Description/Tags */}
                <div className="shrink-0 min-w-[150px] max-w-[250px] hidden lg:flex items-center">
                  <div className="flex flex-col gap-0.5 w-full">
                    <span className="text-sm font-medium truncate">{primaryTag}</span>
                    {secondaryTags && (
                      <span className="text-xs text-muted-foreground truncate">
                        {secondaryTags}
                      </span>
                    )}
                  </div>
                </div>

                {/* Download Button */}
                <div className="shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(track)
                    }}
                    disabled={downloading.has(track.id)}
                    className="h-8 w-8 p-0"
                    type="button"
                  >
                    {downloading.has(track.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : !loading && (
        <Alert>
          <Music2 className="h-4 w-4" />
          <AlertDescription>
            No tracks found. Try a different search query.
          </AlertDescription>
        </Alert>
      )}

      {/* Pagination */}
      {totalHits > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => searchTracks(query, page - 1)}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(totalHits / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => searchTracks(query, page + 1)}
            disabled={page >= Math.ceil(totalHits / 20) || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
