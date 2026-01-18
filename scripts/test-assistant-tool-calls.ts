#!/usr/bin/env tsx
/**
 * Test Script: Assistant Route Tool Calls
 * 
 * Tests if the assistant route is properly calling MCP tools
 * 
 * Usage: pnpm tsx scripts/test-assistant-tool-calls.ts
 */

const ASSISTANT_URL = process.env.ASSISTANT_URL || 'http://localhost:3000/api/ai/assistant'
const MCP_API_KEY = process.env.MCP_API_KEY

async function testAssistantWithToolQuery() {
  console.log('🧪 Testing Assistant Route Tool Calls\n')
  console.log('Configuration:')
  console.log(`  Assistant URL: ${ASSISTANT_URL}`)
  console.log(`  MCP API Key: ${MCP_API_KEY ? '✅ Set' : '❌ Not set'}\n`)

  if (!MCP_API_KEY) {
    console.error('❌ MCP_API_KEY not set. Please set it in your environment.')
    process.exit(1)
  }

  // Test query that should definitely trigger tool usage
  const testQueries = [
    {
      name: 'Explicit Pokemon List Request',
      query: 'Use the get_available_pokemon tool to show me a list of Pokemon available in the draft pool with their point values.',
    },
    {
      name: 'Natural Language Request',
      query: 'What Pokemon are available in the draft pool? Show me their names and point values.',
    },
    {
      name: 'Point Value Query',
      query: 'Show me Pokemon that cost 20 points in the draft pool.',
    },
  ]

  for (const test of testQueries) {
    console.log(`\n📝 Test: ${test.name}`)
    console.log(`Query: "${test.query}"`)
    console.log('─'.repeat(60))

    try {
      const response = await fetch(ASSISTANT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              parts: [
                {
                  type: 'text',
                  text: test.query,
                },
              ],
            },
          ],
          mcpEnabled: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Request failed: ${response.status} ${response.statusText}`)
        console.error(`Error: ${errorText.substring(0, 500)}`)
        continue
      }

      // Read the stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let toolCallsFound = false
      let toolResultsFound = false

      if (!reader) {
        console.error('❌ No response body')
        continue
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullResponse += chunk

        // Check for tool call events in the stream
        if (chunk.includes('tool-call') || chunk.includes('tool_call')) {
          toolCallsFound = true
        }
        if (chunk.includes('tool-result') || chunk.includes('tool_result')) {
          toolResultsFound = true
        }
      }

      console.log(`✅ Response received (${fullResponse.length} chars)`)
      console.log(`  Tool calls in stream: ${toolCallsFound ? '✅ Yes' : '❌ No'}`)
      console.log(`  Tool results in stream: ${toolResultsFound ? '✅ Yes' : '❌ No'}`)

      // Try to parse and show a preview
      const lines = fullResponse.split('\n').filter(line => line.trim())
      const dataLines = lines
        .filter(line => line.startsWith('0:'))
        .map(line => {
          try {
            return JSON.parse(line.substring(2))
          } catch {
            return null
          }
        })
        .filter(Boolean)

      if (dataLines.length > 0) {
        console.log(`\n  Stream events found: ${dataLines.length}`)
        const toolEvents = dataLines.filter((d: any) => 
          d.type === 'tool-call' || d.type === 'tool-result' || d.type === 'tool_call' || d.type === 'tool_result'
        )
        if (toolEvents.length > 0) {
          console.log(`  ✅ Tool-related events: ${toolEvents.length}`)
          toolEvents.slice(0, 2).forEach((event: any, idx: number) => {
            console.log(`    Event ${idx + 1}:`, {
              type: event.type,
              toolName: event.toolName || event.name,
              hasArgs: !!event.args,
              hasResult: !!event.result,
            })
          })
        } else {
          console.log(`  ⚠️  No tool-related events found in stream`)
        }
      }

    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`)
      console.error(error.stack)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Summary')
  console.log('='.repeat(60))
  console.log('\nCheck the server logs for detailed tool call information.')
  console.log('Look for:')
  console.log('  - "[General Assistant] ✅ Tool calls executed"')
  console.log('  - "[General Assistant] ✅ Tool results received"')
  console.log('  - Tool names like "get_available_pokemon"')
}

testAssistantWithToolQuery().catch(console.error)
