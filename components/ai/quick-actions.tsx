"use client"

/**
 * Quick Actions Component
 * 
 * Displays quick action buttons for common queries.
 * Used in agent-specific chat interfaces.
 */

import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/ui/blur-fade"
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
    <BlurFade direction="down" delay={0.1}>
      <div className={cn("flex flex-wrap gap-2 mb-4", className)}>
        {actions.map((action, index) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={() => onAction(action.prompt)}
            disabled={disabled}
            className="text-xs"
          >
            {action.icon && <span className="mr-1.5">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
      </div>
    </BlurFade>
  )
}
