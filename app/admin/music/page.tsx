"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, List, PlaySquare, Settings } from "lucide-react"
import { TrackManager } from "@/components/admin/music/track-manager"
import { PlaylistBuilder } from "@/components/admin/music/playlist-builder"

export default function AdminMusicPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Music Management</h1>
          <p className="text-muted-foreground">
            Upload and manage music tracks for the in-app music player
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Music Management</h1>
        <p className="text-muted-foreground">
          Upload and manage music tracks for the in-app music player
        </p>
      </div>

      <Tabs defaultValue="tracks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="tracks" className="gap-2">
            <List className="h-4 w-4" />
            Tracks
          </TabsTrigger>
          <TabsTrigger value="playlists" className="gap-2">
            <PlaySquare className="h-4 w-4" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Music Tracks</CardTitle>
              <CardDescription>
                Upload and manage music tracks stored in Supabase Storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrackManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playlists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>In-App Playlist</CardTitle>
              <CardDescription>
                View tracks enabled for the in-app music player. Toggle tracks on/off in the "Tracks" tab to manage the playlist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaylistBuilder />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Music Player Settings</CardTitle>
              <CardDescription>
                Configure music player behavior and defaults
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
