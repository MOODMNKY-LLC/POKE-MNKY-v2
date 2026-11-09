import { INFISICAL_DEPLOYMENT_SLOTS, isInfisicalDeploymentSlot } from "@/lib/infisical/environments"
import type { InfisicalDeploymentSlot } from "@/lib/infisical/environments"

export type InfisicalAuthMode = "token" | "universal-auth" | "cli-profile"

export type InfisicalConfigCode =
  | "domain_missing"
  | "domain_conflict"
  | "domain_invalid"
  | "domain_cloud"
  | "domain_insecure"
  | "project_missing"
  | "project_placeholder"
  | "slot_missing"
  | "slot_unknown"
  | "environment_mismatch"
  | "path_invalid"
  | "auth_missing"
  | "auth_incomplete"
  | "command_missing"

export type InfisicalRunPlan = {
  domain: string
  host: string
  projectId: string
  deploymentSlot: InfisicalDeploymentSlot
  environment: string
  secretPath: string
  includeImports: boolean
  secretOverriding: boolean
  authMode: InfisicalAuthMode
  /** `infisical login` args. Credentials stay in the environment, not in these args. */
  loginArgs: string[] | null
  /** `infisical secrets-manager run` args, including the scrubber and user command. */
  runArgs: string[]
}

export type InfisicalPlanResult =
  | { ok: true; plan: InfisicalRunPlan }
  | { ok: false; code: InfisicalConfigCode; message: string }

const PLACEHOLDER_PROJECT_IDS = new Set([
  "replace_with_project_id",
  "replace-with-project-id",
  "<project-id>",
  "project-id",
  "your-project",
  "your-project-id",
  "example",
  "changeme",
  "todo",
])

function blank(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function fail(code: InfisicalConfigCode, message: string): InfisicalPlanResult {
  return { ok: false, code, message }
}

function parseOrigin(raw: string): InfisicalPlanResult | { origin: string; host: string } {
  if (raw.includes("@")) {
    return fail(
      "domain_invalid",
      "INFISICAL_DOMAIN must be an origin without username or password.",
    )
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return fail(
      "domain_invalid",
      "INFISICAL_DOMAIN must be an absolute http(s) origin.",
    )
  }
  if (url.username || url.password) {
    return fail(
      "domain_invalid",
      "INFISICAL_DOMAIN must be an origin without username or password.",
    )
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return fail(
      "domain_invalid",
      "INFISICAL_DOMAIN must use https, or http only for localhost.",
    )
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    return fail(
      "domain_invalid",
      "INFISICAL_DOMAIN must be an origin with no path, query, or hash.",
    )
  }
  const host = url.hostname.toLowerCase()
  if (host === "infisical.com" || host.endsWith(".infisical.com")) {
    return fail(
      "domain_cloud",
      "Refusing Infisical Cloud. Set INFISICAL_DOMAIN to the self-hosted origin. This tool does not fall back to https://app.infisical.com.",
    )
  }
  const localHttp = host === "localhost" || host === "127.0.0.1"
  if (url.protocol === "http:" && !localHttp) {
    return fail(
      "domain_insecure",
      "INFISICAL_DOMAIN must use https outside localhost.",
    )
  }
  return { origin: url.origin, host }
}

function resolveDomain(
  env: Record<string, string | undefined>,
): InfisicalPlanResult | { origin: string; host: string } {
  const domain = blank(env.INFISICAL_DOMAIN)
  const apiUrl = blank(env.INFISICAL_API_URL)
  if (!domain && !apiUrl) {
    return fail(
      "domain_missing",
      "Set INFISICAL_DOMAIN to the self-hosted Infisical origin. INFISICAL_API_URL is accepted as an alias. There is no Cloud default.",
    )
  }
  const primary = domain ?? apiUrl
  if (!primary) {
    return fail("domain_missing", "Set INFISICAL_DOMAIN to the self-hosted Infisical origin.")
  }
  const parsed = parseOrigin(primary)
  if ("ok" in parsed) return parsed
  if (domain && apiUrl) {
    const alias = parseOrigin(apiUrl)
    if ("ok" in alias) return alias
    if (alias.origin !== parsed.origin) {
      return fail(
        "domain_conflict",
        "INFISICAL_DOMAIN and INFISICAL_API_URL point at different origins. Unset one of them.",
      )
    }
  }
  return parsed
}

function resolveProjectId(raw: string | undefined): InfisicalPlanResult | { projectId: string } {
  const projectId = blank(raw)
  if (!projectId) {
    return fail(
      "project_missing",
      "Set INFISICAL_PROJECT_ID to the existing project's id. This repo does not guess or create a project.",
    )
  }
  if (projectId.includes("://") || /\s/.test(projectId)) {
    return fail("project_placeholder", "INFISICAL_PROJECT_ID is not a project id.")
  }
  if (PLACEHOLDER_PROJECT_IDS.has(projectId.toLowerCase())) {
    return fail(
      "project_placeholder",
      "INFISICAL_PROJECT_ID is still a placeholder. Use the id from the existing project.",
    )
  }
  return { projectId }
}

function resolveSlot(
  env: Record<string, string | undefined>,
): InfisicalPlanResult | { slot: InfisicalDeploymentSlot; environment: string } {
  const slotRaw = blank(env.INFISICAL_DEPLOYMENT_SLOT)
  if (!slotRaw) {
    return fail(
      "slot_missing",
      "Set INFISICAL_DEPLOYMENT_SLOT to development, preview, or production. There is no default environment.",
    )
  }
  if (!isInfisicalDeploymentSlot(slotRaw)) {
    return fail(
      "slot_unknown",
      "INFISICAL_DEPLOYMENT_SLOT must be development, preview, or production.",
    )
  }
  const environment = INFISICAL_DEPLOYMENT_SLOTS[slotRaw]
  const override = blank(env.INFISICAL_ENVIRONMENT)
  if (override && override !== environment) {
    return fail(
      "environment_mismatch",
      `INFISICAL_ENVIRONMENT=${override} does not match the ${slotRaw} slot slug ${environment}. Unset it or change lib/infisical/environments.ts to the project's real slugs.`,
    )
  }
  return { slot: slotRaw, environment }
}

function resolvePath(raw: string | undefined): InfisicalPlanResult | { secretPath: string } {
  const secretPath = blank(raw) ?? "/"
  if (!secretPath.startsWith("/") || secretPath.includes("..") || !/^\/[A-Za-z0-9._/-]*$/.test(secretPath)) {
    return fail(
      "path_invalid",
      "INFISICAL_SECRET_PATH must be an absolute folder path such as / or /poke-mnky.",
    )
  }
  return { secretPath }
}

function resolveAuth(
  env: Record<string, string | undefined>,
): InfisicalPlanResult | { authMode: InfisicalAuthMode } {
  const mode = blank(env.INFISICAL_AUTH)
  if (!mode) {
    return fail(
      "auth_missing",
      "Set INFISICAL_AUTH to token, universal-auth, or cli-profile. Interactive Cloud login is not used.",
    )
  }
  switch (mode) {
    case "token":
      if (!blank(env.INFISICAL_TOKEN)) {
        return fail(
          "auth_incomplete",
          "INFISICAL_AUTH=token requires INFISICAL_TOKEN. The token is not printed.",
        )
      }
      return { authMode: "token" }
    case "universal-auth":
      if (
        !blank(env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID) ||
        !blank(env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET)
      ) {
        return fail(
          "auth_incomplete",
          "INFISICAL_AUTH=universal-auth requires INFISICAL_UNIVERSAL_AUTH_CLIENT_ID and INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET.",
        )
      }
      return { authMode: "universal-auth" }
    case "cli-profile":
      if (blank(env.INFISICAL_TOKEN) || blank(env.INFISICAL_UNIVERSAL_AUTH_ACCESS_TOKEN)) {
        return fail(
          "auth_incomplete",
          "INFISICAL_AUTH=cli-profile refuses a leftover access token. Unset INFISICAL_TOKEN and INFISICAL_UNIVERSAL_AUTH_ACCESS_TOKEN, or use INFISICAL_AUTH=token.",
        )
      }
      return { authMode: "cli-profile" }
    default:
      return fail(
        "auth_missing",
        "INFISICAL_AUTH must be token, universal-auth, or cli-profile.",
      )
  }
}

function flag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true"
}

export function planInfisicalRun(input: {
  env: Record<string, string | undefined>
  command: string[]
  execPath: string
  dropAuthScript: string
  requireCommand: boolean
}): InfisicalPlanResult {
  const domain = resolveDomain(input.env)
  if ("ok" in domain) return domain
  const project = resolveProjectId(input.env.INFISICAL_PROJECT_ID)
  if ("ok" in project) return project
  const slot = resolveSlot(input.env)
  if ("ok" in slot) return slot
  const path = resolvePath(input.env.INFISICAL_SECRET_PATH)
  if ("ok" in path) return path
  const auth = resolveAuth(input.env)
  if ("ok" in auth) return auth
  if (input.requireCommand && input.command.length === 0) {
    return fail(
      "command_missing",
      "Pass a command after --. Example: pnpm secrets:run -- pnpm dev",
    )
  }

  const includeImports = flag(input.env.INFISICAL_INCLUDE_IMPORTS)
  const secretOverriding = flag(input.env.INFISICAL_SECRET_OVERRIDING)
  const loginArgs =
    auth.authMode === "universal-auth"
      ? [
          "login",
          "--method=universal-auth",
          `--domain=${domain.origin}`,
          "--silent",
          "--plain",
        ]
      : null
  const runArgs = [
    "secrets-manager",
    "run",
    `--domain=${domain.origin}`,
    `--projectId=${project.projectId}`,
    `--env=${slot.environment}`,
    `--path=${path.secretPath}`,
    `--include-imports=${includeImports ? "true" : "false"}`,
    `--secret-overriding=${secretOverriding ? "true" : "false"}`,
    "--expand=true",
    "--",
    input.execPath,
    input.dropAuthScript,
    "--",
    ...input.command,
  ]

  return {
    ok: true,
    plan: {
      domain: domain.origin,
      host: domain.host,
      projectId: project.projectId,
      deploymentSlot: slot.slot,
      environment: slot.environment,
      secretPath: path.secretPath,
      includeImports,
      secretOverriding,
      authMode: auth.authMode,
      loginArgs,
      runArgs,
    },
  }
}

/** Args after pnpm/tsx have already consumed their own `--` separator. */
export function commandFromArgv(argv: string[]): { planOnly: boolean; command: string[] } {
  const separator = argv.indexOf("--")
  const head = separator === -1 ? argv : argv.slice(0, separator)
  const tail = separator === -1 ? [] : argv.slice(separator + 1)
  const planOnly = head.includes("--plan")
  const command = separator === -1 ? head.filter((arg) => arg !== "--plan") : tail
  return { planOnly, command }
}

export function formatInfisicalPlan(plan: InfisicalRunPlan): string {
  return [
    "infisical plan",
    `host: ${plan.host}`,
    `deployment_slot: ${plan.deploymentSlot}`,
    `environment: ${plan.environment}`,
    `auth: ${plan.authMode}`,
    `path: ${plan.secretPath}`,
    `include_imports: ${plan.includeImports}`,
    `secret_overriding: ${plan.secretOverriding}`,
    "project_id: set",
  ].join("\n")
}
