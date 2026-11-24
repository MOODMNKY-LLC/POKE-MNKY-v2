import { readFileSync } from "node:fs"
import { toolSpec, toolsFor } from "./catalog.mjs"
import { retrieveCall } from "./retrieve.mjs"

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
      return result(message.id, await callTool(role, token, fetchImpl, sleep, message.params || {}))
    }
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32601, message: "method_not_found" },
    }
  }
}

async function callTool(role, token, fetchImpl, sleep, params) {
  const name = params.name
  const retrieved = await retrieveCall({
    role,
    name,
    args: params.arguments || {},
    token,
    fetchImpl,
    sleep,
  })
  if (retrieved.op === "fixture") return readFixture()
  if (retrieved.error) return toolError(retrieved)
  return { content: [{ type: "text", text: JSON.stringify(retrieved) }], isError: false }
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
