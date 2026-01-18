#!/usr/bin/env tsx
/**
 * Test Script: MCP Chat Integration
 * 
 * Tests the chat route's MCP tool integration to verify:
 * 1. MCP tools are accessible
 * 2. Tool calls are executed
 * 3. Tool results are returned
 * 
 * Usage: pnpm tsx scripts/test-mcp-chat-integration.ts
 */

import { createServerClient } from '@/lib/supabase/server'

const MCP_SERVER_URL = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
const MCP_API_KEY = process.env.MCP_API_KEY

async function testMcpServerHealth() {
  console.log('🔍 Testing MCP Server Health...')
  
  try {
    const healthUrl = MCP_SERVER_URL.replace('/mcp', '/health')
    const response = await fetch(healthUrl)
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ MCP Server Health:', data)
    return true
  } catch (error) {
    console.error('❌ MCP Server Health Check Failed:', error)
    return false
  }
}

async function testMcpToolCall() {
  console.log('\n🔍 Testing MCP Tool Call (REST API)...')
  
  try {
    const toolUrl = MCP_SERVER_URL.replace('/mcp', '/api/get_available_pokemon')
    const response = await fetch(toolUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(MCP_API_KEY && { 'Authorization': `Bearer ${MCP_API_KEY}` }),
      },
      body: JSON.stringify({ limit: 5 }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tool call failed: ${response.statusText}\n${errorText}`)
    }
    
    const data = await response.json()
    console.log('✅ MCP Tool Call Success:', {
      pokemonCount: data.pokemon?.length || 0,
      hasPokemon: !!data.pokemon,
    })
    return true
  } catch (error) {
    console.error('❌ MCP Tool Call Failed:', error)
    return false
  }
}

async function testMcpFunctionsEndpoint() {
  console.log('\n🔍 Testing MCP Functions Endpoint...')
  
  try {
    const functionsUrl = MCP_SERVER_URL.replace('/mcp', '/functions')
    const response = await fetch(functionsUrl, {
      headers: {
        ...(MCP_API_KEY && { 'Authorization': `Bearer ${MCP_API_KEY}` }),
      },
    })
    
    if (!response.ok) {
      throw new Error(`Functions endpoint failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ MCP Functions Available:', {
      toolCount: data.tools?.length || 0,
      tools: data.tools?.map((t: any) => t.function?.name || t.name).slice(0, 5),
    })
    return true
  } catch (error) {
    console.error('❌ MCP Functions Endpoint Failed:', error)
    return false
  }
}

async function testChatRouteToolCall() {
  console.log('\n🔍 Testing Chat Route Tool Call...')
  console.log('⚠️  This requires a running dev server and authenticated user')
  console.log('   Run this test manually in the browser or with a test user')
  
  // This would require:
  // 1. Running dev server
  // 2. Authenticated user session
  // 3. Making POST request to /api/ai/assistant
  // 4. Parsing SSE stream for tool call events
  
  console.log('\n📝 Manual Test Steps:')
  console.log('1. Start dev server: pnpm dev')
  console.log('2. Open browser and log in')
  console.log('3. Open chat interface')
  console.log('4. Send: "What Pokémon are available?"')
  console.log('5. Check:')
  console.log('   - Network tab: Look for SSE stream events')
  console.log('   - Console: Check for tool call logs')
  console.log('   - UI: Verify tool call cards appear')
}

async function main() {
  console.log('🧪 MCP Chat Integration Test Suite\n')
  console.log('Configuration:')
  console.log(`  MCP Server URL: ${MCP_SERVER_URL}`)
  console.log(`  MCP API Key: ${MCP_API_KEY ? '✅ Set' : '❌ Not set'}\n`)
  
  const results = {
    health: false,
    toolCall: false,
    functions: false,
  }
  
  // Test 1: Server Health
  results.health = await testMcpServerHealth()
  
  // Test 2: Tool Call (REST API)
  if (results.health) {
    results.toolCall = await testMcpToolCall()
  }
  
  // Test 3: Functions Endpoint
  if (results.health) {
    results.functions = await testMcpFunctionsEndpoint()
  }
  
  // Test 4: Chat Route (manual)
  await testChatRouteToolCall()
  
  // Summary
  console.log('\n📊 Test Results Summary:')
  console.log(`  Server Health: ${results.health ? '✅' : '❌'}`)
  console.log(`  Tool Call (REST): ${results.toolCall ? '✅' : '❌'}`)
  console.log(`  Functions Endpoint: ${results.functions ? '✅' : '❌'}`)
  console.log(`  Chat Route: ⚠️  Manual test required`)
  
  if (!results.health) {
    console.log('\n⚠️  MCP Server is not accessible. Check:')
    console.log('   - MCP_DRAFT_POOL_SERVER_URL environment variable')
    console.log('   - MCP server is running')
    console.log('   - Network connectivity')
  }
  
  if (!MCP_API_KEY) {
    console.log('\n⚠️  MCP_API_KEY not set. Some endpoints may require authentication.')
  }
}

main().catch(console.error)
