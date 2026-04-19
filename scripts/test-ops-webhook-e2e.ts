/**
 * POST the same JSON shape as lib/ops-alerts.ts notifyOpsEvent to
 * N8N_WEBHOOK_URL and OPENCLAW_ALERT_WEBHOOK_URL (if set in .env / .env.local).
 * Run: npx tsx scripts/test-ops-webhook-e2e.ts
 */
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import { notifyOpsEvent, OpsEvents } from "../lib/ops-alerts"

function sanitizeEnvUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let s = raw.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1)
  }
  s = s.replace(/\r\n/g, "").replace(/\\r\\n/g, "")
  return s || undefined
}

async function main() {
  const n8n = sanitizeEnvUrl(process.env.N8N_WEBHOOK_URL)
  const openclaw = sanitizeEnvUrl(process.env.OPENCLAW_ALERT_WEBHOOK_URL)

  console.log("notifyOpsEvent (same code path as API routes)")
  await notifyOpsEvent(OpsEvents.coachApplicationStatus, {
    e2e_probe: true,
    message: "scripts/test-ops-webhook-e2e.ts — safe to ignore",
  })
  console.log("(notifyOpsEvent completes; errors are swallowed inside the helper)\n")

  const body = JSON.stringify({
    event: OpsEvents.coachApplicationStatus,
    source: "poke-mnky",
    e2e_probe: true,
    message: "scripts/test-ops-webhook-e2e.ts — safe to ignore",
    ts: new Date().toISOString(),
  })

  for (const [label, url] of [
    ["N8N_WEBHOOK_URL", n8n],
    ["OPENCLAW_ALERT_WEBHOOK_URL", openclaw],
  ] as const) {
    if (!url) {
      console.log(`${label}: (unset)`)
      continue
    }
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const text = await r.text()
      console.log(
        `${label}: HTTP ${r.status} ${r.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`
      )
    } catch (e) {
      console.log(`${label}: ERROR`, e instanceof Error ? e.message : e)
    }
  }
}

main()
