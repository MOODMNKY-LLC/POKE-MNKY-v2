"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import {
  DEVICE_NOTE_MAX_LENGTH,
  NETBIRD_REQUEST_COLUMNS,
  type NetbirdAccessRequest,
} from "@/lib/netbird/access-requests"

export type RequestAccessResult =
  | { ok: true; request: NetbirdAccessRequest }
  | { ok: false; error: string; existing?: NetbirdAccessRequest }

const UNIQUE_VIOLATION = "23505"

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

  const { data, error } = await supabase
    .from("netbird_access_requests")
    .insert({
      user_id: user.id,
      display_name: profile.display_name,
      role: profile.role,
      discord_id: profile.discord_id,
      discord_username: profile.discord_username,
      device_note: deviceNote.length > 0 ? deviceNote : null,
      // Do not send `status`: the authenticated role has no INSERT grant on that column,
      // so the column default ('pending') must apply (RLS requires status = 'pending').
    })
    .select(NETBIRD_REQUEST_COLUMNS)
    .single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const { data: existing } = await supabase
        .from("netbird_access_requests")
        .select(NETBIRD_REQUEST_COLUMNS)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle()
      return {
        ok: false,
        error: "You already have a pending request.",
        existing: (existing as NetbirdAccessRequest | null) ?? undefined,
      }
    }
    console.error("[netbird] request access failed:", error.message)
    return { ok: false, error: "Could not submit your request. Please try again later." }
  }

  revalidatePath("/dashboard/guides/netbird")
  return { ok: true, request: data as NetbirdAccessRequest }
}
