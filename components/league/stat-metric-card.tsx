import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatMetricCardProps {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  className?: string
  valueClassName?: string
}

export function StatMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  valueClassName,
}: StatMetricCardProps) {
  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        {Icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-1 truncate text-2xl font-bold tabular-nums tracking-tight", valueClassName)}>
            {value}
          </p>
          {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
