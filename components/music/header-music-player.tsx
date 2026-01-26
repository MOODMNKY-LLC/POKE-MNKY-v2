"use client"

import { useState, useEffect, useRef } from "react"
import {
  AudioPlayer,
  AudioPlayerElement,
  AudioPlayerControlBar,
  AudioPlayerPlayButton,
  AudioPlayerSeekBackwardButton,
  AudioPlayerSeekForwardButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
  AudioPlayerDurationDisplay,
  AudioPlayerMuteButton,
  AudioPlayerVolumeRange,
} from "@/components/ai-elements/audio-player"
import { ScrollingText } from "@/components/ui/scrolling-text"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Music2, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MusicTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
  storageUrl: string
}

export function HeaderMusicPlayer() {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchPlaylistTracks()
    
    const savedEnabled = localStorage.getItem('music-player-enabled')
    if (savedEnabled === 'true') {
      setIsEnabled(true)
    }
    
    // Refresh tracks periodically to catch newly enabled tracks
    const interval = setInterval(() => {
      fetchPlaylistTracks()
    }, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const fetchPlaylistTracks = async () => {
    try {
      const response = await fetch('/api/music/music-tracks')
      if (!response.ok) {
        console.error('[HeaderMusicPlayer] API error:', response.status, response.statusText)
        return
      }
      const data = await response.json()
      
      if (data.error) {
        console.error('[HeaderMusicPlayer] API returned error:', data.error)
        return
      }
      
      const enabledTracks = (data.tracks || []).filter((track: any) => track.playlist_enabled === true)
      console.log('[HeaderMusicPlayer] Found', enabledTracks.length, 'enabled tracks out of', (data.tracks || []).length, 'total')
      
      const mappedTracks = enabledTracks.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist || null,
        duration: track.duration || null,
        storageUrl: track.storageUrl || track.storage_url,
      }))
      
      setTracks(mappedTracks)
      
      if (mappedTracks.length > 0 && currentTrackIndex >= mappedTracks.length) {
        setCurrentTrackIndex(0)
      }
    } catch (error) {
      console.error('[HeaderMusicPlayer] Failed to fetch playlist tracks:', error)
    }
  }

  const currentTrack = tracks[currentTrackIndex] || null

  const handleNext = () => {
    if (tracks.length === 0) return
    setCurrentTrackIndex((prev) => {
      if (prev >= tracks.length - 1) {
        return 0 // Loop back to start
      }
      return prev + 1
    })
  }

  const handlePrevious = () => {
    if (tracks.length === 0) return
    setCurrentTrackIndex((prev) => {
      if (prev <= 0) {
        return tracks.length - 1 // Loop to end
      }
      return prev - 1
    })
  }

  const handleEnded = () => {
    // Infinite loop - always go to next track
    handleNext()
  }

  // Handle play/pause from header button
  const handlePlayPause = () => {
    // Find the audio element via media-controller (works whether popover is open or closed)
    const mediaController = document.querySelector('media-controller[audio]') as any
    if (mediaController) {
      const playButton = mediaController.querySelector('media-play-button') as any
      if (playButton) {
        playButton.click()
      } else {
        // Fallback: directly control audio element
        const audio = mediaController.querySelector('audio') as HTMLAudioElement
        if (audio) {
          if (audio.paused) {
            audio.play().then(() => setIsPlaying(true)).catch(console.error)
          } else {
            audio.pause()
            setIsPlaying(false)
          }
        }
      }
    } else if (audioRef.current) {
      // Fallback: use ref if available
      if (audioRef.current.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error)
      } else {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  // Listen for play/pause events to update state
  useEffect(() => {
    if (!currentTrack) return
    
    // Use a small delay to ensure media-controller is rendered (when popover opens)
    const timeoutId = setTimeout(() => {
      const mediaController = document.querySelector('media-controller[audio]') as any
      if (mediaController) {
        const audio = mediaController.querySelector('audio') as HTMLAudioElement
        if (audio) {
          const updatePlayingState = () => setIsPlaying(!audio.paused)
          audio.addEventListener('play', updatePlayingState)
          audio.addEventListener('pause', updatePlayingState)
          setIsPlaying(!audio.paused)
          
          // Store ref for header button access
          audioRef.current = audio
          
          return () => {
            audio.removeEventListener('play', updatePlayingState)
            audio.removeEventListener('pause', updatePlayingState)
          }
        }
      }
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [currentTrack, isOpen])

  useEffect(() => {
    localStorage.setItem('music-player-enabled', String(isEnabled))
  }, [isEnabled])

  // Auto-play when track changes and is enabled
  useEffect(() => {
    if (isEnabled && currentTrack && audioRef.current) {
      // Reset and play new track
      audioRef.current.load()
      audioRef.current.play().catch((e) => {
        console.log('Auto-play prevented:', e)
      })
    }
  }, [currentTrackIndex, isEnabled, currentTrack])

  // Always show something - even if no tracks, show the enable button
  // This ensures the music player is visible in production
  if (tracks.length === 0) {
    return (
      <div className="hidden xl:flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Try to fetch tracks again when user clicks
            fetchPlaylistTracks()
            setIsEnabled(true)
          }}
          className="h-8 gap-1.5 text-xs"
          title="No tracks available. Click to refresh."
        >
          <Music2 className="h-3.5 w-3.5" />
          <span className="hidden 2xl:inline">Music</span>
        </Button>
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <div className="hidden xl:flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsEnabled(true)
            if (tracks.length > 0) {
              setCurrentTrackIndex(0)
            }
          }}
          className="h-8 gap-1.5 text-xs"
        >
          <Music2 className="h-3.5 w-3.5" />
          <span className="hidden 2xl:inline">Music</span>
        </Button>
      </div>
    )
  }

  if (!currentTrack) {
    // If enabled but no current track, show enable button again
    return (
      <div className="hidden xl:flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            fetchPlaylistTracks()
            if (tracks.length > 0) {
              setCurrentTrackIndex(0)
            }
          }}
          className="h-8 gap-1.5 text-xs"
        >
          <Music2 className="h-3.5 w-3.5" />
          <span className="hidden 2xl:inline">Music</span>
        </Button>
      </div>
    )
  }

  const trackInfo = `${currentTrack.title}${currentTrack.artist ? ` • ${currentTrack.artist}` : ''}`

  return (
    <div className="hidden xl:flex items-center gap-2 -ml-2">
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handlePlayPause}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Track Info with Scrolling Text */}
        <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
          <ScrollingText
            text={trackInfo}
            speed={30}
            pauseOnHover={true}
            className="text-xs text-muted-foreground"
            maxWidth="160px"
          />
        </div>

        {/* Music Icon - Opens Popover with Full Controls */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Music player controls"
            >
              <Music2 className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[420px] p-6" 
            align="end"
            side="bottom"
            sideOffset={8}
          >
          <div className="space-y-5">
            {/* Track Info */}
            <div className="space-y-1">
              <p className="text-base font-medium truncate">{currentTrack.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {currentTrack.artist || 'Local Track'}
              </p>
            </div>

            {/* Full Audio Player Controls - Improved layout for popout */}
            <div className="space-y-3 overflow-hidden">
              <AudioPlayer key={`popover-${currentTrack.id}`} className="w-full" style={{ maxWidth: '100%' }}>
                <AudioPlayerElement
                  src={currentTrack.storageUrl}
                  onEnded={handleEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedMetadata={(e) => {
                    audioRef.current = e.currentTarget
                  }}
                />
                {/* Playback Controls Row */}
                <AudioPlayerControlBar className="flex items-center gap-2 overflow-hidden">
                  <AudioPlayerPlayButton />
                  <AudioPlayerSeekBackwardButton seekOffset={10} />
                  <AudioPlayerSeekForwardButton seekOffset={10} />
                  <AudioPlayerTimeDisplay />
                  <AudioPlayerTimeRange className="flex-1 min-w-0" />
                  <AudioPlayerDurationDisplay />
                </AudioPlayerControlBar>
                
                {/* Volume Controls Row */}
                <AudioPlayerControlBar className="flex items-center gap-2 overflow-hidden mt-2">
                  <AudioPlayerMuteButton />
                  <AudioPlayerVolumeRange className="flex-1 min-w-0 max-w-[200px]" />
                </AudioPlayerControlBar>
              </AudioPlayer>
            </div>

            {/* Track Navigation */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {currentTrackIndex + 1} / {tracks.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={handlePrevious}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={handleNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
