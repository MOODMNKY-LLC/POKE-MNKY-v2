"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, Folder, Upload, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

export function StorageTab({ projectRef }: { projectRef: string }) {
  const [buckets, setBuckets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newBucketName, setNewBucketName] = useState("")
  const supabase = createBrowserClient()

  useEffect(() => {
    loadBuckets()
  }, [])

  async function loadBuckets() {
    setLoading(true)
    try {
      const { data, error } = await supabase.storage.listBuckets()

      if (error) throw error
      setBuckets(data || [])
    } catch (error: any) {
      toast.error("Failed to load buckets: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function createBucket() {
    if (!newBucketName.trim()) {
      toast.error("Bucket name is required")
      return
    }

    try {
      const { data, error } = await supabase.storage.createBucket(newBucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      })

      if (error) throw error
      toast.success("Bucket created successfully")
      setNewBucketName("")
      loadBuckets()
    } catch (error: any) {
      toast.error("Failed to create bucket: " + error.message)
    }
  }

  async function deleteBucket(bucketName: string) {
    if (!confirm(`Are you sure you want to delete bucket "${bucketName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase.storage.deleteBucket(bucketName)
      if (error) throw error
      toast.success("Bucket deleted successfully")
      loadBuckets()
    } catch (error: any) {
      toast.error("Failed to delete bucket: " + error.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Storage Buckets ({buckets.length})
              </CardTitle>
              <CardDescription>Manage file storage buckets for team logos, replays, and uploads</CardDescription>
            </div>
            <Button onClick={loadBuckets} variant="outline" size="sm" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Bucket */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="bucket-name">New Bucket Name</Label>
              <Input
                id="bucket-name"
                placeholder="e.g., team-logos"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createBucket()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={createBucket} disabled={!newBucketName.trim()}>
                <Upload className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </div>

          {/* Buckets List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : buckets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No buckets found</p>
              <p className="text-sm mt-2">Create a bucket to start storing files</p>
            </div>
          ) : (
            <div className="space-y-2">
              {buckets.map((bucket) => (
                <div
                  key={bucket.name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{bucket.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={bucket.public ? "default" : "secondary"}>
                          {bucket.public ? "Public" : "Private"}
                        </Badge>
                        {bucket.file_size_limit && (
                          <Badge variant="outline" className="text-xs">
                            Max: {Math.round(bucket.file_size_limit / 1024 / 1024)}MB
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `https://supabase.com/dashboard/project/${projectRef}/storage/buckets/${bucket.name}`,
                          "_blank",
                        )
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteBucket(bucket.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>View storage statistics and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detailed storage usage statistics are available in the Supabase Dashboard.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <a
              href={`https://supabase.com/dashboard/project/${projectRef}/storage/buckets`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Storage Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
