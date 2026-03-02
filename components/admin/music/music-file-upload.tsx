"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, Music2, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB (matches Supabase bucket limit; direct upload bypasses Vercel 4.5MB)
const ACCEPT_AUDIO = "audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/webm,audio/mp4,audio/x-m4a"

export interface MusicFileUploadProps {
  onUploadComplete?: () => void
  className?: string
}

export function MusicFileUpload({ onUploadComplete, className }: MusicFileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [moodTags, setMoodTags] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  const resetForm = useCallback(() => {
    setFile(null)
    setTitle("")
    setArtist("")
    setMoodTags("")
    setUploadProgress(0)
  }, [])

  const handleFile = useCallback((selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      return
    }
    if (!selectedFile.type.startsWith("audio/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an audio file (MP3, OGG, WAV, WebM, M4A).",
        variant: "destructive",
      })
      return
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `Maximum file size is 50 MB. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB.`,
        variant: "destructive",
      })
      return
    }
    setFile(selectedFile)
    if (!title.trim()) {
      const base = selectedFile.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")
      setTitle(base)
    }
  }, [title, toast])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const f = e.dataTransfer.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      handleFile(f || null)
    },
    [handleFile]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast({
        title: "No file selected",
        description: "Choose an audio file to upload.",
        variant: "destructive",
      })
      return
    }
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Enter a title for the track.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setUploadProgress(10)

    try {
      const supabase = createClient()

      // Generate storage path (same logic as legacy API)
      const sanitizedTitle = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      const fileExt = file.name.split(".").pop() || "mp3"
      const fileName = `${Date.now()}-${sanitizedTitle}.${fileExt}`
      const storagePath = `tracks/${fileName}`

      setUploadProgress(20)

      // Upload directly to Supabase Storage (bypasses Vercel 4.5MB body limit)
      const { error: uploadError } = await supabase.storage
        .from("music-tracks")
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        })

      setUploadProgress(70)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Create DB record via API (metadata only, small payload)
      const response = await fetch("/api/admin/music/create-track-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath,
          title: title.trim(),
          artist: artist.trim() || "Unknown Artist",
          moodTags: moodTags.trim(),
          fileSize: file.size,
        }),
      })

      setUploadProgress(90)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save track metadata")
      }

      setUploadProgress(100)
      toast({
        title: "Track uploaded",
        description: `"${title}" has been added to the music library.`,
      })
      resetForm()
      onUploadComplete?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed"
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drag and drop zone - Supabase UI style */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "relative rounded-xl border-2 border-dashed p-8 transition-colors",
            dragActive && "border-primary bg-primary/5",
            !dragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
            uploading && "pointer-events-none opacity-70"
          )}
        >
          <input
            type="file"
            accept={ACCEPT_AUDIO}
            onChange={onInputChange}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            disabled={uploading}
            id="music-file-upload"
          />
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Uploading to storage…</p>
                <Progress value={uploadProgress} className="w-full max-w-xs" />
              </>
            ) : file ? (
              <>
                <Music2 className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB · {file.type}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    setFile(null)
                  }}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Drag and drop or click to upload</p>
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 50 MB · MP3, OGG, WAV, WebM, M4A
                </p>
              </>
            )}
          </div>
        </div>

        {/* Metadata fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="upload-title">Title *</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Track title"
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-artist">Artist</Label>
            <Input
              id="upload-artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Unknown Artist"
              disabled={uploading}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="upload-mood">Mood tags (comma-separated)</Label>
          <Input
            id="upload-mood"
            value={moodTags}
            onChange={(e) => setMoodTags(e.target.value)}
            placeholder="e.g. chill, lofi, focus"
            disabled={uploading}
          />
        </div>

        <Button type="submit" disabled={!file || uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload to music library
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
