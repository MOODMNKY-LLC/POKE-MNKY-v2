#!/usr/bin/env tsx
/**
 * Comprehensive Test: Both MCP Servers in Tandem
 * 
 * Tests:
 * 1. Supabase Local MCP - Database queries and schema inspection
 * 2. Poke-MNKY Draft Pool MCP - Draft pool operations
 * 3. Combined workflows using both servers together
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface TestResult {
  test: string
  status: 'pass' | 'fail' | 'skip'
  message: string
  data?: any
}

const results: TestResult[] = []

async function testSupabaseLocalMCP() {
  console.log('\n🔵 Testing Supabase Local MCP...\n')
  
  try {
    // Test 1: List tables
    console.log('Test 1: Listing tables via Supabase Local...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10)
    
    if (tablesError) {
      // Try direct query instead
      const { data: directTables } = await supabase.rpc('get_tables', {})
      results.push({
        test: 'Supabase Local - List Tables',
        status: directTables ? 'pass' : 'fail',
        message: directTables ? 'Tables listed successfully' : `Error: ${tablesError.message}`,
        data: directTables || tables
      })
    } else {
      results.push({
        test: 'Supabase Local - List Tables',
        status: 'pass',
        message: `Found ${tables?.length || 0} tables`,
        data: tables
      })
    }
    
    // Test 2: Query draft_pool table
    console.log('Test 2: Querying draft_pool table...')
    const { data: draftPool, error: draftError } = await supabase
      .from('draft_pool')
      .select('pokemon_name, point_value, is_available')
      .eq('is_available', true)
      .limit(5)
    
    results.push({
      test: 'Supabase Local - Query draft_pool',
      status: draftError ? 'fail' : 'pass',
      message: draftError ? `Error: ${draftError.message}` : `Found ${draftPool?.length || 0} Pokemon`,
      data: draftPool
    })
    
    // Test 3: Check schema
    console.log('Test 3: Checking draft_pool schema...')
    const { data: schema, error: schemaError } = await supabase
      .from('draft_pool')
      .select('*')
      .limit(0)
    
    results.push({
      test: 'Supabase Local - Schema Inspection',
      status: schemaError ? 'fail' : 'pass',
      message: schemaError ? `Error: ${schemaError.message}` : 'Schema accessible',
    })
    
  } catch (error: any) {
    results.push({
      test: 'Supabase Local MCP',
      status: 'fail',
      message: `Exception: ${error.message}`,
    })
  }
}

async function testDraftPoolMCP() {
  console.log('\n🟢 Testing Poke-MNKY Draft Pool MCP...\n')
  
  const MCP_SERVER_URL = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
  
  try {
    // Test 1: Get available Pokemon
    console.log('Test 1: Getting available Pokemon with 20 points...')
    const response1 = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_available_pokemon',
          arguments: {
            point_range: [20, 20],
            limit: 5
          }
        }
      })
    })
    
    const result1 = await response1.json()
    results.push({
      test: 'Draft Pool MCP - Get Available Pokemon',
      status: result1.error ? 'fail' : 'pass',
      message: result1.error ? `Error: ${result1.error.message}` : 'Pokemon retrieved successfully',
      data: result1.result
    })
    
    // Test 2: Get draft status
    console.log('Test 2: Getting draft status...')
    const response2 = await fetch(MCP_SERVER_URL, {
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
          name: 'get_draft_status'
        }
      })
    })
    
    const result2 = await response2.json()
    results.push({
      test: 'Draft Pool MCP - Get Draft Status',
      status: result2.error ? 'fail' : 'pass',
      message: result2.error ? `Error: ${result2.error.message}` : 'Draft status retrieved',
      data: result2.result
    })
    
  } catch (error: any) {
    results.push({
      test: 'Draft Pool MCP',
      status: 'fail',
      message: `Exception: ${error.message}`,
    })
  }
}

async function testCombinedWorkflow() {
  console.log('\n🟣 Testing Combined Workflow (Both MCPs)...\n')
  
  try {
    // Workflow: Use Supabase Local to query draft_pool, then use Draft Pool MCP to analyze
    console.log('Combined Test: Query draft_pool via Supabase, then analyze via Draft Pool MCP...')
    
    // Step 1: Get Pokemon from Supabase Local
    const { data: pokemon } = await supabase
      .from('draft_pool')
      .select('pokemon_name, point_value')
      .eq('is_available', true)
      .eq('point_value', 20)
      .limit(1)
      .single()
    
    if (pokemon) {
      console.log(`Found Pokemon: ${pokemon.pokemon_name} (${pokemon.point_value} points)`)
      
      // Step 2: Use Draft Pool MCP to get more details
      const MCP_SERVER_URL = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
      const response = await fetch(MCP_SERVER_URL, {
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
            name: 'get_available_pokemon',
            arguments: {
              point_range: [pokemon.point_value, pokemon.point_value],
              limit: 10
            }
          }
        })
      })
      
      const result = await response.json()
      results.push({
        test: 'Combined Workflow - Supabase + Draft Pool MCP',
        status: result.error ? 'fail' : 'pass',
        message: result.error ? `Error: ${result.error.message}` : 'Successfully combined both MCPs',
        data: { supabase_result: pokemon, mcp_result: result.result }
      })
    } else {
      results.push({
        test: 'Combined Workflow',
        status: 'skip',
        message: 'No Pokemon found with 20 points to test',
      })
    }
    
  } catch (error: any) {
    results.push({
      test: 'Combined Workflow',
      status: 'fail',
      message: `Exception: ${error.message}`,
    })
  }
}

async function runTests() {
  console.log('='.repeat(70))
  console.log('🧪 Comprehensive MCP Test Suite')
  console.log('Testing: Supabase Local MCP + Poke-MNKY Draft Pool MCP')
  console.log('='.repeat(70))
  
  await testSupabaseLocalMCP()
  await testDraftPoolMCP()
  await testCombinedWorkflow()
  
  // Print results
  console.log('\n' + '='.repeat(70))
  console.log('📊 Test Results Summary')
  console.log('='.repeat(70))
  
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length
  
  console.log(`\n✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  
  console.log('\n📋 Detailed Results:')
  results.forEach((result, i) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️'
    console.log(`\n${i + 1}. ${icon} ${result.test}`)
    console.log(`   Status: ${result.status.toUpperCase()}`)
    console.log(`   Message: ${result.message}`)
    if (result.data && typeof result.data === 'object') {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`)
    }
  })
  
  console.log('\n' + '='.repeat(70))
  
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(console.error)
