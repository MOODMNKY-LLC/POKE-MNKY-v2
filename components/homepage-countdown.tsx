"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { NextEventPayload } from "@/lib/homepage-types"
import { getCountdownParts, type CountdownParts } from "@/lib/league-countdown"

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function CountdownGrid({ parts }: { parts: CountdownParts }) {
  const units: { label: string; value: number }[] = [
    { label: "Days", value: parts.days },
    { label: "Hours", value: parts.hours },
    { label: "Min", value: parts.minutes },
    { label: "Sec", value: parts.seconds },
  ]
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {units.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-md border border-border/60 bg-background/80 px-2 py-2 text-center sm:px-3 sm:py-2.5"
        >
          <p className="font-mono text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
            {label === "Days" ? String(value) : pad(value)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}

export function HomepageCountdown() {
  const [data, setData] = useState<NextEventPayload | null>(null)
  const [parts, setParts] = useState<CountdownParts | null>(null)

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

  if (!data) return null

  const isDraft = data.kind === "draft_start" || data.kind === "draft_close"
  const ended = data.targetIso && !parts

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
      <CardContent className="pt-0 space-y-3">
        {data.kind === "draft_live" && (
          <p className="text-sm font-medium text-primary">Draft is underway — good luck, coaches!</p>
        )}
        {parts ? (
          <CountdownGrid parts={parts} />
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
