/**
 * MCP tool mode for in-app AI assistants.
 * Default OFF. Opt in with AI_MCP_TOOLS_ENABLED=true (and client mcpEnabled).
 */

export function isAiMcpToolsEnabledByEnv(): boolean {
  const raw = process.env.AI_MCP_TOOLS_ENABLED?.trim().toLowerCase()
  return raw === "true" || raw === "1" || raw === "yes"
}

/** Server-side gate: env must allow MCP, and the request must ask for it. */
export function resolveMcpToolsEnabled(requestWantsMcp: boolean | undefined): boolean {
  if (!isAiMcpToolsEnabledByEnv()) return false
  return requestWantsMcp === true
}
