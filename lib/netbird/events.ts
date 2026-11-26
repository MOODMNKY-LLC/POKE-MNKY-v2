/** Plain-language labels for `netbird_onboarding_events.action`, written as what happened to the member. */
export const EVENT_LABELS: Record<string, string> = {
  request_created: "asked for battle access",
  auto_approved: "was approved automatically (current coach)",
  auto_cap_reached: "is a coach, but the automatic invite limit was reached, so an admin needs to approve",
  approved: "was approved by an admin",
  denied: "was not approved",
  invite_created: "invite created and sent",
  already_member: "is already on the battle network",
  invite_failed: "invite did not go through",
  resend_requested: "invite was sent again",
  invite_expired: "invite expired",
  revoked: "access was removed",
  revoke_failed: "access could not be removed",
}

export function describeEvent(action: string): string {
  return EVENT_LABELS[action] ?? action.replace(/_/g, " ")
}

/** Deterministic date text (UTC) so server and client renders always match. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const text = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date)
  return `${text} UTC`
}
