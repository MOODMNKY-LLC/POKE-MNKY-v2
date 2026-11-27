"use client"

import { useState, useEffect } from "react"
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
import { X } from "lucide-react"

export const OPEN_MOBILE_MUSIC_EVENT = "open-mobile-music"

interface MusicTrack {
  id: string
  title: string
  artist: string | null
  duration: number | null
  storageUrl: string
}

/**
 * Mobile music sheet only (no floating corner button).
 * Open via OPEN_MOBILE_MUSIC_EVENT from the header mobile menu.
 */
export function MobileMusicPlayer() {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    fetchPlaylistTracks()

    const savedEnabled = localStorage.getItem("music-player-enabled")
    if (savedEnabled === "true") {
      setIsEnabled(true)
    }

    const interval = setInterval(() => {
      fetchPlaylistTracks()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onOpen = () => setIsOpen(true)
    window.addEventListener(OPEN_MOBILE_MUSIC_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_MOBILE_MUSIC_EVENT, onOpen)
  }, [])

  const fetchPlaylistTracks = async () => {
    try {
      const response = await fetch("/api/music/music-tracks")
      const data = await response.json()

      const enabledTracks = (data.tracks || []).filter(
        (track: { playlist_enabled?: boolean }) => track.playlist_enabled === true,
      )
      const mappedTracks = enabledTracks.map(
        (track: {
          id: string
          title: string
          artist?: string | null
          duration?: number | null
          storageUrl?: string
          storage_url?: string
        }) => ({
          id: track.id,
          title: track.title,
          artist: track.artist || null,
          duration: track.duration || null,
          storageUrl: track.storageUrl || track.storage_url || "",
        }),
      )

      setTracks(mappedTracks)

      if (mappedTracks.length > 0 && currentTrackIndex >= mappedTracks.length) {
        setCurrentTrackIndex(0)
      }
    } catch (error) {
      console.error("Failed to fetch playlist tracks:", error)
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
    localStorage.setItem("music-player-enabled", String(isEnabled))
  }, [isEnabled])

  return (
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
                  `${tracks.length} track${tracks.length !== 1 ? "s" : ""} available`
                )}
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close music player">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {currentTrack && isEnabled ? (
            <AudioPlayer key={currentTrack.id}>
              <AudioPlayerElement src={currentTrack.storageUrl} onEnded={handleEnded} />
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
              <p className="text-center text-sm text-muted-foreground">
                {tracks.length} track{tracks.length !== 1 ? "s" : ""} available
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
  )
}
