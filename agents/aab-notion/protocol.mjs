import { readFileSync } from "node:fs"
import { resolveCall, toolSpec, toolsFor } from "./catalog.mjs"
import { createClient } from "./notion.mjs"

export function loadToken(filePath, read = readFileSync) {
  if (!filePath) return ""
  try {
    return read(filePath, "utf8").trim()
  } catch {
    return ""
  }
}

export function createHandler({ role, token, fetchImpl, sleep }) {
  const tools = Object.keys(toolsFor(role)).map(toolSpec)
  const client = token ? createClient({ token, fetchImpl, sleep }) : null

  return async function handle(message) {
    if (!message || message.jsonrpc !== "2.0") return null
    if (message.id == null) return null
    if (message.method === "initialize") {
      return result(message.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "aab-notion", version: "0.1.0" },
      })
    }
    if (message.method === "ping") return result(message.id, {})
    if (message.method === "tools/list") return result(message.id, { tools })
    if (message.method === "tools/call") {
      return result(message.id, await callTool(role, client, message.params || {}))
    }
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32601, message: "method_not_found" },
    }
  }
}

async function callTool(role, client, params) {
  const name = params.name
  const resolved = resolveCall(role, name, params.arguments || {})
  if (resolved.error) {
    return toolError(resolved)
  }
  if (resolved.op === "fixture") {
    return readFixture()
  }
  if (!client) {
    return toolError({
      error: "not_configured",
      tool: name,
      secret: role === "maus" ? "NOTION_MAUS_READONLY_TOKEN" : "NOTION_CLAW_READONLY_TOKEN",
    })
  }
  try {
    const payload =
      resolved.op === "search"
        ? await client.search(resolved.pages, resolved.query)
        : resolved.op === "database"
          ? await client.database(resolved.source)
          : await client.page(resolved.source)
    return { content: [{ type: "text", text: JSON.stringify(payload) }], isError: false }
  } catch (error) {
    return toolError({ error: "notion_denied", status: error.status || 0, code: error.code || "notion_error" })
  }
}

function readFixture() {
  const value = loadToken(process.env.AAB_FIXTURE_FILE)
  if (!value) return toolError({ error: "fixture_missing" })
  return {
    content: [{ type: "text", text: JSON.stringify({ value, authority: "fixture" }) }],
    isError: false,
  }
}

function toolError(body) {
  return {
    content: [{ type: "text", text: JSON.stringify(body) }],
    isError: true,
  }
}

function result(id, value) {
  return { jsonrpc: "2.0", id, result: value }
}
