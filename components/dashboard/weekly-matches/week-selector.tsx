"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type WeekOption = {
  week: number
  disabled?: boolean
  label?: string
}

function clampWeek(week: number, min: number, max: number) {
  if (Number.isNaN(week)) return min
  return Math.max(min, Math.min(max, week))
}

export function WeekSelector({
  weeks,
  selectedWeek,
  totalWeeks,
  className,
}: {
  weeks: WeekOption[]
  selectedWeek: number
  totalWeeks: number
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const minWeek = 1
  const maxWeek = Math.max(minWeek, totalWeeks)

  const safeSelectedWeek = clampWeek(selectedWeek, minWeek, maxWeek)

  const setWeek = React.useCallback(
    (nextWeek: number) => {
      const safeNextWeek = clampWeek(nextWeek, minWeek, maxWeek)
      const next = new URLSearchParams(searchParams?.toString())
      next.set("week", String(safeNextWeek))
      router.push(`${pathname}?${next.toString()}`)
    },
    [maxWeek, minWeek, pathname, router, searchParams],
  )

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(safeSelectedWeek)}
          onValueChange={(value) => setWeek(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select week" />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((w) => (
              <SelectItem
                key={w.week}
                value={String(w.week)}
                disabled={w.disabled}
              >
                {w.label ?? `Week ${w.week}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-muted-foreground text-sm">
          Showing <span className="text-foreground font-medium">Week {safeSelectedWeek}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {weeks.map((w) => {
          const isActive = w.week === safeSelectedWeek
          return (
            <Button
              key={w.week}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              disabled={w.disabled}
              className={cn("h-8 px-2.5", isActive && "pointer-events-none")}
              onClick={() => setWeek(w.week)}
            >
              W{w.week}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

