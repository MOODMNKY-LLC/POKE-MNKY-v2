/**
 * Checked-in runnable browser-closed tick initiator for season-sim foundation.
 *
 * OFF by default: requires SIM_SANDBOX_V2=true and SIM_WORKER_TICK_ENABLED=true.
 * Does a single bounded HTTP call then exits (finite work — not a daemon loop).
 *
 * Usage:
 *   SIM_SANDBOX_V2=true SIM_WORKER_TICK_ENABLED=true \
 *   SIMULATION_WORKER_KEY=... APP_BASE_URL=http://127.0.0.1:3000 \
 *   pnpm exec tsx scripts/sim-worker/tick.ts [--run-id <uuid>] [--max-steps 10]
 *
 * Do NOT add this to vercel.json crons until explicitly enabled in a later PR.
 */

function envTruthy(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]
  return undefined
}

async function main() {
  if (!envTruthy("SIM_SANDBOX_V2")) {
    console.error("Refusing to tick: SIM_SANDBOX_V2 is not enabled")
    process.exit(2)
  }
  if (!envTruthy("SIM_WORKER_TICK_ENABLED")) {
    console.error("Refusing to tick: SIM_WORKER_TICK_ENABLED is not enabled")
    process.exit(2)
  }

  const base =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3000"
  const key =
    process.env.SIMULATION_WORKER_KEY?.trim() ||
    process.env.SIMULATION_API_KEY?.trim()
  if (!key) {
    console.error("Missing SIMULATION_WORKER_KEY (or SIMULATION_API_KEY)")
    process.exit(2)
  }

  const runId = argValue("--run-id")
  const maxSteps = Number(argValue("--max-steps") ?? "10")
  const workerId = `cli-${process.pid}-${Date.now()}`

  const res = await fetch(`${base}/api/admin/simulation/worker/tick`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-simulation-worker-key": key,
    },
    body: JSON.stringify({
      worker_id: workerId,
      run_id: runId,
      max_steps: Number.isFinite(maxSteps) ? maxSteps : 10,
    }),
  })

  const text = await res.text()
  console.log(`HTTP ${res.status}`)
  console.log(text)
  process.exit(res.ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
