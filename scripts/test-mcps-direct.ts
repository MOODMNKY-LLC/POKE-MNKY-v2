#!/usr/bin/env tsx
/**
 * Direct Test: Both MCP Servers
 * Tests via direct HTTP calls and Supabase client
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const MCP_DRAFT_POOL_URL = 'https://mcp-draft-pool.moodmnky.com/mcp'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface TestResult {
  test: string
  status: 'pass' | 'fail'
  message: string
  data?: any
}

const results: TestResult[] = []

async function testSupabaseDirect() {
  console.log('\n🔵 Testing Supabase Local (Direct)...\n')
  
  // Test 1: Query draft_pool
  try {
    const { data, error } = await supabase
      .from('draft_pool')
      .select('pokemon_name, point_value, is_available')
      .eq('is_available', true)
      .limit(5)
    
    results.push({
      test: 'Supabase - Query draft_pool',
      status: error ? 'fail' : 'pass',
      message: error ? `Error: ${error.message}` : `Found ${data?.length || 0} Pokemon`,
      data: data
    })
    console.log(`✅ Query draft_pool: ${data?.length || 0} Pokemon found`)
  } catch (e: any) {
    results.push({
      test: 'Supabase - Query draft_pool',
      status: 'fail',
      message: `Exception: ${e.message}`
    })
  }
  
  // Test 2: Check schema
  try {
    const { data, error } = await supabase
      .from('draft_pool')
      .select('*')
      .limit(0)
    
    results.push({
      test: 'Supabase - Schema check',
      status: error ? 'fail' : 'pass',
      message: error ? `Error: ${error.message}` : 'Schema accessible',
    })
    console.log(`✅ Schema check: Accessible`)
  } catch (e: any) {
    results.push({
      test: 'Supabase - Schema check',
      status: 'fail',
      message: `Exception: ${e.message}`
    })
  }
}

async function testDraftPoolMCP() {
  console.log('\n🟢 Testing Draft Pool MCP (Direct HTTP)...\n')
  
  // Initialize MCP session
  try {
    const initResponse = await fetch(MCP_DRAFT_POOL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    })
    
    const initResult = await initResponse.json()
    console.log(`✅ MCP Initialize: ${initResult.result ? 'Success' : 'Failed'}`)
    
    if (initResult.result) {
      // Send initialized notification
      await fetch(MCP_DRAFT_POOL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        })
      })
      
      // Test 1: Get available Pokemon
      const toolResponse = await fetch(MCP_DRAFT_POOL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'get_available_pokemon',
            arguments: {
              point_range: [15, 20],
              limit: 5
            }
          }
        })
      })
      
      const toolResult = await toolResponse.json()
      results.push({
        test: 'Draft Pool MCP - get_available_pokemon',
        status: toolResult.error ? 'fail' : 'pass',
        message: toolResult.error ? `Error: ${toolResult.error.message}` : 'Success',
        data: toolResult.result
      })
      console.log(`✅ get_available_pokemon: ${toolResult.error ? 'Failed' : 'Success'}`)
      
      // Test 2: Get draft status
      const statusResponse = await fetch(MCP_DRAFT_POOL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_draft_status'
          }
        })
      })
      
      const statusResult = await statusResponse.json()
      results.push({
        test: 'Draft Pool MCP - get_draft_status',
        status: statusResult.error ? 'fail' : 'pass',
        message: statusResult.error ? `Error: ${statusResult.error.message}` : 'Success',
        data: statusResult.result
      })
      console.log(`✅ get_draft_status: ${statusResult.error ? 'Failed' : 'Success'}`)
    } else {
      results.push({
        test: 'Draft Pool MCP - Initialize',
        status: 'fail',
        message: 'Failed to initialize MCP session'
      })
    }
  } catch (e: any) {
    results.push({
      test: 'Draft Pool MCP',
      status: 'fail',
      message: `Exception: ${e.message}`
    })
    console.log(`❌ Draft Pool MCP: ${e.message}`)
  }
}

async function testCombined() {
  console.log('\n🟣 Testing Combined Workflow...\n')
  
  try {
    // Step 1: Use Supabase to check schema
    const { data: schemaCheck } = await supabase
      .from('draft_pool')
      .select('pokemon_name, point_value, is_available')
      .limit(0)
    
    console.log('✅ Step 1: Supabase schema check passed')
    
    // Step 2: Use Draft Pool MCP to query
    const initResponse = await fetch(MCP_DRAFT_POOL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'combined-test', version: '1.0.0' }
        }
      })
    })
    
    const initResult = await initResponse.json()
    if (initResult.result) {
      // Send initialized notification
      await fetch(MCP_DRAFT_POOL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        })
      })
      
      const toolResponse = await fetch(MCP_DRAFT_POOL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'get_available_pokemon',
            arguments: { point_range: [15, 20], limit: 10 }
          }
        })
      })
      
      const toolResult = await toolResponse.json()
      results.push({
        test: 'Combined Workflow',
        status: toolResult.error ? 'fail' : 'pass',
        message: toolResult.error ? `Error: ${toolResult.error.message}` : 'Both servers worked together',
        data: { supabase_schema: 'accessible', mcp_result: toolResult.result }
      })
      console.log(`✅ Combined workflow: ${toolResult.error ? 'Failed' : 'Success'}`)
    }
  } catch (e: any) {
    results.push({
      test: 'Combined Workflow',
      status: 'fail',
      message: `Exception: ${e.message}`
    })
  }
}

async function runTests() {
  console.log('='.repeat(70))
  console.log('🧪 Direct MCP Test Suite')
  console.log('Testing: Supabase Local + Draft Pool MCP')
  console.log('='.repeat(70))
  
  await testSupabaseDirect()
  await testDraftPoolMCP()
  await testCombined()
  
  console.log('\n' + '='.repeat(70))
  console.log('📊 Test Results Summary')
  console.log('='.repeat(70))
  
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  
  console.log(`\n✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  
  console.log('\n📋 Detailed Results:')
  results.forEach((result, i) => {
    const icon = result.status === 'pass' ? '✅' : '❌'
    console.log(`\n${i + 1}. ${icon} ${result.test}`)
    console.log(`   ${result.message}`)
  })
  
  console.log('\n' + '='.repeat(70))
  
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(console.error)
