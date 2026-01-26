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

import { useState, useRef, KeyboardEvent, FormEvent, forwardRef, useImperativeHandle, useEffect } from "react"
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

export interface PromptInputWrapperRef {
  focus: () => void
}

export const PromptInputWrapper = forwardRef<PromptInputWrapperRef, PromptInputWrapperProps>(({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your message...",
  className,
  showSubmit = true,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    }
  }))
  const [isComposing, setIsComposing] = useState(false)

  // Force hide scrollbar via DOM manipulation
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      // Apply styles directly to the element
      textarea.style.setProperty('-ms-overflow-style', 'none', 'important')
      textarea.style.setProperty('scrollbar-width', 'none', 'important')
      
      // For webkit browsers, inject style tag
      const styleId = 'hide-textarea-scrollbar-style'
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
          textarea.hide-textarea-scrollbar::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
        `
        document.head.appendChild(style)
      }
    }
  }, [])

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    // Don't prevent submission if disabled - let parent handle it
    // But prevent if composing or empty
    if (!value.trim() || isComposing) return
    // Check disabled state for submit prevention
    if (disabled) return

    const messageText = value.trim()
    onSubmit({ text: messageText })
    onChange("")
    
    // Reset textarea height and focus immediately after submission
    // Since textarea is no longer disabled, focus will work
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.focus()
        console.log("[PromptInputWrapper] Focused input after submit")
      }
    })
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
          disabled={false}
          rows={1}
          className={cn(
            "resize-none min-h-[44px] max-h-[200px] pr-12",
            // Mobile optimization - prevent zoom on iOS
            "text-base",
            // Touch optimization
            "touch-manipulation",
            // Overflow for scrolling
            "overflow-y-auto",
            // Hide scrollbar class
            "hide-textarea-scrollbar"
          )}
        />
        {showSubmit && (
          <Button
            type="submit"
            disabled={disabled || !value.trim()}
            size="icon"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 min-h-[44px] min-w-[44px] shrink-0",
              "touch-manipulation active:scale-95"
            )}
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
})

PromptInputWrapper.displayName = "PromptInputWrapper"
