"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"

interface ShowdownTeamEditSheetProps {
  teamId: string
  teamName: string
  avatarUrl: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function ShowdownTeamEditSheet({
  teamId,
  teamName: initialName,
  avatarUrl: initialAvatar,
  open,
  onOpenChange,
  onSaved,
}: ShowdownTeamEditSheetProps) {
  const [teamName, setTeamName] = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be less than 5MB")
      return
    }
    const supabase = createBrowserClient()
    setUploading(true)
    try {
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `showdown-teams/${teamId}/${fileName}`
      const { error: uploadError } = await supabase.storage.from("team-assets").upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from("team-assets").getPublicUrl(filePath)
      const { error: updateError } = await supabase
        .from("showdown_teams")
        .update({ avatar_url: publicUrl })
        .eq("id", teamId)
      if (updateError) throw updateError
      setAvatarUrl(publicUrl)
      toast.success("Avatar updated")
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleSaveName = async () => {
    if (teamName.trim() === initialName) {
      onOpenChange(false)
      return
    }
    const supabase = createBrowserClient()
    setSaving(true)
    try {
      const { error } = await supabase
        .from("showdown_teams")
        .update({ team_name: teamName.trim() })
        .eq("id", teamId)
      if (error) throw error
      toast.success("Team name updated")
      onSaved?.()
      onOpenChange(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Team</SheetTitle>
          <SheetDescription>Update team name and avatar</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Team Avatar</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">No image</span>
                )}
              </div>
              <label
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${uploading ? "opacity-50" : "cursor-pointer"}`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleAvatarFileSelect}
                />
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {avatarUrl ? "Change" : "Add"} Avatar
                  </>
                )}
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
            />
          </div>
          <Button onClick={handleSaveName} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
