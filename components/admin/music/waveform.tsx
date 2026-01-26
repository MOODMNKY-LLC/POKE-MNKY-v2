"use client"

import { useEffect, useState, useRef } from "react"

/**
 * Waveform Visualization Component
 * Displays waveform representation of audio with progress tracking and scrubbing
 */

interface WaveformProps {
  bars?: number
  className?: string
  audioElement?: HTMLAudioElement | null
  isPlaying?: boolean
}

export function Waveform({ bars = 30, className = "", audioElement, isPlaying = false }: WaveformProps) {
  const [progress, setProgress] = useState(0)
  const [barHeights, setBarHeights] = useState<number[]>([])
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate initial random bar heights
  useEffect(() => {
    if (barHeights.length === 0) {
      const heights = Array.from({ length: bars }, () => 
        Math.random() * 40 + 10 // Heights between 10-50%
      )
      setBarHeights(heights)
    }
  }, [bars, barHeights.length])

  // Update progress when audio is playing
  useEffect(() => {
    if (!audioElement) {
      setProgress(0)
      return
    }

    const updateProgress = () => {
      if (audioElement.duration && !isNaN(audioElement.duration)) {
        const currentProgress = (audioElement.currentTime / audioElement.duration) * 100
        setProgress(currentProgress)
      }
    }

    const handleTimeUpdate = () => {
      updateProgress()
    }

    const handleLoadedMetadata = () => {
      updateProgress()
    }

    audioElement.addEventListener('timeupdate', handleTimeUpdate)
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata)
    
    // Initial update
    updateProgress()

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate)
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [audioElement, isPlaying])

  // Handle waveform scrubbing
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioElement || !containerRef.current) return
    
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const containerWidth = rect.width
    const clickPercentage = Math.max(0, Math.min(1, clickX / containerWidth))
    
    // Calculate which bar was clicked
    const clickedBarIndex = Math.floor(clickPercentage * bars)
    
    // Seek to the clicked position
    if (audioElement.duration && !isNaN(audioElement.duration)) {
      const seekTime = (clickedBarIndex / bars) * audioElement.duration
      audioElement.currentTime = seekTime
      setProgress((seekTime / audioElement.duration) * 100)
    }
  }

  // Handle hover to show preview position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const containerWidth = rect.width
    const hoverPercentage = Math.max(0, Math.min(1, mouseX / containerWidth))
    const hoverBarIndex = Math.floor(hoverPercentage * bars)
    
    setHoverIndex(hoverBarIndex)
  }

  const handleMouseLeave = () => {
    setHoverIndex(null)
  }

  // Calculate which bars should be highlighted based on progress
  const progressBarIndex = Math.floor((progress / 100) * bars)

  return (
    <div
      ref={containerRef}
      className={`flex items-end gap-0.5 h-8 cursor-pointer group ${className}`}
      onClick={handleWaveformClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      title={audioElement && audioElement.duration ? "Click to seek" : undefined}
    >
      {barHeights.map((height, i) => {
        const isPastProgress = i < progressBarIndex
        const isCurrentProgress = i === progressBarIndex
        const isHovered = hoverIndex !== null && i <= hoverIndex && i > progressBarIndex
        
        return (
          <div
            key={i}
            className={`rounded-sm flex-1 min-w-[2px] transition-all duration-150 ${
              isPastProgress 
                ? 'bg-primary' 
                : isCurrentProgress && isPlaying
                ? 'bg-primary/70'
                : isHovered
                ? 'bg-primary/40'
                : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
            }`}
            style={{
              height: `${height}%`,
            }}
          />
        )
      })}
    </div>
  )
}
