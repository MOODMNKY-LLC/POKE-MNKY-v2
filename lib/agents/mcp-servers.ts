// Shared MCP Server Configurations for AI Agents
// This module provides pre-configured MCP servers that can be used by all agents

import { MCPServerStreamableHttp, MCPServerStdio } from '@openai/agents'

// ============================================================================
// HTTP-based MCP Servers (Streamable HTTP)
// ============================================================================

/**
 * Draft Pool MCP Server (HTTP-based)
 * Provides access to draft pool data, team budgets, picks, and draft status
 */
export const draftPoolMCP = new MCPServerStreamableHttp({
  url: process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp',
  name: 'poke-mnky-draft-pool',
  cacheToolsList: true,
})

// ============================================================================
// Stdio-based MCP Servers (Docker commands)
// ============================================================================

/**
 * Sequential Thinking MCP Server
 * Provides structured reasoning and problem-solving capabilities
 */
export const sequentialThinkingMCP = new MCPServerStdio({
  name: 'sequential-thinking',
  command: 'docker',
  args: [
    'run',
    '--rm',
    '-i',
    'mcp/sequentialthinking',
  ],
  cacheToolsList: true,
})

/**
 * Brave Search MCP Server
 * Provides web search capabilities with citation support
 */
export const braveSearchMCP = new MCPServerStdio({
  name: 'brave-search',
  command: 'docker',
  args: [
    'run',
    '--rm',
    '-i',
    '-e',
    `BRAVE_API_KEY=${process.env.BRAVE_API_KEY || 'BSArD2QB4pyWBoLUP2dxCv2qZkAz79l'}`,
    'mcp/brave-search',
  ],
  cacheToolsList: true,
})

/**
 * Tavily Search MCP Server
 * Provides AI-optimized web search with advanced filtering
 */
export const tavilyMCP = new MCPServerStdio({
  name: 'tavily',
  command: 'docker',
  args: [
    'run',
    '--rm',
    '-i',
    '-e',
    `TAVILY_API_KEY=${process.env.TAVILY_API_KEY || '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'}`,
    'mcp/tavily',
  ],
  cacheToolsList: true,
})

/**
 * Firecrawl MCP Server
 * Provides web scraping, crawling, and content extraction capabilities
 */
export const firecrawlMCP = new MCPServerStdio({
  name: 'firecrawl',
  command: 'docker',
  args: [
    'run',
    '--rm',
    '-i',
    '-e',
    `FIRECRAWL_API_KEY=${process.env.FIRECRAWL_API_KEY || 'fc-38c356eab8bb481e9c54a0ea7b87217d'}`,
    'mcp/firecrawl',
  ],
  cacheToolsList: true,
})

/**
 * Fetch MCP Server
 * Provides simple HTTP fetching capabilities
 */
export const fetchMCP = new MCPServerStdio({
  name: 'fetch',
  command: 'docker',
  args: [
    'run',
    '--rm',
    '-i',
    'mcp/fetch',
  ],
  cacheToolsList: true,
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all standard MCP servers for agents
 * Includes: Draft Pool, Sequential Thinking, Brave Search, Tavily, Firecrawl, Fetch
 */
export function getAllMCPServers() {
  return [
    draftPoolMCP,
    sequentialThinkingMCP,
    braveSearchMCP,
    tavilyMCP,
    firecrawlMCP,
    fetchMCP,
  ]
}

/**
 * Get research-focused MCP servers (search + scraping)
 * Includes: Brave Search, Tavily, Firecrawl, Fetch, Sequential Thinking
 */
export function getResearchMCPServers() {
  return [
    sequentialThinkingMCP,
    braveSearchMCP,
    tavilyMCP,
    firecrawlMCP,
    fetchMCP,
  ]
}

/**
 * Get draft-focused MCP servers
 * Includes: Draft Pool, Sequential Thinking (for analysis)
 */
export function getDraftMCPServers() {
  return [
    draftPoolMCP,
    sequentialThinkingMCP,
  ]
}

/**
 * Initialize all MCP servers
 * Connects to all configured servers
 */
export async function initializeAllMCPServers() {
  const servers = getAllMCPServers()
  await Promise.all(servers.map(server => {
    if ('connect' in server && typeof server.connect === 'function') {
      return server.connect().catch(err => {
        console.warn(`[MCP] Failed to connect to ${server.name || 'unknown'}:`, err.message)
      })
    }
    return Promise.resolve()
  }))
}

/**
 * Close all MCP servers
 * Disconnects from all configured servers
 */
export async function closeAllMCPServers() {
  const servers = getAllMCPServers()
  await Promise.all(servers.map(server => {
    if ('close' in server && typeof server.close === 'function') {
      return server.close().catch(err => {
        console.warn(`[MCP] Failed to close ${server.name || 'unknown'}:`, err.message)
      })
    }
    return Promise.resolve()
  }))
}
