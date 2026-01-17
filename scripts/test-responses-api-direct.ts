#!/usr/bin/env tsx
/**
 * Direct test of Responses API with MCP server
 * Tests the actual OpenAI Responses API call to verify MCP integration
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createResponseWithMCP } from '../lib/openai-client'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

// IMPORTANT: OpenAI Responses API requires publicly accessible URL (Cloudflare Tunnel)
const MCP_SERVER_URL = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function testResponsesAPI() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set')
    process.exit(1)
  }

  console.log('🧪 Testing Responses API with MCP Server\n')
  console.log(`MCP Server URL: ${MCP_SERVER_URL}`)
  console.log(`OpenAI API Key: ${OPENAI_API_KEY ? '✅ Set' : '❌ Not Set'}\n`)

  // IMPORTANT: For Responses API, OpenAI's servers need public URL (Cloudflare Tunnel)
  // Network IP (10.3.0.119) only works for local Next.js → MCP server calls
  // OpenAI's servers (remote) cannot reach private network IPs
  if (MCP_SERVER_URL.includes('localhost') || MCP_SERVER_URL.includes('127.0.0.1') || MCP_SERVER_URL.includes('10.3.0.119')) {
    console.warn('⚠️  WARNING: Responses API requires public URL (Cloudflare Tunnel)')
    console.warn(`   Current: ${MCP_SERVER_URL}`)
    console.warn(`   Should be: https://mcp-draft-pool.moodmnky.com/mcp`)
    console.warn('   OpenAI servers cannot reach private network IPs')
  }

  try {
    console.log('📤 Sending request to OpenAI Responses API...\n')

    const response = await createResponseWithMCP({
      model: 'gpt-4.1',
      input: [
        {
          role: 'developer',
          content: [
            {
              type: 'input_text',
              text: 'You are a knowledgeable Pokédex assistant. Use MCP tools to access draft pool data and provide accurate information.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'What Pokemon are available in the draft pool with 20 points?',
            },
          ],
        },
      ],
      tools: [
        {
          type: 'mcp',
          server_label: 'poke-mnky-draft-pool',
          server_url: MCP_SERVER_URL,
          server_description: 'Access to POKE MNKY draft pool and team data',
          require_approval: 'never', // Auto-approve for testing
        },
      ],
    })

    console.log('✅ Response received!\n')
    console.log('Response structure:')
    console.log(JSON.stringify(response, null, 2))

    // Check for MCP tool calls
    if (response.output) {
      const mcpCalls = response.output.filter(
        (item: any) => item.type === 'mcp_tool_call' || item.type === 'mcp_list_tools'
      )
      if (mcpCalls.length > 0) {
        console.log('\n✅ MCP tools were called!')
        console.log(`Found ${mcpCalls.length} MCP-related output items`)
      } else {
        console.log('\n⚠️  No MCP tool calls found in response')
      }
    }

    // Extract answer from Responses API
    // Responses API returns output_text or output array
    const answer = response.output_text || 
      response.output?.[0]?.content?.[0]?.text || 
      'No answer found'
    console.log('\n📝 Answer:')
    console.log(answer.substring(0, 500))
  } catch (error: any) {
    console.error('\n❌ Error calling Responses API:')
    console.error('Message:', error.message)
    console.error('Status:', error.status)
    console.error('Response:', error.response?.data)
    console.error('\nFull error:')
    console.error(error)
    process.exit(1)
  }
}

testResponsesAPI().catch(console.error)
