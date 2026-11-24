import { resolveCall, toolsFor } from "../../agents/aab-notion/catalog.mjs"

export type KnowledgeRole = "claw" | "maus"

const COMMISSIONER_ROLES = new Set(["commissioner", "admin"])

export function knowledgeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AAB_KNOWLEDGE_ENABLED === "true"
}

export function knowledgeRole(profileRole: string | null | undefined): KnowledgeRole {
  return profileRole && COMMISSIONER_ROLES.has(profileRole) ? "maus" : "claw"
}

export function allowedToolNames(role: KnowledgeRole): string[] {
  return Object.keys(toolsFor(role)).filter((name) => name !== "aab_fixture_canary")
}

export function authorizeKnowledgeTool(
  role: KnowledgeRole,
  tool: string,
  args: Record<string, unknown> = {},
) {
  if (tool === "aab_fixture_canary") {
    return { error: "permission_denied" as const, tool }
  }
  const resolved = resolveCall(role, tool, args)
  if (resolved.error === "permission_denied") return { error: "permission_denied" as const, tool }
  if (resolved.error) return { error: resolved.error as "invalid_argument", tool }
  if (resolved.op === "page" || resolved.op === "database") {
    return {
      tool,
      role,
      title: resolved.source.title,
      classification: resolved.source.classification,
      source_url: resolved.source.url,
      content: null,
      error: "not_configured" as const,
      retrieved_at: new Date().toISOString(),
      note: "Source identity only. Page text loads after the matching read-only Notion token is installed. This is not a league ruling.",
    }
  }
  return {
    tool,
    role,
    classification: "confirmed_rule",
    content: null,
    error: "not_configured" as const,
    retrieved_at: new Date().toISOString(),
    note: "Rule search needs the league reader token. No page id was accepted.",
  }
}
