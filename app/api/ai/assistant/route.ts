// General Assistant API Route - Unified assistant endpoint
// Updated to use Vercel AI SDK with toUIMessageStreamResponse pattern (from mnky-command analysis)
import {
  streamText,
  convertToModelMessages,
  consumeStream,
  stepCountIs,
} from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messages: rawMessages, model = 'gpt-4o', mcpEnabled = true, files } = body

    // Validate messages array exists
    if (!rawMessages || !Array.isArray(rawMessages)) {
      console.error('[General Assistant] Invalid messages:', rawMessages)
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Debug: Log message format for troubleshooting
    console.log('[General Assistant] Raw messages received:', {
      count: rawMessages.length,
      firstMessage: rawMessages[0] ? {
        role: rawMessages[0].role,
        hasParts: !!rawMessages[0].parts,
        hasContent: !!rawMessages[0].content,
        keys: Object.keys(rawMessages[0]),
      } : null,
      allMessages: rawMessages.map((msg: any) => ({
        role: msg.role,
        hasParts: !!msg.parts,
        hasContent: !!msg.content,
      })),
    })

    const systemMessage = `You are POKE MNKY, an expert AI assistant for the Average at Best Battle League, a competitive Pokémon draft league platform.

You help coaches with:
- Draft strategy and pick recommendations
- Battle analysis and move suggestions
- Free agency and trade evaluations
- Pokémon information and competitive insights
- General league questions and guidance

CRITICAL: You have access to MCP tools via the 'poke-mnky-draft-pool' server that provide real-time draft pool data. 

When users ask about:
- Available Pokémon or point values → ALWAYS use mcp.get_available_pokemon tool first
- Draft status or whose turn → Use mcp.get_draft_status tool
- Team budgets or remaining points → Use mcp.get_team_budget tool (requires team_id)
- Team picks or rosters → Use mcp.get_team_picks tool (requires team_id)
- Pokémon types → Use mcp.get_pokemon_types tool
- Competitive meta → Use mcp.get_smogon_meta tool
- Ability/move mechanics → Use mcp.get_ability_mechanics or mcp.get_move_mechanics tools
- Pick value analysis → Use mcp.analyze_pick_value tool

IMPORTANT RULES:
1. ALWAYS use tools to get current, accurate data - never guess or make up information
2. When listing Pokémon, use mcp.get_available_pokemon to get the actual draft pool data
3. Include point values when discussing Pokémon availability
4. If a tool requires team_id and user hasn't provided it, ask for clarification
5. Present tool results clearly and format lists nicely for readability

Be friendly, helpful, and knowledgeable. Always cite your sources when using tool data.`

    // Get MCP server URL and API key from environment
    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
    const mcpApiKey = process.env.MCP_API_KEY

    // Build tools object - conditionally include MCP tools
    // OpenAI SDK's mcp() function supports authorization and headers parameters
    const mcpConfig: any = {
      serverLabel: 'poke-mnky-draft-pool',
      serverUrl: mcpServerUrl,
      serverDescription: 'Access to POKE MNKY draft pool and team data. Provides 9 tools: get_available_pokemon, get_draft_status, get_team_budget, get_team_picks, get_pokemon_types, get_smogon_meta, get_ability_mechanics, get_move_mechanics, analyze_pick_value.',
      requireApproval: 'never',
    }

    // Configure authentication: Use X-API-Key header via headers parameter
    // MCP server accepts both Authorization: Bearer and X-API-Key headers
    // Using X-API-Key avoids conflict with authorization parameter
    if (mcpApiKey) {
      mcpConfig.headers = {
        'X-API-Key': mcpApiKey,
      }
    }

    const tools = mcpEnabled
      ? {
          mcp: openai.tools.mcp(mcpConfig),
        }
      : undefined

    // Log MCP configuration for debugging
    console.log('[General Assistant] MCP configuration:', {
      serverUrl: mcpServerUrl,
      hasApiKey: !!mcpApiKey,
      apiKeyPrefix: mcpApiKey ? mcpApiKey.substring(0, 10) + '...' : 'none',
      configKeys: Object.keys(mcpConfig),
      hasHeaders: !!mcpConfig.headers,
      headerKeys: mcpConfig.headers ? Object.keys(mcpConfig.headers) : [],
      usingXApiKey: !!(mcpConfig.headers && mcpConfig.headers['X-API-Key']),
    })

    // Convert UI messages to model format
    // convertToModelMessages handles UIMessage[] with 'parts' arrays directly
    // It converts them to ModelMessage[] format for the LLM
    // Note: In AI SDK v6, convertToModelMessages may be async in some cases
    let modelMessages
    try {
      // Always await to handle both sync and async cases
      // Awaiting a non-Promise just returns the value
      const conversionResult = convertToModelMessages(rawMessages)
      modelMessages = await Promise.resolve(conversionResult)

      // Validate result is an array
      if (!Array.isArray(modelMessages)) {
        throw new Error(`convertToModelMessages returned non-array: ${typeof modelMessages}`)
      }

      console.log('[General Assistant] Successfully converted messages:', {
        inputCount: rawMessages.length,
        outputCount: modelMessages.length,
        firstOutput: modelMessages[0] ? {
          role: modelMessages[0].role,
          hasContent: !!modelMessages[0].content,
          contentType: typeof modelMessages[0].content,
          isArray: Array.isArray(modelMessages[0].content),
        } : null,
      })
    } catch (conversionError: any) {
      console.error('[General Assistant] Error converting messages:', {
        error: conversionError.message,
        stack: conversionError.stack,
        rawMessages: JSON.stringify(rawMessages, null, 2),
      })
      return NextResponse.json(
        { 
          error: 'Failed to convert messages',
          details: conversionError.message,
        },
        { status: 400 }
      )
    }

    // Ensure we have valid messages
    if (!modelMessages || modelMessages.length === 0) {
      console.error('[General Assistant] No valid messages after conversion:', {
        rawMessages,
        modelMessages,
      })
      return NextResponse.json(
        { error: 'No valid messages to process' },
        { status: 400 }
      )
    }

    // Log tool configuration
    console.log('[General Assistant] Tool configuration:', {
      mcpEnabled,
      hasTools: !!tools,
      toolCount: tools ? Object.keys(tools).length : 0,
      mcpServerUrl,
    })

    // Stream text with tool call limits (from mnky-command pattern)
    // IMPORTANT: toolChoice: 'auto' ensures tools are used when appropriate
    // maxSteps limits tool call loops to prevent infinite recursion
    // Using maxSteps instead of stopWhen for better compatibility with useChat
    const result = await streamText({
      model: openai(model),
      system: systemMessage,
      messages: modelMessages, // Use 'messages' not 'prompt' - convertToModelMessages returns message array
      tools,
      toolChoice: tools ? 'auto' : undefined, // Explicitly enable tool usage when tools are available
      maxSteps: tools ? 5 : 1, // Allow multi-step tool calls when MCP enabled (matches other routes)
      onStepFinish: (step) => {
        // Log step information for debugging
        console.log('[General Assistant] Step finished:', {
          stepNumber: step.stepType,
          hasText: !!step.text,
          textPreview: step.text ? step.text.substring(0, 100) : null,
          hasToolCalls: !!(step.toolCalls && step.toolCalls.length > 0),
          toolCallCount: step.toolCalls?.length || 0,
          hasToolResults: !!(step.toolResults && step.toolResults.length > 0),
          toolResultCount: step.toolResults?.length || 0,
          stepKeys: Object.keys(step),
        })
        
        // Log full step object for debugging (first time only)
        if (step.toolCalls && step.toolCalls.length > 0 && !step.toolResults) {
          console.log('[General Assistant] 🔍 DEBUG: Full step object:', JSON.stringify(step, null, 2).substring(0, 1000))
        }
        
        // Log tool calls when they happen
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log('[General Assistant] ✅ Tool calls executed:', {
            count: step.toolCalls.length,
            tools: step.toolCalls.map((tc: any) => ({
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: tc.args,
            })),
          })
        }
        
        // Log tool results if available
        if (step.toolResults && step.toolResults.length > 0) {
          console.log('[General Assistant] ✅ Tool results received:', {
            count: step.toolResults.length,
            results: step.toolResults.map((tr: any) => {
              // Debug: Log full tool result object - MCP tools may use 'content' array format
              console.log('[General Assistant] 🔍 DEBUG: Full tool result object:', {
                keys: Object.keys(tr),
                toolCallId: tr.toolCallId,
                toolName: tr.toolName,
                hasResult: 'result' in tr,
                result: tr.result,
                resultType: typeof tr.result,
                hasContent: 'content' in tr,
                content: tr.content,
                contentType: typeof tr.content,
                isContentArray: Array.isArray(tr.content),
                hasOutput: 'output' in tr,
                output: tr.output,
                hasError: !!tr.error,
                error: tr.error,
                fullObject: JSON.stringify(tr, null, 2).substring(0, 1000),
              })
              
              // MCP tools return results in nested format:
              // tr.output.output contains the actual result as a JSON string
              // Structure: { output: { output: "{\"pokemon\": [...]}" } }
              let actualResult = tr.result
              if (actualResult === undefined || actualResult === null) {
                // Check for nested output structure (MCP format)
                if (tr.output && typeof tr.output === 'object') {
                  // If output.output exists and is a string, parse it
                  if (tr.output.output && typeof tr.output.output === 'string') {
                    try {
                      actualResult = JSON.parse(tr.output.output)
                    } catch (e) {
                      // If parsing fails, use the string as-is
                      actualResult = tr.output.output
                    }
                  } else if (tr.output.output !== undefined) {
                    // If output.output is already an object, use it directly
                    actualResult = tr.output.output
                  } else {
                    // Fallback to the output object itself
                    actualResult = tr.output
                  }
                } else if (Array.isArray(tr.content) && tr.content.length > 0) {
                  // Try content array format (MCP protocol)
                  const firstContent = tr.content[0]
                  if (firstContent.type === 'text' && firstContent.text) {
                    try {
                      // MCP content is often JSON-encoded string
                      actualResult = JSON.parse(firstContent.text)
                    } catch {
                      // If not JSON, use text directly
                      actualResult = firstContent.text
                    }
                  } else {
                    actualResult = tr.content
                  }
                }
              }
              
              let resultPreview = 'N/A'
              if (actualResult !== undefined && actualResult !== null) {
                if (typeof actualResult === 'string') {
                  resultPreview = actualResult.substring(0, 200)
                } else {
                  try {
                    const jsonStr = JSON.stringify(actualResult)
                    resultPreview = jsonStr.substring(0, 200)
                  } catch (e) {
                    resultPreview = `[Error stringifying: ${e}]`
                  }
                }
              } else if (tr.error) {
                resultPreview = `[Error: ${JSON.stringify(tr.error)}]`
              }
              
              return {
                toolCallId: tr.toolCallId,
                toolName: tr.toolName,
                resultPreview,
                hasResult: actualResult !== undefined && actualResult !== null,
                resultType: typeof actualResult,
                hasError: !!tr.error,
                error: tr.error,
                resultSource: tr.result !== undefined ? 'result' : 
                           (tr.content !== undefined ? 'content' : 
                           (tr.output !== undefined ? 'output' : 'none')),
              }
            }),
          })
        }
      },
    })

    // Log result metadata
    console.log('[General Assistant] Stream result created:', {
      hasTextStream: !!result.textStream,
      hasToolCalls: !!result.toolCalls,
    })

    // Use newer UI message stream API (from mnky-command pattern)
    return result.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    console.error('[General Assistant] Error:', error)
    console.error('[General Assistant] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return new Response(
      error instanceof Error ? error.message : 'Assistant failed',
      { status: 500 }
    )
  }
}
