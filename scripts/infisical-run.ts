import { spawn } from "node:child_process"
import { resolve } from "node:path"
import { commandFromArgv, formatInfisicalPlan, planInfisicalRun } from "@/lib/infisical/plan"
import type { InfisicalRunPlan } from "@/lib/infisical/plan"

function cliPath(env: NodeJS.ProcessEnv): string {
  const configured = env.INFISICAL_CLI?.trim()
  return configured || "infisical"
}

function withoutAccessTokens(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env }
  delete next.INFISICAL_TOKEN
  delete next.INFISICAL_UNIVERSAL_AUTH_ACCESS_TOKEN
  return next
}

function run(cli: string, args: string[], env: NodeJS.ProcessEnv, capture: boolean) {
  return new Promise<{ code: number; stdout: string }>((resolvePromise, reject) => {
    const child = spawn(cli, args, {
      env,
      stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"],
    })
    let stdout = ""
    if (capture) {
      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8")
      })
    }
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            "Infisical CLI is not on PATH. Install the official CLI (https://infisical.com/docs/cli/usage) or set INFISICAL_CLI. This repo does not download it during pnpm install.",
          ),
        )
        return
      }
      reject(new Error("Infisical CLI failed to start."))
    })
    child.on("close", (code) => {
      resolvePromise({ code: code ?? 1, stdout })
    })
  })
}

async function accessToken(cli: string, plan: InfisicalRunPlan, env: NodeJS.ProcessEnv) {
  if (plan.authMode === "token") return env.INFISICAL_TOKEN
  if (plan.authMode === "cli-profile") return undefined
  if (!plan.loginArgs) return undefined
  const loggedIn = await run(cli, plan.loginArgs, withoutAccessTokens(env), true)
  if (loggedIn.code !== 0) {
    throw new Error("Universal auth login failed.")
  }
  const line = loggedIn.stdout
    .trim()
    .split(/\r?\n/)
    .filter((part) => part.length > 0)
    .at(-1)
  if (!line || /\s/.test(line)) {
    throw new Error("Universal auth login returned an unexpected payload.")
  }
  return line
}

async function main() {
  const { planOnly, command } = commandFromArgv(process.argv.slice(2))
  const result = planInfisicalRun({
    env: process.env,
    command,
    execPath: process.execPath,
    dropAuthScript: resolve("scripts/infisical-drop-auth.mjs"),
    requireCommand: !planOnly,
  })
  if (!result.ok) {
    process.stderr.write(`${result.message}\n`)
    process.exit(1)
  }
  if (planOnly) {
    process.stdout.write(`${formatInfisicalPlan(result.plan)}\n`)
    return
  }

  const cli = cliPath(process.env)
  let token: string | undefined
  try {
    token = await accessToken(cli, result.plan, process.env)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Infisical authentication failed."
    process.stderr.write(`${message}\n`)
    process.exit(1)
  }

  const env = withoutAccessTokens(process.env)
  env.INFISICAL_DOMAIN = result.plan.domain
  if (token) env.INFISICAL_TOKEN = token

  const child = await run(cli, result.plan.runArgs, env, false)
  process.exit(child.code)
}

void main()
