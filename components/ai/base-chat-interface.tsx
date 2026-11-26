"use client"

/**
 * Shared chat thread for Ask POKE MNKY.
 * Page-specific routes are set on the transport so a send never falls through to /api/chat.
 */

import { useState, Fragment, useEffect, useCallback, useRef, useMemo, type FormEvent } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useLeagueChatAvailable } from "./openai-availability"
import { formatLeagueChatComposerError } from "@/lib/ai/league-chat-dock"
import { Book as BookIcon, CopyIcon, RefreshCcwIcon, RotateCcw, ArrowUpIcon, Loader2, Sparkles } from "lucide-react"
import type { BundledLanguage } from "shiki"
import { PokeMnkyAssistant, PokeMnkyPremium } from "@/components/ui/poke-mnky-avatar"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { MessageScrollerItem } from "@/components/ui/message-scroller"
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
  body?: Record<string, unknown>
  /** Custom empty state */
  emptyStateTitle?: string
  emptyStateDescription?: string
  /** Custom className */
  className?: string
  /** Quick actions to display above input */
  quickActions?: Array<{ label: string; prompt: string; icon?: React.ReactNode }>
  /** Callback ref to expose sendMessage function */
  onSendMessageReady?: (sendMessage: (message: { text: string }) => void) => void
  /** Latest finished assistant reply, for read-aloud. */
  onAssistantText?: (text: string) => void
  /** Footer action buttons (upload, mic, volume, etc.) */
  footerActions?: React.ReactNode
  /** Uploaded files display */
  uploadedFilesDisplay?: React.ReactNode
}

type ToolLikePart = {
  type: string
  state?: "input-streaming" | "input-available" | "approval-requested" | "approval-responded" | "output-available" | "output-error" | "output-denied"
  input?: unknown
  output?: unknown
  errorText?: string
  toolName?: string
}

function isToolPart(part: { type: string }): boolean {
  return part.type === "dynamic-tool" || part.type === "tool-call" || part.type.startsWith("tool-")
}

function asToolPart(part: { type: string }): ToolLikePart {
  return part as ToolLikePart
}

function toolLabel(part: ToolLikePart) {
  if (part.toolName) return part.toolName
  return part.type.replace(/^tool-/, "") || "tool"
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
  onAssistantText,
  footerActions,
  uploadedFilesDisplay,
}: BaseChatInterfaceProps) {
  const leagueChatAvailable = useLeagueChatAvailable()
  const stableApiEndpoint = useMemo(() => {
    const endpoint = String(apiEndpoint || "/api/ai/assistant").trim()
    return endpoint.startsWith("/") ? endpoint : "/api/ai/assistant"
  }, [apiEndpoint])

  const bodyKey = JSON.stringify(body ?? {})
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: stableApiEndpoint,
        body: JSON.parse(bodyKey) as Record<string, unknown>,
      }),
    [stableApiEndpoint, bodyKey],
  )

  const { messages, sendMessage, status, regenerate, error, setMessages } = useChat({
    transport,
  })

  const [input, setInput] = useState("")
  const isLoading = status === "streaming" || status === "submitted"
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previousStatusRef = useRef(status)

  useEffect(() => {
    const wasBusy = previousStatusRef.current === "submitted" || previousStatusRef.current === "streaming"
    if (wasBusy && status === "ready") {
      if (document.activeElement !== textareaRef.current) {
        requestAnimationFrame(() => textareaRef.current?.focus())
      }
      const last = messages.at(-1)
      if (last?.role === "assistant") {
        const text = last.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n")
          .trim()
        if (text) onAssistantText?.(text)
      }
    }
    previousStatusRef.current = status
  }, [messages, onAssistantText, status])

  const sendMessageWrapper = useCallback((message: { text: string }) => {
    if (!sendMessage) return
    void sendMessage(message)
    setInput("")
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [sendMessage])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand("copy")
      textArea.remove()
    }
  }, [])

  useEffect(() => {
    if (!onSendMessageReady || !sendMessage) return
    requestAnimationFrame(() => {
      onSendMessageReady(sendMessageWrapper)
    })
  }, [onSendMessageReady, sendMessageWrapper, sendMessage])

  const submitText = useCallback((text: string) => {
    const messageText = text.trim()
    if (!leagueChatAvailable || !messageText || isLoading) return
    void sendMessage({ text: messageText })
    setInput("")
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [isLoading, leagueChatAvailable, sendMessage])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submitText(input)
  }

  const CharacterAvatar = characterPalette === "gold-black" ? PokeMnkyPremium : PokeMnkyAssistant

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <PokeMnkyPremium size={700} className="text-muted-foreground drop-shadow-2xl" />
        </div>
      </div>
      <div className="relative z-10 flex flex-col h-full">
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
              className="min-h-11 min-w-11 shrink-0"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </BlurFade>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        <Conversation className="h-full overscroll-contain">
        <ConversationContent className="pb-safe">
          {error && (
            <div className="p-4 m-4 rounded-md bg-destructive/10 text-destructive text-sm">
              {formatLeagueChatComposerError(error.message)}
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
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === "user"}
              >
                <ChatTurn
                  message={message}
                  onCopy={handleCopy}
                  onRetry={() => {
                    void regenerate({ messageId: message.id })
                  }}
                />
              </MessageScrollerItem>
            ))
          )}

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

      {quickActions && quickActions.length > 0 && (
        <div className="border-t px-4 pt-3 pb-2 bg-card/20 backdrop-blur-sm flex-shrink-0">
          <QuickActions
            actions={quickActions}
            onAction={(prompt) => submitText(prompt)}
            disabled={isLoading || !leagueChatAvailable}
          />
        </div>
      )}

      {!leagueChatAvailable && (
        <p role="status" className="border-t px-4 py-3 text-sm text-muted-foreground">
          Ask POKE MNKY is unavailable. OpenAI is disabled, and the OpenClaw gateway is not configured.
        </p>
      )}

      <div className="border-t bg-card/20 backdrop-blur-sm flex-shrink-0">
        {uploadedFilesDisplay && (
          <div className="px-4 pt-2 pb-1">
            {uploadedFilesDisplay}
          </div>
        )}
        <form className="px-4 pb-3 pt-2" onSubmit={handleSubmit}>
          <InputGroup>
            <InputGroupTextarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  submitText(input)
                }
              }}
              placeholder={leagueChatAvailable ? "Ask me anything..." : "Chat is unavailable"}
              disabled={!leagueChatAvailable}
              aria-label="Message"
              rows={1}
              className="min-h-11 max-h-[200px] text-base touch-manipulation"
            />
            <InputGroupAddon align="block-end" className="pt-1">
              {footerActions}
              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-sm"
                disabled={!leagueChatAvailable || isLoading || !input.trim()}
                className="ml-auto min-h-11 min-w-11"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpIcon className="h-4 w-4" />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p className="px-1 pt-2 text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for a new line
          </p>
        </form>
      </div>
      </div>
    </div>
  )
}

function ChatTurn({
  message,
  onCopy,
  onRetry,
}: {
  message: UIMessage
  onCopy: (text: string) => void
  onRetry: () => void
}) {
  const parts = message.parts ?? []
  const toolCalls = parts.filter(isToolPart)
  const sources = parts.filter((part) => part.type === "source-url")

  return (
    <Fragment>
      {message.role === "assistant" && toolCalls.length > 0 && (
        <div className="mb-2 px-4">
          <Badge
            variant="secondary"
            className="gap-1.5 text-xs bg-primary/10 text-primary border-primary/20"
          >
            <Sparkles className="h-3 w-3" />
            Used {toolCalls.length} tool{toolCalls.length > 1 ? "s" : ""}: {toolCalls.map((part) => toolLabel(asToolPart(part))).join(", ")}
          </Badge>
        </div>
      )}

      {message.role === "assistant" && sources.length > 0 && (
        <Sources>
          <SourcesTrigger count={sources.length} />
          <SourcesContent>
            {sources.map((part, index) => (
              <Source
                key={`${message.id}-source-${index}`}
                href={part.url}
                title={part.title || part.url}
              >
                <div className="flex items-center gap-2 w-full">
                  <BookIcon className="h-4 w-4 shrink-0" />
                  <span className="font-medium flex-1">{part.title || part.url}</span>
                </div>
              </Source>
            ))}
          </SourcesContent>
        </Sources>
      )}

      {parts.map((part, index) => {
        const legacyCode = part as { type: string; code?: unknown; language?: unknown }
        if (legacyCode.type === "code" && typeof legacyCode.code === "string") {
          const language = (typeof legacyCode.language === "string" ? legacyCode.language : "txt") as BundledLanguage
          return (
            <BlurFade key={`${message.id}-code-${index}`} direction="up" delay={index * 0.1}>
              <CodeBlock code={legacyCode.code} language={language} />
            </BlurFade>
          )
        }

        if (part.type === "text") {
          const isLast = index === parts.length - 1
          return (
            <BlurFade key={`${message.id}-${index}`} direction="up" delay={index * 0.1}>
              <Message from={message.role}>
                <MessageContent>
                  <MessageResponse>{part.text}</MessageResponse>
                  {message.role === "assistant" && isLast ? (
                    <MessageActions>
                      <MessageAction onClick={onRetry} label="Retry" tooltip="Try again">
                        <RefreshCcwIcon className="size-3" />
                      </MessageAction>
                      <MessageAction onClick={() => onCopy(part.text)} label="Copy" tooltip="Copy">
                        <CopyIcon className="size-3" />
                      </MessageAction>
                    </MessageActions>
                  ) : null}
                </MessageContent>
              </Message>
            </BlurFade>
          )
        }

        if (part.type === "reasoning") {
          return (
            <BlurFade key={`${message.id}-reasoning-${index}`} direction="up" delay={index * 0.1}>
              <Reasoning isStreaming={part.state === "streaming"}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            </BlurFade>
          )
        }

        if (isToolPart(part)) {
          const toolPart = asToolPart(part)
          const name = toolLabel(toolPart)
          return (
            <BlurFade key={`${message.id}-tool-${index}`} direction="up" delay={index * 0.1}>
              <Tool>
                <ToolHeader
                  title={name}
                  type={`tool-${name}`}
                  state={toolPart.state || "output-available"}
                />
                <ToolContent>
                  {toolPart.input != null ? <ToolInput input={toolPart.input} /> : null}
                  {toolPart.output != null || toolPart.errorText ? (
                    <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
                  ) : null}
                </ToolContent>
              </Tool>
            </BlurFade>
          )
        }

        return null
      })}
    </Fragment>
  )
}
