import { createClient } from "@/lib/supabase/server"
import { canAccessCoachFeatures, getCurrentUserProfile } from "@/lib/rbac"
import {
  DEFAULT_NAV_CONTEXT,
  getNavFlags,
  type CoachNavContext,
  type DraftPhase,
} from "@/lib/nav/coach-nav"

export interface CoachNavShellData {
  nav: CoachNavContext
  user: {
    name: string
    email: string
    avatar: string
  } | null
  team: {
    name: string
    logoUrl: string | null
  } | null
}

export function draftPhaseFromStatuses(statuses: (string | null)[]): DraftPhase {
  if (statuses.some((status) => status === "active" || status === "paused")) return "active"
  if (statuses.some((status) => status === "pending")) return "upcoming"
  return "none"
}

/** Read-only data for the dashboard shell. Never throws; nav falls back to safe defaults. */
export async function getCoachNavShellData(): Promise<CoachNavShellData> {
  const flags = getNavFlags()
  const fallback: CoachNavShellData = {
    nav: { ...DEFAULT_NAV_CONTEXT, flags },
    user: null,
    team: null,
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fallback

    const profile = await getCurrentUserProfile(supabase)
    if (!profile) return fallback

    let draftPhase: DraftPhase = "unknown"
    try {
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .maybeSingle()
      if (season?.id) {
        const { data: sessions, error } = await supabase
          .from("draft_sessions")
          .select("status")
          .eq("season_id", season.id)
          .in("status", ["pending", "active", "paused"])
        if (!error && sessions) draftPhase = draftPhaseFromStatuses(sessions.map((row) => row.status))
      }
    } catch {
      draftPhase = "unknown"
    }

    let team: CoachNavShellData["team"] = null
    if (profile.team_id) {
      const { data } = await supabase
        .from("teams")
        .select("name, logo_url")
        .eq("id", profile.team_id)
        .maybeSingle()
      if (data?.name) team = { name: data.name, logoUrl: data.logo_url ?? null }
    }

    return {
      nav: {
        isCoach: canAccessCoachFeatures(profile),
        onboardingComplete: Boolean(profile.onboarding_completed),
        draftPhase,
        flags,
      },
      user: {
        name: profile.display_name || profile.discord_username || profile.username || "Coach",
        email: user.email ?? "",
        avatar: profile.avatar_url || profile.discord_avatar || "",
      },
      team,
    }
  } catch {
    return fallback
  }
}
