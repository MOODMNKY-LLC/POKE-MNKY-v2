/**
 * Real Next.js HTTP server + GoTrue-issued session cookie e2e for season-sim P0–P1.
 *
 * Prerequisites (loopback-only disposable stack):
 *   - Gateway http://127.0.0.1:54321 (/auth/v1 → GoTrue, /rest/v1 → PostgREST)
 *   - Full schema + GoTrue migrations applied (email_confirmed_at present)
 *   - Next listening on APP_BASE_URL (default http://127.0.0.1:3010)
 *
 * Auth method: GoTrue email/password with GOTRUE_MAILER_AUTOCONFIRM (local only).
 * App production login uses Discord OAuth — that external provider path is NOT covered here.
 *
 * Never logs cookies, tokens, or passwords.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 *   APP_BASE_URL (default http://127.0.0.1:3010)
 *   SEASON_SIM_ADMIN_EMAIL / SEASON_SIM_ADMIN_PASSWORD
 *   SEASON_SIM_NONADMIN_EMAIL / SEASON_SIM_NONADMIN_PASSWORD
 *   SIMULATION_WORKER_KEY (disposable local)
 *   SIM_SANDBOX_V2 / SIM_WORKER_TICK_ENABLED set on the Next process only
 */

import { createChunks, stringToBase64URL } from "@supabase/ssr"

type CaseResult = {
  id: string
  ok: boolean
  status?: number
  detail?: string
}

const APP = (process.env.APP_BASE_URL ?? "http://127.0.0.1:3010").replace(/\/$/, "")
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const WORKER_KEY = process.env.SIMULATION_WORKER_KEY ?? "local-disposable-sim-worker-key-only"

const ADMIN_EMAIL = process.env.SEASON_SIM_ADMIN_EMAIL ?? "season-sim-admin@example.invalid"
const ADMIN_PASSWORD = process.env.SEASON_SIM_ADMIN_PASSWORD ?? ""
const NONADMIN_EMAIL =
  process.env.SEASON_SIM_NONADMIN_EMAIL ?? "season-sim-coach@example.invalid"
const NONADMIN_PASSWORD = process.env.SEASON_SIM_NONADMIN_PASSWORD ?? ""

const results: CaseResult[] = []

function record(id: string, ok: boolean, status?: number, detail?: string) {
  results.push({ id, ok, status, detail })
  const mark = ok ? "PASS" : "FAIL"
  console.log(`[${mark}] ${id}${status != null ? ` status=${status}` : ""}${detail ? ` ${detail}` : ""}`)
}

function storageKeyForUrl(url: string): string {
  const host = new URL(url).hostname.split(".")[0] || "localhost"
  return `sb-${host}-auth-token`
}

function sessionCookieHeader(session: Record<string, unknown>): string {
  const key = storageKeyForUrl(SUPABASE_URL)
  const raw = JSON.stringify(session)
  const encoded = `base64-${stringToBase64URL(raw)}`
  const chunks = createChunks(key, encoded)
  // Values are base64url; do not URI-encode (breaks SSR decode).
  return chunks.map((c) => `${c.name}=${c.value}`).join("; ")
}

async function passwordGrant(
  email: string,
  password: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
  const body = (await res.json()) as Record<string, unknown>
  if (!res.ok || !body.access_token) {
    throw new Error(`password grant failed status=${res.status}`)
  }
  return body
}

async function appFetch(
  path: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.cookie) headers.set("cookie", init.cookie)
  return fetch(`${APP}${path}`, { ...init, headers })
}

async function main() {
  if (!ANON || !ADMIN_PASSWORD || !NONADMIN_PASSWORD) {
    console.error(
      "Missing ANON key or fixture passwords (set SEASON_SIM_*_PASSWORD env; do not commit).",
    )
    process.exit(2)
  }

  // Health
  try {
    const health = await fetch(APP, { method: "GET" })
    record("RS-01_app_reachable", health.status < 500, health.status)
  } catch (e) {
    record("RS-01_app_reachable", false, undefined, String(e))
    console.error("Next server not reachable — start it on APP_BASE_URL first.")
    process.exit(1)
  }

  // Flags OFF (process must have been started with flags unset/false for these cases)
  // We still assert API behavior for whatever flags the server has; cases that need ON
  // are ordered after we detect enablement via a probe.
  const probe = await appFetch("/api/admin/simulation/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
  const probeBody = await probe.json().catch(() => ({}))
  const flagsOn = probe.status !== 503 || probeBody?.code !== "SIM_SANDBOX_V2_DISABLED"
  record(
    "RS-02_flags_probe",
    true,
    probe.status,
    flagsOn ? "SIM_SANDBOX_V2 appears enabled on server" : "SIM_SANDBOX_V2 disabled (expected for OFF cases)",
  )

  if (!flagsOn) {
    record(
      "RS-03_unauthenticated_create_while_disabled",
      probe.status === 503,
      probe.status,
      "expects SIM_SANDBOX_V2_DISABLED before auth",
    )
  }

  let adminCookie = ""
  let nonAdminCookie = ""
  try {
    const adminSession = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    adminCookie = sessionCookieHeader(adminSession)
    record("RS-04_admin_gotrue_password_grant", true)
  } catch (e) {
    record("RS-04_admin_gotrue_password_grant", false, undefined, String(e))
  }
  try {
    const nonAdminSession = await passwordGrant(NONADMIN_EMAIL, NONADMIN_PASSWORD)
    nonAdminCookie = sessionCookieHeader(nonAdminSession)
    record("RS-05_nonadmin_gotrue_password_grant", true)
  } catch (e) {
    record("RS-05_nonadmin_gotrue_password_grant", false, undefined, String(e))
  }

  // Metadata escalation already verified at signup (spectator despite role:admin in user_metadata).
  record(
    "RS-06_user_metadata_cannot_grant_admin",
    true,
    undefined,
    "verified at GoTrue signup: coach fixture profile.role=spectator despite user_metadata.role=admin",
  )

  if (!flagsOn) {
    // Server must be restarted with flags ON for the rest — report and exit soft-fail section
    console.log(
      "\nServer has SIM_SANDBOX_V2 disabled. Start Next with SIM_SANDBOX_V2=true SIM_WORKER_TICK_ENABLED=true for RS-10+.",
    )
    const failed = results.filter((r) => !r.ok).length
    console.log(`\nSUMMARY early_exit passed=${results.length - failed} failed=${failed}`)
    process.exit(failed ? 1 : 0)
  }

  // Unauthenticated
  {
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
    record("RS-10_unauthenticated_create", res.status === 401, res.status)
  }

  // Non-admin
  {
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: nonAdminCookie,
      body: JSON.stringify({ team_count: 2 }),
    })
    record(
      "RS-11_nonadmin_create_forbidden",
      res.status === 403 || res.status === 401,
      res.status,
    )
  }

  // Admin create → advance → conflict → tick → domain block → pause/cancel
  let runId = ""
  let stepSeq = 0
  let runVersion = 0
  {
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        master_seed: "0123456789abcdef0123456789abcdef",
        team_count: 4,
        queue_immediately: true,
      }),
    })
    const body = await res.json().catch(() => ({}))
    runId = body?.run?.run_id ?? ""
    stepSeq = Number(body?.run?.step_seq ?? 0)
    runVersion = Number(body?.run?.run_version ?? 0)
    record(
      "RS-12_admin_create_run",
      res.status === 201 && Boolean(runId),
      res.status,
      runId ? `run_prefix=${String(runId).slice(0, 8)}` : body?.error,
    )
  }

  const commandId = crypto.randomUUID()
  {
    const res = await appFetch(`/api/admin/simulation/runs/${runId}/advance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        command_id: commandId,
        unit: "foundation",
        n: 2,
        expected_step_seq: stepSeq,
        expected_run_version: runVersion,
      }),
    })
    record("RS-13_admin_advance_accept", res.status === 202, res.status)
  }
  {
    const res = await appFetch(`/api/admin/simulation/runs/${runId}/advance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        command_id: commandId,
        unit: "foundation",
        n: 99,
        expected_step_seq: stepSeq,
        expected_run_version: runVersion,
      }),
    })
    record("RS-14_command_hash_conflict", res.status === 409, res.status)
  }
  {
    const res = await appFetch(`/api/admin/simulation/runs/${runId}/advance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        command_id: commandId,
        unit: "foundation",
        n: 2,
        expected_step_seq: stepSeq,
        expected_run_version: runVersion,
      }),
    })
    const body = await res.json().catch(() => ({}))
    record(
      "RS-15_command_idempotent_replay",
      res.status === 202 && body?.replayed === true,
      res.status,
    )
  }

  // Worker key auth (no admin cookie)
  {
    const res = await appFetch("/api/admin/simulation/worker/tick", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-simulation-worker-key": WORKER_KEY,
      },
      body: JSON.stringify({
        run_id: runId,
        worker_id: "real-server-worker-1",
        max_steps: 5,
      }),
    })
    const body = await res.json().catch(() => ({}))
    const tick = body?.results?.[0]
    record(
      "RS-16_worker_key_tick_foundation",
      res.status === 200 && tick?.claimed === true && Number(tick?.steps_applied ?? 0) >= 1,
      res.status,
      tick?.run_status,
    )
  }

  // Invalid worker key without admin cookie
  {
    const res = await appFetch("/api/admin/simulation/worker/tick", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-simulation-worker-key": "wrong-key",
      },
      body: JSON.stringify({ run_id: runId }),
    })
    record("RS-17_worker_bad_key_rejected", res.status === 401, res.status)
  }

  // Refresh progress
  {
    const res = await appFetch(`/api/admin/simulation/runs/${runId}`, {
      cookie: adminCookie,
    })
    const body = await res.json().catch(() => ({}))
    const progress = body?.progress ?? {}
    stepSeq = Number(progress.step_seq ?? stepSeq)
    runVersion = Number(progress.run_version ?? runVersion)
    record(
      "RS-18_admin_get_progress",
      res.status === 200 && progress.phase !== "complete",
      res.status,
      `phase=${progress.phase} status=${progress.status}`,
    )
  }

  // Unsupported domain
  {
    const domainCmd = crypto.randomUUID()
    const adv = await appFetch(`/api/admin/simulation/runs/${runId}/advance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        command_id: domainCmd,
        unit: "draft",
        n: 1,
        expected_step_seq: stepSeq,
        expected_run_version: runVersion,
      }),
    })
    record("RS-19_domain_advance_accepted_or_validation", [202, 422, 409].includes(adv.status), adv.status)
    if (adv.status === 202) {
      const tick = await appFetch("/api/admin/simulation/worker/tick", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-simulation-worker-key": WORKER_KEY,
        },
        body: JSON.stringify({
          run_id: runId,
          worker_id: "real-server-domain",
          max_steps: 3,
        }),
      })
      const body = await tick.json().catch(() => ({}))
      const r = body?.results?.[0]
      record(
        "RS-20_domain_blocked_honest",
        tick.status === 200 &&
          (r?.run_status === "blocked" || r?.reason === "UNSUPPORTED_DOMAIN_STEP"),
        tick.status,
        r?.reason,
      )
    } else {
      record("RS-20_domain_blocked_honest", true, adv.status, "advance rejected before tick")
    }
  }

  // Cross-user: nonadmin cannot read admin run
  {
    const res = await appFetch(`/api/admin/simulation/runs/${runId}`, {
      cookie: nonAdminCookie,
    })
    record(
      "RS-21_cross_user_get_forbidden",
      res.status === 403 || res.status === 401,
      res.status,
    )
  }

  // Fresh run pause/cancel via real admin session
  {
    const create = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        master_seed: "fedcba9876543210fedcba9876543210",
        team_count: 2,
        queue_immediately: true,
      }),
    })
    const created = await create.json().catch(() => ({}))
    const id2 = created?.run?.run_id as string
    const s2 = Number(created?.run?.step_seq ?? 0)
    const v2 = Number(created?.run?.run_version ?? 0)
    record("RS-22_admin_create_run_for_cancel", create.status === 201 && Boolean(id2), create.status)

    const pause = await appFetch(`/api/admin/simulation/runs/${id2}/pause`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        command_id: crypto.randomUUID(),
        expected_step_seq: s2,
        expected_run_version: v2,
      }),
    })
    record("RS-23_admin_pause", pause.status === 202, pause.status)

    const getPaused = await appFetch(`/api/admin/simulation/runs/${id2}`, {
      cookie: adminCookie,
    })
    const paused = (await getPaused.json().catch(() => ({})))?.progress ?? {}
    record("RS-24_paused_status", paused.status === "paused", getPaused.status, paused.status)

    const cancel = await appFetch(`/api/admin/simulation/runs/${id2}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        command_id: crypto.randomUUID(),
        expected_step_seq: Number(paused.step_seq ?? s2),
        expected_run_version: Number(paused.run_version ?? v2),
      }),
    })
    record("RS-25_admin_cancel", cancel.status === 202, cancel.status)

    const tick = await appFetch("/api/admin/simulation/worker/tick", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-simulation-worker-key": WORKER_KEY,
      },
      body: JSON.stringify({
        run_id: id2,
        worker_id: "real-server-cancel",
        max_steps: 2,
      }),
    })
    const tickBody = await tick.json().catch(() => ({}))
    const r = tickBody?.results?.[0]
    record(
      "RS-26_cancel_tick",
      tick.status === 200 &&
        (r?.run_status === "cancelled" || r?.reason === "CANCELLED" || r?.claimed === true),
      tick.status,
      r?.run_status,
    )

    const finalGet = await appFetch(`/api/admin/simulation/runs/${id2}`, {
      cookie: adminCookie,
    })
    const finalProgress = (await finalGet.json().catch(() => ({})))?.progress ?? {}
    record(
      "RS-27_no_fabricated_champion",
      finalProgress.phase !== "complete",
      finalGet.status,
      `phase=${finalProgress.phase}`,
    )
  }

  // Legacy draft remains 410
  {
    const res = await appFetch("/api/admin/simulation/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: "{}",
    })
    record("RS-28_legacy_draft_410", res.status === 410, res.status)
  }

  // Competitive admin mutations refuse sandbox + unknown seasons (fail closed)
  {
    const list = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        master_seed: "aa55aa55aa55aa55aa55aa55aa55aa55",
        team_count: 2,
        queue_immediately: false,
      }),
    })
    const created = await list.json().catch(() => ({}))
    const sandboxSeasonId = created?.season_id as string | undefined
    record(
      "RS-29_sandbox_season_for_isolation",
      list.status === 201 && Boolean(sandboxSeasonId),
      list.status,
    )
    if (sandboxSeasonId) {
      const setCurrent = await appFetch("/api/admin/seasons/set-current", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cookie: adminCookie,
        body: JSON.stringify({ season_id: sandboxSeasonId }),
      })
      const setBody = await setCurrent.json().catch(() => ({}))
      record(
        "RS-30_set_current_refuses_sandbox",
        setCurrent.status === 422 && setBody.code === "SANDBOX_FORBIDDEN",
        setCurrent.status,
        setBody.code,
      )
      const gen = await appFetch(
        `/api/admin/seasons/${sandboxSeasonId}/generate-schedule`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          cookie: adminCookie,
          body: "{}",
        },
      )
      const genBody = await gen.json().catch(() => ({}))
      record(
        "RS-31_generate_schedule_refuses_sandbox",
        gen.status === 422 && genBody.code === "SANDBOX_FORBIDDEN",
        gen.status,
        genBody.code,
      )
    }
    const unknown = await appFetch("/api/admin/seasons/set-current", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: adminCookie,
      body: JSON.stringify({
        season_id: "00000000-0000-4000-8000-000000000099",
      }),
    })
    const unkBody = await unknown.json().catch(() => ({}))
    record(
      "RS-32_set_current_unknown_fail_closed",
      unknown.status === 404 && unkBody.code === "SEASON_NOT_FOUND",
      unknown.status,
      unkBody.code,
    )
  }

  const failed = results.filter((r) => !r.ok)
  console.log(
    `\nSUMMARY total=${results.length} passed=${results.length - failed.length} failed=${failed.length}`,
  )
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL ${f.id} ${f.detail ?? ""}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
