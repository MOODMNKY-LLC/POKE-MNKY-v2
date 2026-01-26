"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminStatCardProps {
  icon: LucideIcon
  value: string | number
  label: string
  description?: string
  color?: "primary" | "chart-1" | "chart-2" | "chart-3" | "accent"
  className?: string
}

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  "chart-1": "bg-chart-1/10 text-chart-1",
  "chart-2": "bg-chart-2/10 text-chart-2",
  "chart-3": "bg-chart-3/10 text-chart-3",
  accent: "bg-accent/10 text-accent",
}

export function AdminStatCard({
  icon: Icon,
  value,
  label,
  description,
  color = "primary",
  className,
}: AdminStatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn("rounded-full p-3", colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground mt-1">{description}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
