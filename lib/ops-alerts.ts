/**
 * Optional ops hooks (AAB plan: n8n + staff/OpenClaw-style alerts after core queues ship).
 *
 * Environment (all optional; unset = no network calls):
 * - `N8N_WEBHOOK_URL` — n8n Webhook node URL (POST JSON).
 * - `OPENCLAW_ALERT_WEBHOOK_URL` — HTTPS endpoint that forwards into your OpenClaw/staff channel
 *   (e.g. small bridge service or n8n → OpenClaw); not a substitute for in-app review.
 *
 * Payload shape: `{ event, source, ts, ...fields }`.
 */

export const OpsEvents = {
  coachApplicationStatus: "coach_application_status",
  draftSessionPendingAdmin: "draft_session_pending_admin_approval",
  draftSessionGovernanceApproved: "draft_session_governance_approved",
} as const

export type OpsEventName = (typeof OpsEvents)[keyof typeof OpsEvents]

export async function notifyOpsEvent(
  event: OpsEventName | string,
  payload: Record<string, unknown>
): Promise<void> {
  const n8n = process.env.N8N_WEBHOOK_URL
  const openclaw = process.env.OPENCLAW_ALERT_WEBHOOK_URL

  if (!n8n && !openclaw) {
    return
  }

  const body = JSON.stringify({
    event,
    source: "poke-mnky",
    ...payload,
    ts: new Date().toISOString(),
  })

  await Promise.all(
    [n8n, openclaw].filter(Boolean).map((url) =>
      fetch(url!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {})
    )
  )
}
