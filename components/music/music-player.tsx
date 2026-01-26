"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Music2, ChevronDown, X, Shuffle, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"

interface MusicTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
  storageUrl: string
}

export function MusicPlayer() {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0)
  const [isMinimized, setIsMinimized] = useState(true)
  const [isEnabled, setIsEnabled] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<'none' | 'track' | 'playlist'>('none')

  useEffect(() => {
    // Load enabled tracks from playlist
    fetchPlaylistTracks()
    
    // Load preferences from localStorage
    const savedEnabled = localStorage.getItem('music-player-enabled')
    const savedShuffle = localStorage.getItem('music-player-shuffle')
    const savedRepeat = localStorage.getItem('music-player-repeat')
    
    if (savedEnabled === 'true') {
      setIsEnabled(true)
      setIsMinimized(false)
    }
    if (savedShuffle === 'true') {
      setShuffle(true)
    }
    if (savedRepeat) {
      setRepeat(savedRepeat as 'none' | 'track' | 'playlist')
    }
  }, [])

  const fetchPlaylistTracks = async () => {
    try {
      const response = await fetch('/api/music/music-tracks')
      const data = await response.json()
      
      // Only get enabled tracks
      const enabledTracks = (data.tracks || []).filter((track: any) => track.playlist_enabled === true)
      const mappedTracks = enabledTracks.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist || null,
        duration: track.duration || null,
        storageUrl: track.storageUrl || track.storage_url,
      }))
      
      setTracks(mappedTracks)
      
      // Reset to first track if current index is out of bounds
      if (mappedTracks.length > 0 && currentTrackIndex >= mappedTracks.length) {
        setCurrentTrackIndex(0)
      }
    } catch (error) {
      console.error('Failed to fetch playlist tracks:', error)
    }
  }

  const currentTrack = tracks[currentTrackIndex] || null

  const handleNext = () => {
    if (tracks.length === 0) return
    
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length)
      setCurrentTrackIndex(randomIndex)
    } else {
      setCurrentTrackIndex((prev) => {
        if (prev >= tracks.length - 1) {
          return repeat === 'playlist' ? 0 : prev
        }
        return prev + 1
      })
    }
  }

  const handlePrevious = () => {
    if (tracks.length === 0) return
    
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length)
      setCurrentTrackIndex(randomIndex)
    } else {
      setCurrentTrackIndex((prev) => {
        if (prev <= 0) {
          return repeat === 'playlist' ? tracks.length - 1 : 0
        }
        return prev - 1
      })
    }
  }

  const handleEnded = () => {
    if (repeat === 'track') {
      // Replay current track - handled by media-chrome
      return
    } else if (repeat === 'playlist' || currentTrackIndex < tracks.length - 1) {
      handleNext()
    }
  }

  const toggleShuffle = () => {
    setShuffle(!shuffle)
    localStorage.setItem('music-player-shuffle', String(!shuffle))
  }

  const toggleRepeat = () => {
    const nextRepeat = repeat === 'none' ? 'playlist' : repeat === 'playlist' ? 'track' : 'none'
    setRepeat(nextRepeat)
    localStorage.setItem('music-player-repeat', nextRepeat)
  }

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('music-player-enabled', String(isEnabled))
  }, [isEnabled])

  // Don't render if no tracks
  if (tracks.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 sm:bottom-6 sm:left-6">
      {isMinimized ? (
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setIsMinimized(false)}
        >
          <Music2 className="h-5 w-5" />
        </Button>
      ) : (
        <Card className="shadow-lg">
          <CardContent className="p-3">
            {currentTrack && isEnabled ? (
              <div className="flex items-center gap-3">
                {/* Track Info */}
                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                  <Music2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{currentTrack.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentTrack.artist || 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Audio Player - Inline */}
                <div className="flex-1 min-w-0">
                  <AudioPlayer key={currentTrack.id} className="w-full">
                    <AudioPlayerElement
                      src={currentTrack.storageUrl}
                      onEnded={handleEnded}
                    />
                    <AudioPlayerControlBar>
                      <AudioPlayerSeekBackwardButton seekOffset={10} />
                      <AudioPlayerPlayButton />
                      <AudioPlayerSeekForwardButton seekOffset={10} />
                      <AudioPlayerTimeDisplay />
                      <AudioPlayerTimeRange />
                      <AudioPlayerDurationDisplay />
                      <AudioPlayerMuteButton />
                      <AudioPlayerVolumeRange />
                    </AudioPlayerControlBar>
                  </AudioPlayer>
                </div>

                {/* Compact Controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", shuffle && "bg-primary text-primary-foreground")}
                    onClick={toggleShuffle}
                    title="Shuffle"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", repeat !== 'none' && "bg-primary text-primary-foreground")}
                    onClick={toggleRepeat}
                    title={`Repeat: ${repeat}`}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsMinimized(true)}
                    title="Minimize"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setIsEnabled(false)
                      setIsMinimized(true)
                    }}
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Music2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {tracks.length} track{tracks.length !== 1 ? 's' : ''} available
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsEnabled(true)
                    if (tracks.length > 0) {
                      setCurrentTrackIndex(0)
                    }
                  }}
                >
                  Enable
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
