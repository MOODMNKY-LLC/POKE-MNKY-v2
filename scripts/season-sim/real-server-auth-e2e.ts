/**
 * Real Next.js HTTP server + GoTrue-issued session cookie e2e for season-sim P0–P1.
 *
 * Prerequisites (loopback-only disposable stack):
 *   - Gateway http://127.0.0.1:54321 (/auth/v1 → GoTrue, /rest/v1 → PostgREST)
 *   - Full schema + GoTrue migrations applied (email_confirmed_at present)
 *   - Next listening on APP_BASE_URL (default http://127.0.0.1:3010)
 *   - Prefer GOTRUE_JWT_EXP≈5 so expiry cases finish without unbounded waits
 *
 * Trusted authorization source (requireLeagueAdmin → resolveLeagueAdminAccess):
 *   profiles.role / admin_users / Discord Admin|Commissioner roles — NOT user_metadata.
 *
 * Auth method: GoTrue email/password with GOTRUE_MAILER_AUTOCONFIRM (local only).
 * App production login uses Discord OAuth — that external provider path is NOT covered here.
 *
 * Session semantics exercised (per Supabase Auth docs):
 *   - Access JWT is short-lived; refresh token can renew the session once per refresh.
 *   - Sign-out / logout revokes refresh tokens; an unexpired access JWT is NOT instantly
 *     invalidated until it expires (documented; we wait for access expiry after revoke).
 *
 * Never logs cookies, tokens, or passwords.
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
const JWT_EXP_SECONDS = Math.max(2, Number(process.env.GOTRUE_JWT_EXP ?? "5") || 5)

const ADMIN_EMAIL = process.env.SEASON_SIM_ADMIN_EMAIL ?? "season-sim-admin@example.invalid"
const ADMIN_PASSWORD = process.env.SEASON_SIM_ADMIN_PASSWORD ?? ""
const NONADMIN_EMAIL =
  process.env.SEASON_SIM_NONADMIN_EMAIL ?? "season-sim-coach@example.invalid"
const NONADMIN_PASSWORD = process.env.SEASON_SIM_NONADMIN_PASSWORD ?? ""

const results: CaseResult[] = []

function record(id: string, ok: boolean, status?: number, detail?: string) {
  results.push({ id, ok, status, detail })
  const mark = ok ? "PASS" : "FAIL"
  console.log(
    `[${mark}] ${id}${status != null ? ` status=${status}` : ""}${detail ? ` ${detail}` : ""}`,
  )
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

async function refreshGrant(refreshToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const body = (await res.json()) as Record<string, unknown>
  if (!res.ok || !body.access_token) {
    throw new Error(`refresh grant failed status=${res.status}`)
  }
  return body
}

async function logoutSession(accessToken: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })
  return res.status
}

async function updateUserMetadata(
  accessToken: string,
  data: Record<string, unknown>,
): Promise<{ status: number; userMetadataRole?: unknown }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    user?: { user_metadata?: Record<string, unknown> }
    user_metadata?: Record<string, unknown>
  }
  const meta = body.user?.user_metadata ?? body.user_metadata
  return { status: res.status, userMetadataRole: meta?.role }
}

async function appFetch(
  path: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.cookie) headers.set("cookie", init.cookie)
  return fetch(`${APP}${path}`, { ...init, headers })
}

async function waitUntilAccessLikelyExpired(session: Record<string, unknown>): Promise<void> {
  const expiresAt = Number(session.expires_at ?? 0)
  const nowSec = Math.floor(Date.now() / 1000)
  const waitMs = Math.max(0, (expiresAt - nowSec + 1) * 1000)
  // Bound wait: JWT_EXP + 3s slack; fail if config is unbounded.
  const maxMs = (JWT_EXP_SECONDS + 3) * 1000
  if (waitMs > maxMs) {
    throw new Error(
      `access token TTL too long for test (waitMs=${waitMs}); set GOTRUE_JWT_EXP≈5`,
    )
  }
  await sleep(waitMs + 250)
}

async function main() {
  if (!ANON || !ADMIN_PASSWORD || !NONADMIN_PASSWORD) {
    console.error(
      "Missing ANON key or fixture passwords (set SEASON_SIM_*_PASSWORD env; do not commit).",
    )
    process.exit(2)
  }

  console.log(
    `authz_source=profiles.role(+admin_users/discord) jwt_exp_seconds=${JWT_EXP_SECONDS} discord_oauth=untested`,
  )

  // Health
  try {
    const health = await fetch(APP, { method: "GET" })
    record("RS-01_app_reachable", health.status < 500, health.status)
  } catch (e) {
    record("RS-01_app_reachable", false, undefined, String(e))
    console.error("Next server not reachable — start it on APP_BASE_URL first.")
    process.exit(1)
  }

  const probe = await appFetch("/api/admin/simulation/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
  const probeBody = (await probe.json().catch(() => ({}))) as { code?: string }
  const flagsOn = probe.status !== 503 || probeBody?.code !== "SIM_SANDBOX_V2_DISABLED"
  record(
    "RS-02_flags_probe",
    flagsOn
      ? probe.status === 401 || probe.status === 403
      : probe.status === 503 && probeBody?.code === "SIM_SANDBOX_V2_DISABLED",
    probe.status,
    flagsOn
      ? "SIM_SANDBOX_V2 enabled; unauth before cookie is 401/403"
      : "SIM_SANDBOX_V2 disabled",
  )

  if (!flagsOn) {
    record(
      "RS-03_unauthenticated_create_while_disabled",
      probe.status === 503 && probeBody?.code === "SIM_SANDBOX_V2_DISABLED",
      probe.status,
      "expects SIM_SANDBOX_V2_DISABLED before auth",
    )
    console.log(
      "\nServer has SIM_SANDBOX_V2 disabled. Start Next with SIM_SANDBOX_V2=true SIM_WORKER_TICK_ENABLED=true for full suite.",
    )
    const failed = results.filter((r) => !r.ok).length
    console.log(`\nSUMMARY early_exit total=${results.length} passed=${results.length - failed} failed=${failed}`)
    process.exit(failed ? 1 : 0)
  }

  let adminSession: Record<string, unknown> = {}
  let nonAdminSession: Record<string, unknown> = {}
  let adminCookie = ""
  let nonAdminCookie = ""
  try {
    adminSession = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    adminCookie = sessionCookieHeader(adminSession)
    record("RS-04_admin_gotrue_password_grant", Boolean(adminSession.access_token))
  } catch (e) {
    record("RS-04_admin_gotrue_password_grant", false, undefined, String(e))
  }
  try {
    nonAdminSession = await passwordGrant(NONADMIN_EMAIL, NONADMIN_PASSWORD)
    nonAdminCookie = sessionCookieHeader(nonAdminSession)
    record("RS-05_nonadmin_gotrue_password_grant", Boolean(nonAdminSession.access_token))
  } catch (e) {
    record("RS-05_nonadmin_gotrue_password_grant", false, undefined, String(e))
  }

  // RS-06: adversarial — self-editable user_metadata.role=admin must not authorize writes.
  {
    const access = String(nonAdminSession.access_token ?? "")
    const metaBefore =
      ((nonAdminSession.user as { user_metadata?: Record<string, unknown> } | undefined)
        ?.user_metadata?.role as string | undefined) ?? null
    const updated = await updateUserMetadata(access, { role: "admin", escalated: true })
    record(
      "RS-06a_nonadmin_can_set_user_metadata_role",
      updated.status >= 200 &&
        updated.status < 300 &&
        (updated.userMetadataRole === "admin" || metaBefore === "admin"),
      updated.status,
      `user_metadata.role visible=${String(updated.userMetadataRole ?? metaBefore)}`,
    )
    // Re-grant so cookie JWT carries updated user_metadata claim if GoTrue embeds it.
    const refreshedNonAdmin = await passwordGrant(NONADMIN_EMAIL, NONADMIN_PASSWORD)
    nonAdminSession = refreshedNonAdmin
    nonAdminCookie = sessionCookieHeader(refreshedNonAdmin)
    const metaInSession =
      (refreshedNonAdmin.user as { user_metadata?: Record<string, unknown> } | undefined)
        ?.user_metadata?.role ?? null
    record(
      "RS-06b_session_carries_user_metadata_role_admin",
      metaInSession === "admin",
      undefined,
      `session.user_metadata.role=${String(metaInSession)}`,
    )
    const escalate = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: nonAdminCookie,
      body: JSON.stringify({
        master_seed: "deadbeefdeadbeefdeadbeefdeadbeef",
        team_count: 2,
        queue_immediately: false,
      }),
    })
    record(
      "RS-06_user_metadata_cannot_grant_admin",
      escalate.status === 403,
      escalate.status,
      "trusted authz=profiles.role; user_metadata ignored",
    )
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

  // Non-admin (legitimate spectator session)
  {
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: nonAdminCookie,
      body: JSON.stringify({ team_count: 2 }),
    })
    record("RS-11_nonadmin_create_forbidden", res.status === 403, res.status)
  }

  // Admin create → advance → conflict → tick → domain block → pause/cancel
  let runId = ""
  let stepSeq = 0
  let runVersion = 0
  {
    // Refresh admin cookie if access may already be near expiry from prior waits.
    adminSession = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    adminCookie = sessionCookieHeader(adminSession)
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
    const body = (await res.json().catch(() => ({}))) as {
      run?: { run_id?: string; step_seq?: number; run_version?: number }
      error?: string
    }
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
    const body = (await res.json().catch(() => ({}))) as { replayed?: boolean }
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
    const body = (await res.json().catch(() => ({}))) as {
      results?: Array<{ claimed?: boolean; steps_applied?: number; run_status?: string }>
    }
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
    adminSession = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    adminCookie = sessionCookieHeader(adminSession)
    const res = await appFetch(`/api/admin/simulation/runs/${runId}`, {
      cookie: adminCookie,
    })
    const body = (await res.json().catch(() => ({}))) as {
      progress?: { step_seq?: number; run_version?: number; phase?: string; status?: string }
    }
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
    record(
      "RS-19_domain_advance_accepted_or_validation",
      [202, 422, 409].includes(adv.status),
      adv.status,
    )
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
      const body = (await tick.json().catch(() => ({}))) as {
        results?: Array<{ run_status?: string; reason?: string }>
      }
      const r = body?.results?.[0]
      record(
        "RS-20_domain_blocked_honest",
        tick.status === 200 &&
          (r?.run_status === "blocked" || r?.reason === "UNSUPPORTED_DOMAIN_STEP"),
        tick.status,
        r?.reason,
      )
    } else {
      record(
        "RS-20_domain_blocked_honest",
        [422, 409].includes(adv.status),
        adv.status,
        "advance rejected before tick",
      )
    }
  }

  // Cross-user: nonadmin cannot read admin run
  {
    nonAdminSession = await passwordGrant(NONADMIN_EMAIL, NONADMIN_PASSWORD)
    nonAdminCookie = sessionCookieHeader(nonAdminSession)
    const res = await appFetch(`/api/admin/simulation/runs/${runId}`, {
      cookie: nonAdminCookie,
    })
    record("RS-21_cross_user_get_forbidden", res.status === 403, res.status)
  }

  // Fresh run pause/cancel via real admin session
  {
    adminSession = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    adminCookie = sessionCookieHeader(adminSession)
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
    const created = (await create.json().catch(() => ({}))) as {
      run?: { run_id?: string; step_seq?: number; run_version?: number }
    }
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
    const paused = ((await getPaused.json().catch(() => ({}))) as {
      progress?: { status?: string; step_seq?: number; run_version?: number }
    })?.progress ?? {}
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
    const tickBody = (await tick.json().catch(() => ({}))) as {
      results?: Array<{ run_status?: string; reason?: string; claimed?: boolean }>
    }
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
    const finalProgress = ((await finalGet.json().catch(() => ({}))) as {
      progress?: { phase?: string }
    })?.progress ?? {}
    record(
      "RS-27_no_fabricated_champion",
      finalProgress.phase !== "complete",
      finalGet.status,
      `phase=${finalProgress.phase}`,
    )
  }

  // Legacy draft remains 410
  {
    adminSession = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    adminCookie = sessionCookieHeader(adminSession)
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
    const created = (await list.json().catch(() => ({}))) as { season_id?: string }
    const sandboxSeasonId = created?.season_id
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
      const setBody = (await setCurrent.json().catch(() => ({}))) as { code?: string }
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
      const genBody = (await gen.json().catch(() => ({}))) as { code?: string }
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
    const unkBody = (await unknown.json().catch(() => ({}))) as { code?: string }
    record(
      "RS-32_set_current_unknown_fail_closed",
      unknown.status === 404 && unkBody.code === "SEASON_NOT_FOUND",
      unknown.status,
      unkBody.code,
    )
  }

  // --- Session validity / expiry / refresh (RS-40+) ---
  // Tampered access WITH refresh present is refreshed by SSR getUser (same as expired+refresh).
  // Prove rejection only when refresh cannot restore: strip refresh_token from the cookie.
  {
    const fresh = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    const tamperedNoRefresh: Record<string, unknown> = {
      ...fresh,
      access_token: String(fresh.access_token ?? "") + "tampered",
    }
    delete tamperedNoRefresh.refresh_token
    const cookie = sessionCookieHeader(tamperedNoRefresh)
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie,
      body: JSON.stringify({ team_count: 2 }),
    })
    record(
      "RS-40_tampered_access_without_refresh_rejected",
      res.status === 401,
      res.status,
      "invalid access JWT; refresh absent → cannot restore",
    )
  }

  {
    const garbageCookie = `${storageKeyForUrl(SUPABASE_URL)}=not-a-valid-session`
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie: garbageCookie,
      body: JSON.stringify({ team_count: 2 }),
    })
    record("RS-41_malformed_cookie_rejected", res.status === 401, res.status)
  }

  // Expired access WITHOUT refresh → unauthorized (no way to restore authority).
  {
    const fresh = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    await waitUntilAccessLikelyExpired(fresh)
    const expiredNoRefresh: Record<string, unknown> = { ...fresh }
    delete expiredNoRefresh.refresh_token
    const cookie = sessionCookieHeader(expiredNoRefresh)
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie,
      body: JSON.stringify({
        master_seed: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        team_count: 2,
        queue_immediately: false,
      }),
    })
    record(
      "RS-42_expired_access_without_refresh_rejected",
      res.status === 401,
      res.status,
      "access JWT expired; refresh absent → no restore",
    )
  }

  // Supported refresh: after access TTL, refresh_token grant yields a new access token,
  // and that renewed session authorizes a real protected write.
  {
    const fresh = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    const refreshToken = String(fresh.refresh_token ?? "")
    await waitUntilAccessLikelyExpired(fresh)
    let renewed: Record<string, unknown> | null = null
    try {
      renewed = await refreshGrant(refreshToken)
    } catch {
      renewed = null
    }
    record(
      "RS-43a_gotrue_refresh_after_access_expiry",
      Boolean(renewed?.access_token),
      undefined,
      "distinct from access expiry; refresh renews session",
    )
    if (renewed?.access_token) {
      const cookie = sessionCookieHeader(renewed)
      const res = await appFetch("/api/admin/simulation/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cookie,
        body: JSON.stringify({
          master_seed: "cccccccccccccccccccccccccccccccc",
          team_count: 2,
          queue_immediately: false,
        }),
      })
      record(
        "RS-43b_renewed_session_authorizes_write",
        res.status === 201,
        res.status,
        "refresh-restored access used as SSR cookie",
      )
    } else {
      record("RS-43b_renewed_session_authorizes_write", false, undefined, "skipped: refresh failed")
    }
  }

  // SSR cookie path with expired access + refresh present: observe auto-refresh vs reject.
  // Pass only if authorized (201 via refresh) or honestly unauthorized (401) — never 5xx/2xx-without-auth.
  {
    const fresh = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    await waitUntilAccessLikelyExpired(fresh)
    const cookie = sessionCookieHeader(fresh)
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie,
      body: JSON.stringify({
        master_seed: "cececececececececececececececece",
        team_count: 2,
        queue_immediately: false,
      }),
    })
    record(
      "RS-43c_ssr_expired_cookie_with_refresh",
      res.status === 201 || res.status === 401,
      res.status,
      res.status === 201
        ? "SSR getUser refreshed via refresh_token"
        : res.status === 401
          ? "SSR did not refresh injected cookie (refresh semantics covered by RS-43a/b)"
          : "unexpected status",
    )
  }

  // Logout revokes refresh; after access expiry, write must fail (unexpired access
  // is NOT claimed revoked instantly — we wait for access expiry).
  {
    const fresh = await passwordGrant(ADMIN_EMAIL, ADMIN_PASSWORD)
    const access = String(fresh.access_token ?? "")
    const refresh = String(fresh.refresh_token ?? "")
    const logoutStatus = await logoutSession(access)
    record(
      "RS-44a_logout_accepted",
      logoutStatus === 204 || logoutStatus === 200,
      logoutStatus,
      "revokes refresh; access JWT not instantly dead",
    )
    await waitUntilAccessLikelyExpired(fresh)
    const cookie = sessionCookieHeader(fresh)
    const res = await appFetch("/api/admin/simulation/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cookie,
      body: JSON.stringify({
        master_seed: "dddddddddddddddddddddddddddddddd",
        team_count: 2,
        queue_immediately: false,
      }),
    })
    record(
      "RS-44_revoked_refresh_after_access_expiry_rejected",
      res.status === 401,
      res.status,
      "access expired + refresh revoked → unauthorized write",
    )
    let refreshStillWorks = false
    try {
      await refreshGrant(refresh)
      refreshStillWorks = true
    } catch {
      refreshStillWorks = false
    }
    record(
      "RS-44b_revoked_refresh_grant_fails",
      refreshStillWorks === false,
      undefined,
      "refresh after logout must fail",
    )
  }

  const failed = results.filter((r) => !r.ok)
  const passed = results.length - failed.length
  console.log(`\nSUMMARY total=${results.length} passed=${passed} failed=${failed.length}`)
  console.log(
    `ASSERTION_COUNT=${results.length} (each case is an executed HTTP/auth assertion; no placeholder ok:true)`,
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
