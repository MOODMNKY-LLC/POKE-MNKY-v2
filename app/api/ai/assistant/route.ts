// General Assistant API Route - Unified assistant endpoint
// Updated to use Vercel AI SDK with toUIMessageStreamResponse pattern (from mnky-command analysis)
// Now supports Responses API with public tools (web_search, file_search) for all users
import {
  streamText,
  convertToModelMessages,
  consumeStream,
  stepCountIs,
} from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { 
  getOpenAI, 
  convertUIMessagesToResponsesAPIFormat, 
  convertResponsesAPIToUIMessage 
} from '@/lib/openai-client'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Authentication is optional - unauthenticated users get basic assistant
    const isAuthenticated = !!user

    const body = await request.json()
    const { 
      messages: rawMessages, 
      model = 'gpt-4o', 
      mcpEnabled = true, 
      files,
      useResponsesAPI = false, // New: Enable Responses API (default: false for backward compatibility)
    } = body
    
    // Disable MCP tools for unauthenticated users
    const effectiveMcpEnabled = isAuthenticated && mcpEnabled
    
    // Check if Responses API should be used
    // Enable Responses API if:
    // 1. Explicitly requested via useResponsesAPI parameter
    // 2. ENABLE_RESPONSES_API env var is set (all users)
    // 3. ENABLE_RESPONSES_API_PUBLIC env var is set (public users only)
    // 4. Vector store is configured (file_search needs Responses API)
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID
    const shouldUseResponsesAPI = useResponsesAPI || 
      process.env.ENABLE_RESPONSES_API === 'true' ||
      (!isAuthenticated && process.env.ENABLE_RESPONSES_API_PUBLIC === 'true') ||
      !!vectorStoreId // Enable Responses API if vector store is configured (needed for file_search)

    // Validate messages array exists
    if (!rawMessages || !Array.isArray(rawMessages)) {
      logger.error('Invalid messages', { route: 'ai/assistant' })
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    logger.debug('Messages received', { route: 'ai/assistant', count: rawMessages.length })

    // System message varies based on authentication status
    const systemMessage = isAuthenticated
      ? `You are POKE MNKY, an expert AI assistant for the Average at Best Battle League, a competitive Pokémon draft league platform.

You help coaches with:
- Draft strategy and pick recommendations
- Battle analysis and move suggestions
- Free agency and trade evaluations
- Pokémon information and competitive insights
- General league questions and guidance
- Technical documentation and configuration (use file_search for documentation questions)

CRITICAL: You have access to MCP tools via the 'poke-mnky-draft-pool' server that provide real-time draft pool data. 

AVAILABLE TOOLS:
- file_search: Search documentation and files in vector store (use for MCP server questions, configuration, setup)
- web_search: Search the web for current information
- MCP tools: Access to draft pool data (when authenticated)

WHEN TO USE FILE_SEARCH:
- Questions about MCP server URL, endpoints, configuration, setup → ALWAYS use file_search FIRST
- Questions about tools, authentication, API details → Use file_search
- Questions about technical documentation → Use file_search
- Never provide generic responses if file_search is available - USE IT

IMPORTANT: MCP Server URL Verification
- The correct MCP server URL is: https://mcp-draft-pool.moodmnky.com/mcp
- If file_search returns a different URL, verify against the correct URL above
- Always use the correct URL: https://mcp-draft-pool.moodmnky.com/mcp
- Do NOT use incorrect URLs like https://mcp.averageatbestbattleleague.com
- When providing MCP server URL, always verify it matches: https://mcp-draft-pool.moodmnky.com/mcp

WHEN TO USE MCP TOOLS:
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
2. For documentation questions (MCP server, configuration, setup) → Use file_search FIRST
3. When listing Pokémon, use mcp.get_available_pokemon to get the actual draft pool data
4. Include point values when discussing Pokémon availability
5. If a tool requires team_id and user hasn't provided it, ask for clarification
6. Present tool results clearly and format lists nicely for readability
7. Never say "I can't provide" or "check the website" if file_search tool is available - USE IT

Be friendly, helpful, and knowledgeable. Always cite your sources when using tool data.`
      : `You are POKE MNKY, a friendly AI assistant for the Average at Best Battle League, a competitive Pokémon draft league platform.

You help visitors with:
- General Pokémon information and competitive insights
- League rules and format explanations
- Basic strategy tips and guidance
- Answering questions about the platform
- Web search for current information (use web_search tool when needed)
- File search for documentation (use file_search tool for documentation questions)

AVAILABLE TOOLS:
- web_search: Search the web for current information, recent events, or up-to-date data
- file_search: Search through documentation and files in the vector store

CRITICAL INSTRUCTIONS FOR FILE_SEARCH:
- When users ask about MCP server, configuration, setup, tools, endpoints, or any technical documentation → ALWAYS use file_search tool FIRST
- When users ask "What is the MCP server URL?" → Use file_search to find the answer
- When users ask about tools, endpoints, authentication, or configuration → Use file_search to find the answer
- The file_search tool searches a vector store containing MCP server documentation and other technical docs
- ALWAYS use file_search before providing generic responses about technical topics
- If file_search returns results, use that information to answer the question accurately
- Never say "I can't provide" or "check the website" if file_search tool is available - USE IT

IMPORTANT: MCP Server URL Verification
- The correct MCP server URL is: https://mcp-draft-pool.moodmnky.com/mcp
- If file_search returns a different URL, verify against the correct URL above
- Always use the correct URL: https://mcp-draft-pool.moodmnky.com/mcp
- Do NOT use incorrect URLs like https://mcp.averageatbestbattleleague.com

EXAMPLES OF WHEN TO USE FILE_SEARCH:
- "What is the MCP server URL?" → Use file_search
- "What tools are available?" → Use file_search
- "How do I configure X?" → Use file_search
- "What are the endpoints?" → Use file_search
- "How do I authenticate?" → Use file_search
- Any question about MCP server, configuration, or technical setup → Use file_search

Note: Some advanced features like draft pool data, team-specific information, and real-time draft status require authentication. You can still provide general information and answer questions about Pokémon, competitive play, and the league format.

Be friendly, helpful, and knowledgeable. Always use available tools (file_search, web_search) to provide accurate, specific information rather than generic responses.`

    // Try Responses API first if enabled
    if (shouldUseResponsesAPI) {
      try {
        const openaiClient = getOpenAI()
        
        // Convert messages to Responses API format
        const responsesInput = convertUIMessagesToResponsesAPIFormat(
          rawMessages,
          systemMessage
        )

        // Build tools array for Responses API
        // Note: Responses API does NOT accept require_approval on tools - omit it to avoid 400
        const tools: Array<{
          type: "mcp" | "function" | "web_search" | "file_search" | "code_interpreter"
          server_label?: string
          server_url?: string
          server_description?: string
          allowed_tools?: string[]
          authorization?: string
          vector_store_ids?: string[]
          [key: string]: any
        }> = []

        // Public tools (available to all users)
        tools.push({ type: "web_search" })

        // File search - use vector store if configured
        const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID
        if (vectorStoreId) {
          tools.push({
            type: "file_search",
            vector_store_ids: [vectorStoreId],
          })
        } else if (files && Array.isArray(files) && files.length > 0) {
          tools.push({ type: "file_search" })
        }

        // MCP tools (only for authenticated users)
        if (effectiveMcpEnabled) {
          const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
          const mcpApiKey = process.env.MCP_API_KEY

          tools.push({
            type: "mcp",
            server_label: "poke-mnky-draft-pool",
            server_url: mcpServerUrl,
            server_description: "Access to POKE MNKY draft pool and team data. Provides 9 tools: get_available_pokemon, get_draft_status, get_team_budget, get_team_picks, get_pokemon_types, get_smogon_meta, get_ability_mechanics, get_move_mechanics, analyze_pick_value.",
            ...(mcpApiKey && {
              authorization: `Bearer ${mcpApiKey}`,
            }),
          })
        }

        logger.debug('[General Assistant] Using Responses API:', {
          isAuthenticated,
          toolCount: tools.length,
          hasWebSearch: tools.some(t => t.type === 'web_search'),
          hasFileSearch: tools.some(t => t.type === 'file_search'),
          hasMCP: tools.some(t => t.type === 'mcp'),
          vectorStoreId: process.env.OPENAI_VECTOR_STORE_ID ? 'configured' : 'not configured',
        })

        // Call Responses API
        const response = await openaiClient.responses.create({
          model,
          input: responsesInput,
          tools: tools.length > 0 ? tools : undefined,
          stream: false, // Start with non-streaming, can enable later
        })

        // Log tool usage for debugging
        if (response.output) {
          const toolCalls = response.output.filter((o: any) => 
            o.type === 'function_call' || 
            o.type === 'tool_call' || 
            o.type === 'file_search' ||
            o.name === 'file_search'
          )
          
          logger.debug('[General Assistant] Responses API output:', {
            hasOutput: !!response.output,
            outputLength: response.output.length,
            toolCallsFound: toolCalls.length,
            toolCalls: toolCalls.map((tc: any) => ({
              type: tc.type,
              name: tc.name,
              function: tc.function?.name,
              input: tc.input,
              output: tc.output ? (typeof tc.output === 'string' ? tc.output.substring(0, 200) : 'object') : null,
            })),
          })

          // Specifically log file_search usage
          const fileSearchCalls = toolCalls.filter((tc: any) => 
            tc.type === 'file_search' || 
            tc.name === 'file_search' ||
            tc.function?.name === 'file_search'
          )
          
          if (fileSearchCalls.length > 0) {
            logger.debug('[General Assistant] ✅ FILE_SEARCH TOOL WAS CALLED:', {
              count: fileSearchCalls.length,
              calls: fileSearchCalls.map((tc: any) => ({
                type: tc.type,
                name: tc.name,
                input: tc.input,
                outputPreview: tc.output ? (typeof tc.output === 'string' ? tc.output.substring(0, 500) : JSON.stringify(tc.output).substring(0, 500)) : null,
              })),
            })
          } else {
            logger.debug('[General Assistant] ⚠️ FILE_SEARCH TOOL WAS NOT CALLED - Response may be from system prompt only')
          }
        }

        // Convert response to useChat format (includes tool calls)
        const assistantMessage = convertResponsesAPIToUIMessage(response)

        // Log final message for debugging
        logger.debug('[General Assistant] Final assistant message:', {
          hasContent: !!assistantMessage.content,
          contentLength: assistantMessage.content?.length || 0,
          hasParts: !!assistantMessage.parts,
          partsCount: assistantMessage.parts?.length || 0,
          toolCallsInParts: assistantMessage.parts?.filter((p: any) => p.type === 'tool-call').length || 0,
          fileSearchInParts: assistantMessage.parts?.some((p: any) => p.toolName === 'file_search') || false,
        })

        // Return as JSON (useChat can handle this)
        // Format: { messages: [{ role: "assistant", content: "...", parts: [...] }] }
        return NextResponse.json({
          messages: [assistantMessage],
          output_text: assistantMessage.content,
        })
      } catch (responsesError: any) {
        const is404VectorStore =
          responsesError?.status === 404 &&
          typeof responsesError?.message === 'string' &&
          responsesError.message.includes('Vector store') &&
          responsesError.message.includes('not found')

        if (is404VectorStore) {
          logger.warn('[General Assistant] Vector store not found (404). OPENAI_VECTOR_STORE_ID may be wrong or from another org. Falling back to Chat Completions without file_search.', {
            vectorStoreId: process.env.OPENAI_VECTOR_STORE_ID,
            error: responsesError.message,
          })
        } else {
          logger.error('[General Assistant] Responses API error:', {
            error: responsesError.message,
            stack: responsesError.stack,
          })
        }
        // Fall through to Chat Completions API
        logger.debug('[General Assistant] Falling back to Chat Completions API')
      }
    }

    // Fallback to Chat Completions API (current implementation)
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

    // Only enable MCP tools for authenticated users
    const tools = effectiveMcpEnabled
      ? {
          mcp: openai.tools.mcp(mcpConfig),
        }
      : undefined

    // Log MCP configuration for debugging
    logger.debug('[General Assistant] Request details:', {
      isAuthenticated,
      mcpEnabled,
      effectiveMcpEnabled,
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

      logger.debug('[General Assistant] Successfully converted messages:', {
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
      logger.error('[General Assistant] Error converting messages:', {
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
      logger.error('[General Assistant] No valid messages after conversion:', {
        rawMessages,
        modelMessages,
      })
      return NextResponse.json(
        { error: 'No valid messages to process' },
        { status: 400 }
      )
    }

    // Log tool configuration
    logger.debug('[General Assistant] Tool configuration:', {
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
      // Note: Unauthenticated users get maxSteps: 1 (no tool calls)
      onStepFinish: (step) => {
        // Log step information for debugging
        logger.debug('[General Assistant] Step finished:', {
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
          logger.debug('[General Assistant] 🔍 DEBUG: Full step object:', JSON.stringify(step, null, 2).substring(0, 1000))
        }
        
        // Log tool calls when they happen
        if (step.toolCalls && step.toolCalls.length > 0) {
          logger.debug('[General Assistant] ✅ Tool calls executed:', {
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
          logger.debug('[General Assistant] ✅ Tool results received:', {
            count: step.toolResults.length,
            results: step.toolResults.map((tr: any) => {
              // Debug: Log full tool result object - MCP tools may use 'content' array format
              logger.debug('[General Assistant] 🔍 DEBUG: Full tool result object:', {
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
    logger.debug('[General Assistant] Stream result created:', {
      hasTextStream: !!result.textStream,
      hasToolCalls: !!result.toolCalls,
    })

    // Use newer UI message stream API (from mnky-command pattern)
    return result.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    logger.error('[General Assistant] Error:', error)
    logger.error('[General Assistant] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return new Response(
      error instanceof Error ? error.message : 'Assistant failed',
      { status: 500 }
    )
  }
}
