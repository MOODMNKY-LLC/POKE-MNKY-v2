"use client"

/**
 * Prompt Input Wrapper Component
 * 
 * A custom wrapper for prompt input functionality using existing shadcn components.
 * Provides the same API as AI Elements prompt-input but uses our existing Textarea
 * to avoid overwriting existing components.
 * 
 * This provides:
 * - Auto-resizing textarea
 * - Submit button with loading state
 * - Keyboard shortcuts (Enter to submit, Shift+Enter for new line)
 * - File attachment support (future)
 * - Model selector (future)
 */

import { useState, useRef, KeyboardEvent, FormEvent } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SendIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PromptInputMessage {
  text?: string
  files?: File[]
}

export interface PromptInputWrapperProps {
  /** Current input value */
  value: string
  /** Callback when input changes */
  onChange: (value: string) => void
  /** Callback when message is submitted */
  onSubmit: (message: PromptInputMessage) => void
  /** Whether input is disabled (during loading) */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Additional className */
  className?: string
  /** Show submit button */
  showSubmit?: boolean
}

export function PromptInputWrapper({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your message...",
  className,
  showSubmit = true,
}: PromptInputWrapperProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    if (disabled || !value.trim() || isComposing) return

    onSubmit({ text: value.trim() })
    onChange("")
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but not Shift+Enter or when composing)
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    
    // Auto-resize
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-2", className)}>
      <div className="relative flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="resize-none min-h-[44px] max-h-[200px] pr-12"
        />
        {showSubmit && (
          <Button
            type="submit"
            disabled={disabled || !value.trim()}
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 shrink-0"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Press Enter to send, Shift+Enter for new line</span>
      </div>
    </form>
  )
}
