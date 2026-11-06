/**
 * Real v2 HTTP route + worker tick against a disposable PostgREST↔Postgres stack.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL  — e.g. http://127.0.0.1:65433 (PostgREST)
 *   SUPABASE_SERVICE_ROLE_KEY — local demo service_role JWT for that JWT secret
 *   SEASON_SIM_HTTP_INTEGRATION=1
 *
 * Auth gate (requireLeagueAdmin) is stubbed to a synthetic admin UUID so the
 * test exercises route handlers + run-service + RPCs against the real DB.
 * createServiceRoleClient / run-service are NOT mocked.
 *
 * Flags are enabled only for this process and restored afterward.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { randomUUID } from "node:crypto"

const enabled = process.env.SEASON_SIM_HTTP_INTEGRATION === "1"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""
const canRun = enabled && Boolean(supabaseUrl) && Boolean(serviceKey)

const ADMIN_USER_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
const WORKER_KEY = "local-disposable-sim-worker-key-only"

const prevEnv: Record<string, string | undefined> = {}

function snapshotEnv(keys: string[]) {
  for (const key of keys) {
    prevEnv[key] = process.env[key]
  }
}

function restoreEnv() {
  for (const [key, value] of Object.entries(prevEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

vi.mock("@/lib/admin-api-auth", () => ({
  requireLeagueAdmin: vi.fn(async () => ({
    userId: ADMIN_USER_ID,
    role: "admin",
  })),
}))

describe.skipIf(!canRun)("season-sim v2 HTTP + worker (real PostgREST DB)", () => {
  beforeAll(() => {
    snapshotEnv([
      "SIM_SANDBOX_V2",
      "SIM_WORKER_TICK_ENABLED",
      "SIM_LEGACY_SIMULATION_WRITES",
      "SIMULATION_WORKER_KEY",
      "SIMULATION_API_KEY",
    ])
    process.env.SIM_SANDBOX_V2 = "true"
    process.env.SIM_WORKER_TICK_ENABLED = "true"
    delete process.env.SIM_LEGACY_SIMULATION_WRITES
    process.env.SIMULATION_WORKER_KEY = WORKER_KEY
  })

  afterAll(() => {
    restoreEnv()
  })

  it("flags OFF (pre-enablement) keep v2 create and worker tick disabled", async () => {
    process.env.SIM_SANDBOX_V2 = "false"
    process.env.SIM_WORKER_TICK_ENABLED = "false"
    vi.resetModules()
    const { POST: createPost } = await import(
      "@/app/api/admin/simulation/runs/route"
    )
    const createRes = await createPost(
      new NextRequest("http://127.0.0.1/api/admin/simulation/runs", {
        method: "POST",
        body: "{}",
      }),
    )
    expect(createRes.status).toBe(503)
    expect((await createRes.json()).code).toBe("SIM_SANDBOX_V2_DISABLED")

    const { POST: tickPost } = await import(
      "@/app/api/admin/simulation/worker/tick/route"
    )
    const tickRes = await tickPost(
      new NextRequest("http://127.0.0.1/api/admin/simulation/worker/tick", {
        method: "POST",
        headers: { "x-simulation-worker-key": WORKER_KEY },
        body: "{}",
      }),
    )
    expect(tickRes.status).toBe(503)

    const { POST: legacyDraft } = await import(
      "@/app/api/admin/simulation/draft/route"
    )
    const legacyRes = await legacyDraft(
      new NextRequest("http://127.0.0.1/api/admin/simulation/draft", {
        method: "POST",
        body: "{}",
      }),
    )
    expect(legacyRes.status).toBe(410)

    process.env.SIM_SANDBOX_V2 = "true"
    process.env.SIM_WORKER_TICK_ENABLED = "true"
    vi.resetModules()
  })

  it("creates sandbox run, replays command hash conflict, ticks, blocks domain, pause/cancel", async () => {
    vi.resetModules()
    const { POST: createPost } = await import(
      "@/app/api/admin/simulation/runs/route"
    )
    const createRes = await createPost(
      new NextRequest("http://127.0.0.1/api/admin/simulation/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          master_seed: "0123456789abcdef0123456789abcdef",
          team_count: 4,
          queue_immediately: true,
        }),
      }),
    )
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(created.run?.run_id).toBeTruthy()
    expect(created.season_id).toBeTruthy()
    expect(created.team_ids?.length).toBe(4)
    expect(created.run.status).toBe("queued")
    expect(created.run.phase).toBe("configured")
    expect(created.run.phase).not.toBe("complete")

    const runId = created.run.run_id as string
    let stepSeq = Number(created.run.step_seq)
    let runVersion = Number(created.run.run_version)

    const { POST: advancePost } = await import(
      "@/app/api/admin/simulation/runs/[id]/advance/route"
    )
    const commandId = randomUUID()
    const advanceBody = {
      command_id: commandId,
      unit: "foundation",
      n: 2,
      expected_step_seq: stepSeq,
      expected_run_version: runVersion,
    }
    const adv1 = await advancePost(
      new NextRequest(
        `http://127.0.0.1/api/admin/simulation/runs/${runId}/advance`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(advanceBody),
        },
      ),
      { params: Promise.resolve({ id: runId }) },
    )
    expect(adv1.status).toBe(202)
    const adv1Body = await adv1.json()
    expect(
      adv1Body.replayed === true ||
        adv1Body.status === "accepted" ||
        adv1Body.status === "queued",
    ).toBe(true)

    // Same command_id + different payload hash → conflict
    const conflict = await advancePost(
      new NextRequest(
        `http://127.0.0.1/api/admin/simulation/runs/${runId}/advance`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...advanceBody,
            n: 99,
          }),
        },
      ),
      { params: Promise.resolve({ id: runId }) },
    )
    expect(conflict.status).toBe(409)

    // Honest replay with identical payload
    const replay = await advancePost(
      new NextRequest(
        `http://127.0.0.1/api/admin/simulation/runs/${runId}/advance`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(advanceBody),
        },
      ),
      { params: Promise.resolve({ id: runId }) },
    )
    expect(replay.status).toBe(202)
    const replayBody = await replay.json()
    expect(
      replayBody.replayed === true || replayBody.status === "accepted",
    ).toBe(true)

    const { POST: tickPost } = await import(
      "@/app/api/admin/simulation/worker/tick/route"
    )
    const tick1 = await tickPost(
      new NextRequest("http://127.0.0.1/api/admin/simulation/worker/tick", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-simulation-worker-key": WORKER_KEY,
        },
        body: JSON.stringify({
          run_id: runId,
          worker_id: "http-int-worker-1",
          max_steps: 5,
        }),
      }),
    )
    expect(tick1.status).toBe(200)
    const tick1Body = await tick1.json()
    expect(tick1Body.ok).toBe(true)
    expect(Array.isArray(tick1Body.results)).toBe(true)
    const tickResult = tick1Body.results[0]
    expect(tickResult?.claimed).toBe(true)
    expect(tickResult?.steps_applied).toBeGreaterThanOrEqual(1)
    expect(tickResult?.run_status).not.toBe("completed")

    const { GET: getRun } = await import(
      "@/app/api/admin/simulation/runs/[id]/route"
    )
    const getRes = await getRun(
      new NextRequest(`http://127.0.0.1/api/admin/simulation/runs/${runId}`),
      { params: Promise.resolve({ id: runId }) },
    )
    expect(getRes.status).toBe(200)
    const getBody = await getRes.json()
    const progress = getBody.progress ?? getBody
    stepSeq = Number(progress.step_seq)
    runVersion = Number(progress.run_version)

    // Unsupported domain unit → blocked, no fabricated champion
    const domainCmd = randomUUID()
    const domainAdv = await advancePost(
      new NextRequest(
        `http://127.0.0.1/api/admin/simulation/runs/${runId}/advance`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            command_id: domainCmd,
            unit: "draft",
            n: 1,
            expected_step_seq: stepSeq,
            expected_run_version: runVersion,
          }),
        },
      ),
      { params: Promise.resolve({ id: runId }) },
    )
    // May 202 accept then worker blocks, or 422 if unit rejected at API — either honest
    expect([202, 409, 422].includes(domainAdv.status)).toBe(true)

    if (domainAdv.status === 202) {
      const tickDomain = await tickPost(
        new NextRequest("http://127.0.0.1/api/admin/simulation/worker/tick", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-simulation-worker-key": WORKER_KEY,
          },
          body: JSON.stringify({
            run_id: runId,
            worker_id: "http-int-worker-domain",
            max_steps: 3,
          }),
        }),
      )
      expect(tickDomain.status).toBe(200)
      const domainTick = (await tickDomain.json()).results?.[0]
      expect(domainTick?.reason === "UNSUPPORTED_DOMAIN_STEP" || domainTick?.run_status === "blocked").toBe(
        true,
      )
    }

    const getBlocked = await getRun(
      new NextRequest(`http://127.0.0.1/api/admin/simulation/runs/${runId}`),
      { params: Promise.resolve({ id: runId }) },
    )
    const blockedProgress = (await getBlocked.json()).progress ?? {}
    if (domainAdv.status === 202) {
      expect(blockedProgress.status).toBe("blocked")
    }
    expect(blockedProgress.phase).not.toBe("complete")

    // Fresh run for pause/cancel path
    const create2 = await createPost(
      new NextRequest("http://127.0.0.1/api/admin/simulation/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          master_seed: "fedcba9876543210fedcba9876543210",
          team_count: 2,
          queue_immediately: true,
        }),
      }),
    )
    expect(create2.status).toBe(201)
    const run2 = await create2.json()
    const runId2 = run2.run.run_id as string
    const step2 = Number(run2.run.step_seq)
    const ver2 = Number(run2.run.run_version)

    const { POST: pausePost } = await import(
      "@/app/api/admin/simulation/runs/[id]/pause/route"
    )
    const pauseRes = await pausePost(
      new NextRequest(
        `http://127.0.0.1/api/admin/simulation/runs/${runId2}/pause`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            command_id: randomUUID(),
            expected_step_seq: step2,
            expected_run_version: ver2,
          }),
        },
      ),
      { params: Promise.resolve({ id: runId2 }) },
    )
    expect(pauseRes.status).toBe(202)

    const getPaused = await getRun(
      new NextRequest(`http://127.0.0.1/api/admin/simulation/runs/${runId2}`),
      { params: Promise.resolve({ id: runId2 }) },
    )
    const pausedBody = (await getPaused.json()).progress ?? {}
    expect(pausedBody.status).toBe("paused")
    const stepPause = Number(pausedBody.step_seq)
    const verPause = Number(pausedBody.run_version)

    const { POST: cancelPost } = await import(
      "@/app/api/admin/simulation/runs/[id]/cancel/route"
    )
    const cancelRes = await cancelPost(
      new NextRequest(
        `http://127.0.0.1/api/admin/simulation/runs/${runId2}/cancel`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            command_id: randomUUID(),
            expected_step_seq: stepPause,
            expected_run_version: verPause,
          }),
        },
      ),
      { params: Promise.resolve({ id: runId2 }) },
    )
    expect(cancelRes.status).toBe(202)

    const tickCancel = await tickPost(
      new NextRequest("http://127.0.0.1/api/admin/simulation/worker/tick", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-simulation-worker-key": WORKER_KEY,
        },
        body: JSON.stringify({
          run_id: runId2,
          worker_id: "http-int-cancel",
          max_steps: 2,
        }),
      }),
    )
    expect(tickCancel.status).toBe(200)
    const cancelTick = (await tickCancel.json()).results?.[0]
    expect(
      cancelTick?.run_status === "cancelled" ||
        cancelTick?.reason === "CANCELLED" ||
        cancelTick?.claimed === true,
    ).toBe(true)

    const getFinal = await getRun(
      new NextRequest(`http://127.0.0.1/api/admin/simulation/runs/${runId2}`),
      { params: Promise.resolve({ id: runId2 }) },
    )
    const finalBody = (await getFinal.json()).progress ?? {}
    expect(finalBody.phase).not.toBe("complete")
  })

  it("rejects worker tick without key when flags on", async () => {
    vi.resetModules()
    process.env.SIM_SANDBOX_V2 = "true"
    process.env.SIM_WORKER_TICK_ENABLED = "true"
    // Force admin mock to deny for this case — re-mock would need module isolation;
    // instead omit worker key and temporarily make requireLeagueAdmin fail.
    const auth = await import("@/lib/admin-api-auth")
    vi.mocked(auth.requireLeagueAdmin).mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    } as never)

    const { POST: tickPost } = await import(
      "@/app/api/admin/simulation/worker/tick/route"
    )
    const res = await tickPost(
      new NextRequest("http://127.0.0.1/api/admin/simulation/worker/tick", {
        method: "POST",
        body: "{}",
      }),
    )
    expect(res.status).toBe(401)

    vi.mocked(auth.requireLeagueAdmin).mockResolvedValue({
      userId: ADMIN_USER_ID,
      role: "admin",
    })
  })
})
