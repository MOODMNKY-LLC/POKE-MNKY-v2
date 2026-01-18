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

import { useState, Fragment, useEffect } from "react"
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
  const { messages, sendMessage, status, regenerate } = useChat({
    api: apiEndpoint,
    body,
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Expose sendMessage to parent component (for voice input, etc.)
  useEffect(() => {
    if (onSendMessageReady) {
      onSendMessageReady(sendMessage)
    }
  }, [onSendMessageReady, sendMessage])

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
