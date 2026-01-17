// Agents SDK - Centralized exports
export * from './draft-assistant'
export * from './free-agency-agent'
export * from './battle-strategy-agent'
export * from './mcp-servers'

// Agent initialization helper (call this at app startup)
// Note: MCP servers are initialized automatically when agents are used
// This function is kept for backward compatibility but may not be needed
export async function initializeAllAgents() {
  // MCP servers are initialized on-demand when agents are used
  // This allows for lazy initialization and better error handling
  console.log('[Agents] MCP servers will be initialized on-demand when agents are used')
}

// Agent cleanup helper (call this at app shutdown)
export async function closeAllAgents() {
  const { closeAllMCPServers } = await import('./mcp-servers')
  await closeAllMCPServers()
}
