import { resolveCall } from "./catalog.mjs"
import { createClient } from "./notion.mjs"

export async function retrieveCall(input) {
  const { role, name, args, token, fetchImpl, sleep } = input || {}
  const resolved = resolveCall(role, name, args || {})
  if (resolved.error) return { error: resolved.error, tool: name, role }
  if (resolved.op === "fixture") return { op: "fixture", tool: name }
  const identity = identityOf(resolved)
  if (!token) {
    return {
      error: "not_configured",
      tool: name,
      role,
      secret: role === "maus" ? "NOTION_MAUS_READONLY_TOKEN" : "NOTION_CLAW_READONLY_TOKEN",
      content: null,
      ...identity,
      retrieved_at: new Date().toISOString(),
      note: "Official page text is not loaded. Do not treat this as a ruling or invent missing numbers.",
    }
  }
  const client = createClient({ token, fetchImpl, sleep })
  try {
    const payload =
      resolved.op === "search"
        ? await client.search(resolved.pages, resolved.query)
        : resolved.op === "database"
          ? await client.database(resolved.source)
          : await client.page(resolved.source)
    return { tool: name, role, ...payload }
  } catch (error) {
    return {
      error: "notion_denied",
      tool: name,
      role,
      status: error.status || 0,
      code: error.code || "notion_error",
      content: null,
      ...identity,
    }
  }
}

function identityOf(resolved) {
  if (resolved.op === "search") {
    return {
      classification: "confirmed_rule",
      sources: resolved.pages.map((source) => ({
        title: source.title,
        source_url: source.url,
        classification: source.classification,
      })),
    }
  }
  return {
    title: resolved.source.title,
    classification: resolved.source.classification,
    source_url: resolved.source.url,
  }
}
