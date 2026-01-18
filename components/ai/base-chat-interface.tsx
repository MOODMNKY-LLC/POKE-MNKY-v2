"use client"

/**
 * Base Chat Interface Component
 * 
 * A comprehensive AI chat interface built on AI Elements with:
 * - POKE MNKY character integration
 * - Tool calling display
 * - Streaming support
 * - Markdown rendering
 * - Code blocks
 * - Reasoning display
 * - MagicUI enhancements
 * 
 * This is the foundation for all agent-specific chat interfaces.
 */

import { useState, Fragment, useEffect, useCallback, useRef, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { CopyIcon, RefreshCcwIcon } from "lucide-react"
import { PromptInputWrapper, type PromptInputMessage } from "./prompt-input-wrapper"
import { PokeMnkyAssistant, PokeMnkyPremium } from "@/components/ui/poke-mnky-avatar"
import { BlurFade } from "@/components/ui/blur-fade"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message"
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import { Sources, SourcesContent, Source, SourcesTrigger } from "@/components/ai-elements/sources"
import { CodeBlock } from "@/components/ai-elements/code-block"
import { Loader } from "@/components/ai-elements/loader"
import { QuickActions } from "@/components/ai/quick-actions"
import { cn } from "@/lib/utils"
import type { UIMessage, ToolUIPart } from "ai"

export interface BaseChatInterfaceProps {
  /** API endpoint for chat */
  apiEndpoint: string
  /** Title displayed in header */
  title?: string
  /** Description/subtitle */
  description?: string
  /** Character palette: "red-blue" for user-facing, "gold-black" for premium/admin */
  characterPalette?: "red-blue" | "gold-black"
  /** Show character in header */
  showCharacter?: boolean
  /** Character size */
  characterSize?: number
  /** Additional body parameters for API calls */
  body?: Record<string, any>
  /** Custom empty state */
  emptyStateTitle?: string
  emptyStateDescription?: string
  /** Custom className */
  className?: string
  /** Quick actions to display above input */
  quickActions?: Array<{ label: string; prompt: string; icon?: React.ReactNode }>
  /** Callback ref to expose sendMessage function */
  onSendMessageReady?: (sendMessage: (message: { text: string }) => void) => void
}

export function BaseChatInterface({
  apiEndpoint,
  title = "AI Assistant",
  description,
  characterPalette = "red-blue",
  showCharacter = true,
  characterSize = 32,
  body,
  emptyStateTitle = "Start a conversation",
  emptyStateDescription = "Ask me anything!",
  className,
  quickActions,
  onSendMessageReady,
}: BaseChatInterfaceProps) {
  // Ensure apiEndpoint is always a valid string - use useMemo to ensure stability
  const resolvedEndpoint = useMemo(() => {
    const endpoint = apiEndpoint || "/api/ai/assistant"
    console.log("[BaseChatInterface] Resolving endpoint:", { apiEndpoint, resolved: endpoint })
    return endpoint
  }, [apiEndpoint])
  
  // Debug: Log the API endpoint being used
  useEffect(() => {
    console.log("[BaseChatInterface] Using API endpoint:", resolvedEndpoint)
    console.log("[BaseChatInterface] apiEndpoint prop:", apiEndpoint)
    console.log("[BaseChatInterface] resolvedEndpoint type:", typeof resolvedEndpoint)
  }, [resolvedEndpoint, apiEndpoint])

  // CRITICAL FIX: Ensure api is passed as a stable string literal
  // useChat might be caching the endpoint, so we need to ensure it's always the correct value
  const stableApiEndpoint = useMemo(() => {
    const endpoint = String(resolvedEndpoint).trim()
    if (!endpoint.startsWith('/')) {
      console.warn("[BaseChatInterface] Endpoint should start with /:", endpoint)
      return '/api/ai/assistant'
    }
    return endpoint
  }, [resolvedEndpoint])

  // Callbacks for useChat - memoized to prevent unnecessary re-renders
  // NOTE: These depend on stableApiEndpoint, so they're defined after it
  const handleError = useCallback((error: any) => {
    console.error("[BaseChatInterface] Chat error:", error)
    
    // Extract error message - handle both Error objects and HTML responses
    let errorMessage = error?.message || String(error)
    
    // Check if error message is HTML (404 page)
    if (typeof errorMessage === 'string' && errorMessage.includes('<!DOCTYPE html>')) {
      console.error("[BaseChatInterface] ERROR: Received HTML 404 page instead of streaming response!")
      console.error("[BaseChatInterface] This indicates useChat is calling a non-existent endpoint")
      console.error("[BaseChatInterface] Expected endpoint:", stableApiEndpoint, "(should return streaming data stream)")
      console.error("[BaseChatInterface] The endpoint likely doesn't exist or useChat is using wrong URL")
      console.error("[BaseChatInterface] Check network tab to see actual URL being called")
      errorMessage = "API endpoint returned 404. Check console for details."
    }
    
    console.error("[BaseChatInterface] Error details:", {
      message: errorMessage,
      stack: error?.stack,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
    })
  }, [stableApiEndpoint])

  const handleResponse = useCallback((response: Response) => {
    const actualUrl = response.url
    const expectedUrl = typeof window !== 'undefined' ? `${window.location.origin}${stableApiEndpoint}` : stableApiEndpoint
    
    console.log("[BaseChatInterface] API response received:", {
      url: actualUrl,
      expectedUrl,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      matchesExpected: actualUrl === expectedUrl,
    })
    
    if (!response.ok) {
      console.error("[BaseChatInterface] API error:", response.status, response.statusText)
      console.error("[BaseChatInterface] Expected URL:", expectedUrl)
      console.error("[BaseChatInterface] Actual URL:", actualUrl)
      
      const actualEndpoint = typeof window !== 'undefined' 
        ? actualUrl.replace(window.location.origin, '')
        : actualUrl
      
      if (!actualUrl.includes(stableApiEndpoint)) {
        console.error("[BaseChatInterface] ⚠️ CRITICAL: useChat is calling wrong endpoint!")
        console.error("[BaseChatInterface] Expected:", stableApiEndpoint)
        console.error("[BaseChatInterface] Actual:", actualEndpoint)
      }
    } else {
      console.log("[BaseChatInterface] API response OK:", actualUrl)
    }
  }, [stableApiEndpoint])

  // Memoize the useChat config to ensure stability
  const useChatOptions = useMemo(() => {
    const config: {
      api: string
      body?: Record<string, any>
      onError: (error: any) => void
      onResponse: (response: Response) => void
    } = {
      api: stableApiEndpoint, // Use memoized stableApiEndpoint directly
      onError: handleError,
      onResponse: handleResponse,
    }
    
    if (body) {
      config.body = body
    }
    
    return config
  }, [stableApiEndpoint, body, handleError, handleResponse])

  // IMPORTANT: Pass api prop directly - this is the correct way per Vercel AI SDK docs
  const { messages, sendMessage, status, regenerate, error } = useChat(useChatOptions)
  
  // Debug: Log useChat configuration and initialization
  // FIXED: Moved console.log statements into useEffect to prevent console spam on every render
  useEffect(() => {
    console.log("[BaseChatInterface] Calling useChat with api:", stableApiEndpoint, "Type:", typeof stableApiEndpoint, "Length:", stableApiEndpoint.length)
    console.log("[BaseChatInterface] useChat options:", {
      api: useChatOptions.api,
      hasBody: !!useChatOptions.body,
      hasOnError: !!useChatOptions.onError,
      hasOnResponse: !!useChatOptions.onResponse,
    })
    console.log("[BaseChatInterface] useChat hook initialized")
    console.log("[BaseChatInterface] Expected endpoint:", stableApiEndpoint)
    // The actual endpoint used will be logged in handleResponse
  }, [stableApiEndpoint, useChatOptions])

  const [input, setInput] = useState("")
  const isLoading = status === "streaming" || status === "submitted"
  const onSendMessageReadyRef = useRef(onSendMessageReady)

  // Keep ref in sync with prop
  useEffect(() => {
    onSendMessageReadyRef.current = onSendMessageReady
  }, [onSendMessageReady])

  // Expose sendMessage to parent component (for voice input, etc.)
  // Use useCallback to create a stable reference
  const sendMessageWrapper = useCallback((message: { text: string }) => {
    // Guard against undefined sendMessage
    if (!sendMessage) {
      console.warn("[BaseChatInterface] sendMessage is not available yet")
      return
    }
    sendMessage(message)
    // Clear input after sending
    setInput("")
  }, [sendMessage])

  // Expose sendMessage function to parent - defer to avoid setState during render
  useEffect(() => {
    if (!onSendMessageReadyRef.current || !sendMessage) {
      return
    }
    // Use requestAnimationFrame to defer the state update to avoid setState during render
    requestAnimationFrame(() => {
      if (onSendMessageReadyRef.current && sendMessage) {
        onSendMessageReadyRef.current(sendMessageWrapper)
      }
    })
  }, [sendMessageWrapper, sendMessage])

  const handleSubmit = (message: { text: string }) => {
    if (!message.text.trim() || isLoading) return
    sendMessage({ text: message.text })
    setInput("")
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const CharacterAvatar = characterPalette === "gold-black" ? PokeMnkyPremium : PokeMnkyAssistant

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      {(title || description || showCharacter) && (
        <BlurFade direction="down" delay={0}>
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
            {showCharacter && (
              <CharacterAvatar size={characterSize} className="shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-lg font-semibold truncate">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground truncate">{description}</p>
              )}
            </div>
          </div>
        </BlurFade>
      )}

      {/* Conversation Area */}
      <Conversation className={cn(
        "flex-1",
        // Mobile optimization
        "overflow-y-auto smooth-scroll",
        // PWA safe scrolling
        "overscroll-contain"
      )}>
        <ConversationContent className="pb-safe">
          {error && (
            <div className="p-4 m-4 rounded-md bg-destructive/10 text-destructive text-sm">
              Error: {error.message || "Failed to get response"}
            </div>
          )}
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={emptyStateTitle}
              description={emptyStateDescription}
              icon={
                showCharacter ? (
                  <CharacterAvatar size={64} className="opacity-50" />
                ) : undefined
              }
            />
          ) : (
            messages.map((message) => (
              <Fragment key={message.id}>
                {/* Sources (if any) */}
                {message.role === "assistant" &&
                  message.parts.filter((part) => part.type === "source-url").length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts.filter((part) => part.type === "source-url").length
                        }
                      />
                      {message.parts
                        .filter((part) => part.type === "source-url")
                        .map((part, i) => (
                          <SourcesContent key={`${message.id}-source-${i}`}>
                            <Source href={part.url} title={part.url} />
                          </SourcesContent>
                        ))}
                    </Sources>
                  )}

                {/* Message Content */}
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <BlurFade key={`${message.id}-${i}`} direction="up" delay={i * 0.1}>
                          <Message from={message.role}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                            </MessageContent>
                            {message.role === "assistant" && i === message.parts.length - 1 && (
                              <MessageActions>
                                <MessageAction
                                  onClick={() => regenerate()}
                                  label="Retry"
                                  tooltip="Regenerate response"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </MessageAction>
                                <MessageAction
                                  onClick={() => handleCopy(part.text)}
                                  label="Copy"
                                  tooltip="Copy to clipboard"
                                >
                                  <CopyIcon className="size-3" />
                                </MessageAction>
                              </MessageActions>
                            )}
                          </Message>
                        </BlurFade>
                      )

                    case "reasoning":
                      return (
                        <BlurFade key={`${message.id}-reasoning-${i}`} direction="up" delay={i * 0.1}>
                          <Reasoning>
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        </BlurFade>
                      )

                    case "tool-call":
                      // ToolUIPart from AI SDK
                      const toolPart = part as ToolUIPart
                      // Guard against undefined toolPart or missing properties
                      if (!toolPart || !toolPart.type) {
                        return null
                      }
                      return (
                        <BlurFade key={`${message.id}-tool-${i}`} direction="up" delay={i * 0.1}>
                          <Tool>
                            <ToolHeader
                              title={toolPart.toolName || "Tool Call"}
                              type={toolPart.type}
                              state={toolPart.state || "output-available"}
                            />
                            <ToolContent>
                              {toolPart.input && (
                                <ToolInput input={toolPart.input} />
                              )}
                              {(toolPart.output || toolPart.errorText) && (
                                <ToolOutput 
                                  output={toolPart.output} 
                                  errorText={toolPart.errorText} 
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        </BlurFade>
                      )

                    case "code":
                      return (
                        <BlurFade key={`${message.id}-code-${i}`} direction="up" delay={i * 0.1}>
                          <CodeBlock code={part.code} language={part.language} />
                        </BlurFade>
                      )

                    default:
                      return null
                  }
                })}
              </Fragment>
            ))
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <BlurFade direction="up">
              <Message from="assistant">
                <MessageContent>
                  <Loader />
                </MessageContent>
              </Message>
            </BlurFade>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Quick Actions */}
      {quickActions && quickActions.length > 0 && (
        <div className="border-t px-4 pt-3 pb-2 bg-card">
          <QuickActions
            actions={quickActions}
            onAction={(prompt) => {
              sendMessage({ text: prompt })
            }}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 bg-card">
        <PromptInputWrapper
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
          placeholder="Ask me anything..."
        />
      </div>
    </div>
  )
}
