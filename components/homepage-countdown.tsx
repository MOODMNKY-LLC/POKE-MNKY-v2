"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { NextEventPayload } from "@/lib/homepage-types"
import { getCountdownParts, type CountdownParts } from "@/lib/league-countdown"
import { cn } from "@/lib/utils"

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function CountdownUnits({
  parts,
  className,
  size = "default",
}: {
  parts: CountdownParts
  className?: string
  size?: "default" | "compact"
}) {
  const units: { label: string; value: number }[] = [
    { label: "Days", value: parts.days },
    { label: "Hours", value: parts.hours },
    { label: "Min", value: parts.minutes },
    { label: "Sec", value: parts.seconds },
  ]
  return (
    <div
      className={cn(
        "flex items-stretch gap-2 sm:gap-3",
        size === "compact" && "gap-1.5 sm:gap-2",
        className
      )}
    >
      {units.map(({ label, value }) => (
        <div
          key={label}
          className={cn(
            "flex min-w-[3.25rem] flex-col items-center justify-center rounded-md border border-border/50 bg-background/60 px-2 py-1.5 sm:min-w-[3.75rem] sm:px-3 sm:py-2",
            size === "compact" && "min-w-[2.75rem] px-1.5 py-1 sm:min-w-[3.25rem]"
          )}
        >
          <span
            className={cn(
              "font-mono font-semibold tabular-nums tracking-tight",
              size === "compact" ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
            )}
          >
            {label === "Days" ? String(value) : pad(value)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

type HomepageCountdownProps = {
  /** Full-width strip under the site nav (homepage). */
  variant?: "banner" | "card"
}

export function HomepageCountdown({ variant = "banner" }: HomepageCountdownProps) {
  const [data, setData] = useState<NextEventPayload | null>(null)
  const [parts, setParts] = useState<CountdownParts | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/homepage/next-event", { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as NextEventPayload
        if (!cancelled) setData(json)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!data?.targetIso) {
      setParts(null)
      return
    }
    const tick = () => {
      setParts(getCountdownParts(data.targetIso!))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [data?.targetIso])

  if (!loaded || !data) return null

  const isDraft = data.kind === "draft_start" || data.kind === "draft_close"
  const ended = data.targetIso && !parts

  if (variant === "banner") {
    if (data.kind === "none" && !parts) return null

    return (
      <section
        aria-label="League countdown"
        className="w-full border-b border-primary/20 bg-gradient-to-r from-primary/15 via-background to-accent/10"
      >
        <div className="container mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Clock className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {data.seasonName ?? "League"}
                </p>
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{data.label}</h2>
                {data.displayLocal && isDraft && (
                  <p className="text-sm text-muted-foreground">
                    {data.kind === "draft_close" ? "Closes" : "Starts"}:{" "}
                    <span className="text-foreground/90">{data.displayLocal}</span>
                    <span className="text-muted-foreground"> (Chicago)</span>
                  </p>
                )}
                {data.kind === "draft_live" && (
                  <p className="text-sm font-medium text-primary">
                    Draft is underway — good luck, coaches!
                  </p>
                )}
                {ended && (
                  <p className="text-sm text-muted-foreground">This event has started.</p>
                )}
              </div>
            </div>
            {parts && <CountdownUnits parts={parts} className="lg:shrink-0" />}
          </div>
        </div>
      </section>
    )
  }

  return (
    <Card className="border border-border/60 bg-muted/30 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          {data.label}
        </CardTitle>
        {data.seasonName && <CardDescription>{data.seasonName}</CardDescription>}
        {data.displayLocal && isDraft && (
          <CardDescription className="text-foreground/80">
            {data.kind === "draft_close" ? "Closes" : "Starts"}: {data.displayLocal} (Chicago)
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {data.kind === "draft_live" && (
          <p className="text-sm font-medium text-primary">Draft is underway — good luck, coaches!</p>
        )}
        {parts ? (
          <CountdownUnits parts={parts} size="compact" />
        ) : ended ? (
          <p className="text-sm text-muted-foreground">This event has started.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {data.kind === "none"
              ? "Countdown appears when an admin sets the next draft date in League → Countdown."
              : "Schedule updates appear here when season dates are configured."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
