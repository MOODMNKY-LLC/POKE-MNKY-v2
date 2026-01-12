"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Upload, Check } from "lucide-react"
import { toast } from "sonner"

interface FileDropzoneProps {
  bucket: string
  path?: string
  maxSize?: number
  accept?: string
  onUploadComplete?: (url: string) => void
}

export function FileDropzone({
  bucket,
  path = "",
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = "image/*",
  onUploadComplete,
}: FileDropzoneProps) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const supabase = createBrowserClient()

  const uploadFile = async (file: File) => {
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${maxSize / 1024 / 1024}MB`)
      return
    }

    setUploading(true)
    try {
      const fileName = `${Date.now()}-${file.name}`
      const filePath = path ? `${path}/${fileName}` : fileName

      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file)

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath)

      setUploaded(true)
      toast.success("File uploaded successfully")
      onUploadComplete?.(publicUrl)

      setTimeout(() => setUploaded(false), 2000)
    } catch (error: any) {
      toast.error(error.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        {uploading ? (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        ) : uploaded ? (
          <Check className="h-12 w-12 text-green-500" />
        ) : (
          <Upload className="h-12 w-12 text-muted-foreground" />
        )}

        <div>
          <p className="font-medium">
            {uploading ? "Uploading..." : uploaded ? "Upload complete!" : "Drop files here or click to browse"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Maximum file size: {maxSize / 1024 / 1024}MB</p>
        </div>

        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer text-sm text-primary hover:underline">
          Select files
        </label>
      </div>
    </Card>
  )
}
