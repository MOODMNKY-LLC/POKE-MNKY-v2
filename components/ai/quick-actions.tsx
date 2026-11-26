"use client"

/**
 * Suggested questions shown above the chat field.
 */

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface QuickAction {
  label: string
  prompt: string
  icon?: React.ReactNode
}

export interface QuickActionsProps {
  actions: QuickAction[]
  onAction: (prompt: string) => void
  disabled?: boolean
  className?: string
}

export function QuickActions({
  actions,
  onAction,
  disabled = false,
  className,
}: QuickActionsProps) {
  if (actions.length === 0) return null

  return (
    <div className={cn("flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide pb-1", className)}>
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="outline"
          onClick={() => onAction(action.prompt)}
          disabled={disabled}
          className="h-11 min-h-11 shrink-0 rounded-full px-4 text-sm whitespace-nowrap"
        >
          {action.icon && <span className="mr-1">{action.icon}</span>}
          {action.label}
        </Button>
      ))}
    </div>
  )
}
