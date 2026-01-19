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
import { CopyIcon, RefreshCcwIcon, RotateCcw, SendIcon, Loader2 } from "lucide-react"
import { PromptInputWrapper, type PromptInputMessage } from "./prompt-input-wrapper"
import { PokeMnkyAssistant, PokeMnkyPremium } from "@/components/ui/poke-mnky-avatar"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  /** Footer action buttons (upload, mic, volume, etc.) */
  footerActions?: React.ReactNode
  /** Uploaded files display */
  uploadedFilesDisplay?: React.ReactNode
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
  footerActions,
  uploadedFilesDisplay,
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

  // CRITICAL FIX: Intercept fetch calls and rewrite /api/chat to the correct endpoint
  // This fixes the @ai-sdk/react v3.0.41 bug where useChat ignores the api prop and defaults to /api/chat
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const originalFetch = window.fetch
    window.fetch = async function(...args) {
      const url = args[0]
      
      // If useChat is calling /api/chat (default), rewrite it to our actual endpoint
      if (typeof url === 'string' && url === '/api/chat') {
        console.warn("[BaseChatInterface] ⚠️ useChat is calling /api/chat (default), rewriting to:", stableApiEndpoint)
        args[0] = stableApiEndpoint
      }
      
      // Debug logging for all API calls
      if (typeof url === 'string' && (url.includes('/api/') || url.includes('api'))) {
        console.log("[BaseChatInterface] 🔍 FETCH INTERCEPTOR: URL being called:", url)
        if (url === '/api/chat') {
          console.log("[BaseChatInterface] 🔍 FETCH INTERCEPTOR: Rewriting to:", stableApiEndpoint)
        }
      }
      
      return originalFetch.apply(this, args)
    }
    
    return () => {
      window.fetch = originalFetch
    }
  }, [stableApiEndpoint])

  // IMPORTANT: Pass api prop directly - this is the correct way per Vercel AI SDK docs
  const { messages, sendMessage, status, regenerate, error, setMessages } = useChat(useChatOptions)
  
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
  const inputRef = useRef<{ focus: () => void } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previousStatusRef = useRef(status)

  // Keep ref in sync with prop
  useEffect(() => {
    onSendMessageReadyRef.current = onSendMessageReady
  }, [onSendMessageReady])

  // Focus input when status changes from submitted/streaming back to idle (backup focus)
  useEffect(() => {
    // If we were loading and now we're not, focus the input as backup
    // Primary focus happens immediately after send, this is just a safety net
    if ((previousStatusRef.current === "submitted" || previousStatusRef.current === "streaming") && 
        status === "idle" && 
        inputRef.current &&
        document.activeElement !== inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
    previousStatusRef.current = status
  }, [status])

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
    // Focus input immediately - textarea is no longer disabled so this will work
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [sendMessage])

  // Handle copying text to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Optional: Show toast notification (if you have a toast system)
      console.log("[BaseChatInterface] Copied to clipboard")
    } catch (error) {
      console.error("[BaseChatInterface] Failed to copy to clipboard:", error)
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        textArea.remove()
        console.log("[BaseChatInterface] Copied to clipboard (fallback)")
      } catch (fallbackError) {
        console.error("[BaseChatInterface] Fallback copy failed:", fallbackError)
      }
    }
  }, [])

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

  // Update inputRef to use textareaRef
  useEffect(() => {
    inputRef.current = {
      focus: () => {
        textareaRef.current?.focus()
      }
    }
  }, [])

  const handleSubmit = (message?: { text: string }) => {
    const messageText = message?.text || input.trim()
    if (!messageText || isLoading) return
    sendMessage({ text: messageText })
    setInput("")
    // Reset textarea height and focus immediately
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.focus()
      }
      inputRef.current?.focus()
    })
  }

  const CharacterAvatar = characterPalette === "gold-black" ? PokeMnkyPremium : PokeMnkyAssistant
  const conversationRef = useRef<HTMLDivElement>(null)

  // Force hide scrollbar on conversation area
  useEffect(() => {
    const hideScrollbar = () => {
      if (conversationRef.current) {
        const element = conversationRef.current
        // Find the actual scrollable element (might be inside StickToBottom)
        const scrollableElement = element.querySelector('[role="log"]') || element
        
        if (scrollableElement instanceof HTMLElement) {
          scrollableElement.style.setProperty('-ms-overflow-style', 'none', 'important')
          scrollableElement.style.setProperty('scrollbar-width', 'none', 'important')
          
          // Inject webkit scrollbar hiding
          const styleId = 'hide-conversation-scrollbar-style'
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style')
            style.id = styleId
            style.textContent = `
              [role="log"]::-webkit-scrollbar,
              .scrollbar-hide::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                background: transparent !important;
              }
            `
            document.head.appendChild(style)
          }
        }
      }
    }
    
    hideScrollbar()
    // Re-run after a short delay to catch dynamically rendered elements
    const timeout = setTimeout(hideScrollbar, 100)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Assistant Avatar Background - Prominent watermark (gold-black palette) */}
      <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <PokeMnkyPremium size={700} className="text-muted-foreground drop-shadow-2xl" />
        </div>
      </div>
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col h-full">
      {/* Header */}
      {(title || description || showCharacter || messages.length > 0) && (
        <BlurFade direction="down" delay={0}>
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-card flex-shrink-0">
            {showCharacter && (
              <PokeMnkyPremium size={Math.max(characterSize || 48, 48)} className="shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-lg font-semibold truncate">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground truncate">{description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setMessages([])
                setInput("")
              }}
              disabled={messages.length === 0}
              className="h-8 w-8 shrink-0"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </BlurFade>
      )}

      {/* Conversation Area */}
      <div ref={conversationRef} className="flex-1 min-h-0 overflow-hidden">
        <Conversation 
          className={cn(
            "h-full",
            // Mobile optimization
            "overflow-y-auto smooth-scroll",
            // PWA safe scrolling
            "overscroll-contain",
            // Hide scrollbar but keep scrolling functional
            "scrollbar-hide"
          )}
          style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          } as React.CSSProperties}
        >
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
            messages.map((message) => {
              // Check if any tools were used in this message
              const toolCalls = message.parts?.filter((part) => part.type === "tool-call") || []
              const sources = message.parts?.filter((part) => part.type === "source-url") || []
              const hasTools = toolCalls.length > 0
              const hasSources = sources.length > 0
              
              return (
              <Fragment key={message.id}>
                {/* Tool Usage Badge - Show if tools were used */}
                {message.role === "assistant" && hasTools && (
                  <div className="mb-2 px-4">
                    <Badge 
                      variant="secondary" 
                      className="gap-1.5 text-xs bg-primary/10 text-primary border-primary/20"
                    >
                      <Sparkles className="h-3 w-3" />
                      Used {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''}: {toolCalls.map((tc: any) => tc.toolName).join(', ')}
                    </Badge>
                  </div>
                )}
                
                {/* Sources (if any) */}
                {message.role === "assistant" && hasSources && (
                  <Sources>
                    <SourcesTrigger
                      count={sources.length}
                    />
                    <SourcesContent>
                      {sources.map((part, i) => (
                        <Source 
                          key={`${message.id}-source-${i}`}
                          href={part.url} 
                          title={part.title || part.url}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <BookIcon className="h-4 w-4 shrink-0" />
                            <span className="font-medium flex-1">{part.title || part.url}</span>
                            {part.tool && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {part.tool}
                              </Badge>
                            )}
                          </div>
                        </Source>
                      ))}
                    </SourcesContent>
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
              )
            })
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
      </div>

      {/* Quick Actions */}
      {quickActions && quickActions.length > 0 && (
        <div className="border-t px-4 pt-3 pb-2 bg-card/20 backdrop-blur-sm flex-shrink-0">
          <QuickActions
            actions={quickActions}
            onAction={(prompt) => {
              sendMessage({ text: prompt })
              // Focus input immediately after quick action
              requestAnimationFrame(() => {
                inputRef.current?.focus()
              })
            }}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Footer - Input Area with Actions */}
      <div className="border-t bg-card/20 backdrop-blur-sm flex-shrink-0">
        {/* Uploaded files display */}
        {uploadedFilesDisplay && (
          <div className="px-4 pt-2 pb-1">
            {uploadedFilesDisplay}
          </div>
        )}
        {/* Input and actions in single line */}
        <div className="px-4 pb-3 pt-2 flex items-end gap-2">
          {/* Action buttons on left */}
          {footerActions && (
            <div className="flex items-center gap-1 shrink-0">
              {footerActions}
            </div>
          )}
          {/* Input field */}
          <div className="flex-1 relative min-w-0">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                // Auto-resize
                const textarea = e.target
                textarea.style.height = "auto"
                textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
              }}
              onKeyDown={(e) => {
                // Submit on Enter (but not Shift+Enter)
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Ask me anything..."
              disabled={false}
              rows={1}
              className={cn(
                "resize-none min-h-[44px] max-h-[200px] pr-12",
                "text-base",
                "touch-manipulation",
                "overflow-y-auto",
                "hide-textarea-scrollbar"
              )}
            />
            {/* Send button */}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              size="icon"
              className={cn(
                "absolute right-2 bottom-2 h-10 w-10 min-h-[44px] min-w-[44px] shrink-0",
                "touch-manipulation active:scale-95"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
        {/* Helper text */}
        <div className="px-5 pb-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
      </div>
    </div>
  )
}
