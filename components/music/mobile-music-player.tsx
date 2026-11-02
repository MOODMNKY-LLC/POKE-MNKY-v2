"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
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
import { Music2, X } from "lucide-react"

interface MusicTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
  storageUrl: string
}

export function MobileMusicPlayer() {
  const onDashboard = usePathname().startsWith("/dashboard")
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)

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
      const data = await response.json()
      
      const enabledTracks = (data.tracks || []).filter((track: any) => track.playlist_enabled === true)
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
      console.error('Failed to fetch playlist tracks:', error)
    }
  }

  const currentTrack = tracks[currentTrackIndex] || null

  const handleNext = () => {
    if (tracks.length === 0) return
    setCurrentTrackIndex((prev) => {
      if (prev >= tracks.length - 1) {
        return 0
      }
      return prev + 1
    })
  }

  const handleEnded = () => {
    handleNext()
  }

  useEffect(() => {
    localStorage.setItem('music-player-enabled', String(isEnabled))
  }, [isEnabled])

  // Always show the button, even if no tracks (so it's visible in production)
  return (
    <>
      {/* Floating Button - Always Visible on Mobile */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed left-[calc(1rem+env(safe-area-inset-left))] z-[45] h-12 w-12 rounded-full shadow-lg bg-background xl:hidden",
          onDashboard
            ? "bottom-[calc(var(--mobile-tab-bar-height)+1rem)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
        )}
        onClick={() => setIsOpen(true)}
        title={tracks.length === 0 ? "Music Player (No tracks available)" : "Music Player"}
      >
        <Music2 className="h-5 w-5" />
      </Button>

      {/* Sheet Modal for Mobile */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Music Player</SheetTitle>
                <SheetDescription>
                  {currentTrack ? (
                    <>
                      {currentTrack.title}
                      {currentTrack.artist && ` • ${currentTrack.artist}`}
                    </>
                  ) : (
                    `${tracks.length} track${tracks.length !== 1 ? 's' : ''} available`
                  )}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {currentTrack && isEnabled ? (
              <AudioPlayer key={currentTrack.id}>
                <AudioPlayerElement
                  src={currentTrack.storageUrl}
                  onEnded={handleEnded}
                />
                <AudioPlayerControlBar>
                  <AudioPlayerPlayButton />
                  <AudioPlayerSeekBackwardButton seekOffset={10} />
                  <AudioPlayerSeekForwardButton seekOffset={10} />
                  <AudioPlayerTimeDisplay />
                  <AudioPlayerTimeRange />
                  <AudioPlayerDurationDisplay />
                  <AudioPlayerMuteButton />
                  <AudioPlayerVolumeRange />
                </AudioPlayerControlBar>
              </AudioPlayer>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {tracks.length} track{tracks.length !== 1 ? 's' : ''} available
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    setIsEnabled(true)
                    if (tracks.length > 0) {
                      setCurrentTrackIndex(0)
                    }
                  }}
                >
                  Enable Music
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
