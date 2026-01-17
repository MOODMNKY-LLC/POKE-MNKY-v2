// Test script to validate Agents SDK setup
import { draftAssistantAgent } from '../lib/agents/draft-assistant'
import { freeAgencyAgent } from '../lib/agents/free-agency-agent'
import { battleStrategyAgent } from '../lib/agents/battle-strategy-agent'
import { initializeDraftAssistant, closeDraftAssistant } from '../lib/agents/draft-assistant'

async function testSetup() {
  console.log('🧪 Testing Agents SDK Setup...\n')
  
  const results: Array<{ test: string; status: string; details?: string }> = []
  
  // Test 1: Agent Imports
  try {
    if (draftAssistantAgent && freeAgencyAgent && battleStrategyAgent) {
      results.push({ test: 'Agent Imports', status: '✅ PASS', details: 'All agents imported successfully' })
    } else {
      results.push({ test: 'Agent Imports', status: '❌ FAIL', details: 'Some agents failed to import' })
    }
  } catch (error) {
    results.push({ test: 'Agent Imports', status: '❌ FAIL', details: String(error) })
  }
  
  // Test 2: Agent Names
  try {
    const names = {
      draft: draftAssistantAgent.name,
      freeAgency: freeAgencyAgent.name,
      battle: battleStrategyAgent.name,
    }
    results.push({
      test: 'Agent Names',
      status: '✅ PASS',
      details: JSON.stringify(names),
    })
  } catch (error) {
    results.push({ test: 'Agent Names', status: '❌ FAIL', details: String(error) })
  }
  
  // Test 3: MCP Servers Configured
  try {
    const mcpCounts = {
      draft: draftAssistantAgent.mcpServers?.length || 0,
      freeAgency: freeAgencyAgent.mcpServers?.length || 0,
      battle: battleStrategyAgent.mcpServers?.length || 0,
    }
    const allHaveMCP = Object.values(mcpCounts).every(count => count > 0)
    results.push({
      test: 'MCP Servers',
      status: allHaveMCP ? '✅ PASS' : '❌ FAIL',
      details: JSON.stringify(mcpCounts),
    })
  } catch (error) {
    results.push({ test: 'MCP Servers', status: '❌ FAIL', details: String(error) })
  }
  
  // Test 4: MCP Connection (optional - requires server running)
  try {
    console.log('Attempting MCP connection (this may fail if server is not running)...')
    await initializeDraftAssistant()
    results.push({ test: 'MCP Connection', status: '✅ PASS', details: 'Successfully connected to MCP server' })
    await closeDraftAssistant()
  } catch (error) {
    results.push({
      test: 'MCP Connection',
      status: '⚠️  SKIP',
      details: `Server may not be running: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
  
  // Print Results
  console.log('\n📊 Test Results:\n')
  console.table(results)
  
  const passed = results.filter(r => r.status === '✅ PASS').length
  const failed = results.filter(r => r.status === '❌ FAIL').length
  const skipped = results.filter(r => r.status === '⚠️  SKIP').length
  
  console.log(`\n✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⚠️  Skipped: ${skipped}`)
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed! Check the details above.')
    process.exit(1)
  } else {
    console.log('\n✅ All critical tests passed!')
    if (skipped > 0) {
      console.log('⚠️  Some tests were skipped (MCP server may not be running)')
    }
  }
}

testSetup().catch(console.error)
