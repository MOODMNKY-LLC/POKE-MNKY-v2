"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserAvatar } from "@/components/ui/user-avatar"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { User, Shield, History, Gamepad2, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { getCurrentUserProfile, type UserProfile } from "@/lib/rbac"
import { CoachCard } from "@/components/profile/coach-card"
import { ShowdownTeamsSection } from "@/components/profile/showdown-teams-section"
import Link from "next/link"

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activity, setActivity] = useState<any[]>([])
  const [team, setTeam] = useState<any>(null)
  const router = useRouter()

  // Form state
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")

  // Showdown sync state
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" })

  useEffect(() => {
    loadProfile()
    loadActivity()
  }, [])

  useEffect(() => {
    if (profile?.team_id) {
      loadTeam()
    }
  }, [profile?.team_id])

  async function loadProfile() {
    const supabase = createBrowserClient()
    const profile = await getCurrentUserProfile(supabase)

    if (!profile) {
      router.push("/auth/login")
      return
    }

    setProfile(profile)
    setDisplayName(profile.display_name || "")
    setUsername(profile.username || "")
    setBio(profile.bio || "")
    setLoading(false)
  }

  async function loadActivity() {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from("user_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (data) {
      setActivity(data)
    }
  }

  async function saveProfile() {
    if (!profile) return

    const supabase = createBrowserClient()
    setSaving(true)

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username: username,
        bio: bio,
      })
      .eq("id", profile.id)

    if (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile")
    } else {
      alert("Profile updated successfully!")
      loadProfile()
    }

    setSaving(false)
  }

  async function syncShowdownAccount() {
    if (!profile) return

    setSyncing(true)
    setSyncMessage({ type: null, text: "" })

    try {
      const response = await fetch("/api/showdown/sync-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to sync Showdown account")
      }

      setSyncMessage({
        type: "success",
        text: `Showdown account synced successfully! Username: ${data.showdown_username}`,
      })

      // Reload profile to get updated sync status
      await loadProfile()
    } catch (error: any) {
      console.error("Error syncing Showdown account:", error)
      setSyncMessage({
        type: "error",
        text: error.message || "Failed to sync Showdown account. Please try again.",
      })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>

      {/* Profile Overview */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <UserAvatar
              src={profile.avatar_url || profile.discord_avatar || ""}
              alt={profile.display_name || profile.username || "User"}
              fallback={profile.display_name?.[0] || profile.username?.[0] || "U"}
              role={profile.role}
              size="xl"
              showBadge={true}
              showPokeball={false}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{profile.display_name || profile.username || "Unnamed User"}</h2>
                <PokeballIcon role={profile.role} size="sm" />
              </div>
              <p className="text-muted-foreground mb-2">@{profile.username || "no-username"}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {profile.role}
                </Badge>
                {profile.discord_username && <Badge variant="outline">Discord: {profile.discord_username}</Badge>}
                {profile.showdown_username && (
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">
                    <Gamepad2 className="h-3 w-3 mr-1" />
                    Showdown: {profile.showdown_username}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coach Card & Showdown Teams (only for coaches) */}
      {profile.role === "coach" && (
        <div className="space-y-4 mb-6">
          <CoachCard team={team} userId={profile.id} />
          <ShowdownTeamsSection userId={profile.id} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <User className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="activity">
            <History className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role & Permissions</CardTitle>
              <CardDescription>Your current role and access level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Current Role</Label>
                  <div className="mt-2">
                    <Badge variant="secondary" className="capitalize text-lg px-4 py-2">
                      {profile.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.permissions && profile.permissions.length > 0 ? (
                      profile.permissions.map((perm) => (
                        <Badge key={perm} variant="outline">
                          {perm}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Default role permissions apply</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent actions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activity.length > 0 ? (
                  activity.map((log) => (
                    <div key={log.id} className="flex justify-between items-start border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">
                          {log.action.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                        {log.resource_type && (
                          <p className="text-sm text-muted-foreground">Resource: {log.resource_type}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Showdown Tab */}
        <TabsContent value="showdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Showdown Account Sync</CardTitle>
              <CardDescription>
                Sync your POKE MNKY account with Pokémon Showdown to enable seamless battle integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sync Status */}
              <div className="space-y-2">
                <Label>Sync Status</Label>
                <div className="flex items-center gap-2">
                  {profile.showdown_account_synced ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">Account Synced</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Not Synced</span>
                    </>
                  )}
                </div>
              </div>

              {/* Showdown Username */}
              {profile.showdown_username && (
                <div className="space-y-2">
                  <Label>Showdown Username</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {profile.showdown_username}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Last Synced */}
              {profile.showdown_account_synced_at && (
                <div className="space-y-2">
                  <Label>Last Synced</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(profile.showdown_account_synced_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Sync Message Alert */}
              {syncMessage.type && (
                <Alert variant={syncMessage.type === "error" ? "destructive" : "default"}>
                  {syncMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{syncMessage.type === "success" ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>{syncMessage.text}</AlertDescription>
                </Alert>
              )}

              {/* Sync Button */}
              <div className="pt-4">
                <Button
                  onClick={syncShowdownAccount}
                  disabled={syncing}
                  className="w-full sm:w-auto"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {profile.showdown_account_synced ? "Re-sync Account" : "Sync Showdown Account"}
                    </>
                  )}
                </Button>
              </div>

              {/* Info Section */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">About Showdown Sync</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Syncs your POKE MNKY account with the Showdown loginserver</li>
                  <li>Enables seamless login to Showdown battle rooms</li>
                  <li>Your Showdown username is automatically generated from your Discord username</li>
                  <li>You can also sync via Discord bot: <code className="bg-muted px-1 rounded">/showdown-link</code></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
