"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import { DEVICE_NOTE_MAX_LENGTH, type NetbirdAccessRequest } from "@/lib/netbird/access-requests"
import { requestAccess } from "@/lib/netbird/automation"

export type RequestAccessResult =
  | { ok: true; request: NetbirdAccessRequest }
  | { ok: false; error: string; existing?: NetbirdAccessRequest }

export async function requestNetbirdAccess(deviceNoteInput: string): Promise<RequestAccessResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "You need to be signed in to request access." }
  }

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) {
    return { ok: false, error: "Could not load your profile. Please sign in again." }
  }

  const deviceNote = deviceNoteInput.trim()
  if (deviceNote.length > DEVICE_NOTE_MAX_LENGTH) {
    return { ok: false, error: `Device note must be ${DEVICE_NOTE_MAX_LENGTH} characters or fewer.` }
  }

  // The coach check, rate limit, request row and invite all happen server-side with the service role.
  const result = await requestAccess({
    userId: user.id,
    source: "app",
    discordId: profile.discord_id,
    deviceNote: deviceNote.length > 0 ? deviceNote : null,
  })
  if (!result.ok) {
    return { ok: false, error: result.message }
  }

  revalidatePath("/dashboard/guides/netbird")
  return { ok: true, request: result.request }
}
