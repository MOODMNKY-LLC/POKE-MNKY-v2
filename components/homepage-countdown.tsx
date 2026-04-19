"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { NextEventPayload } from "@/lib/homepage-types"

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function formatRemaining(ms: number) {
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`
  return `${m}m ${pad(sec)}s`
}

export function HomepageCountdown() {
  const [data, setData] = useState<NextEventPayload | null>(null)
  const [remaining, setRemaining] = useState<string | null>(null)

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
      setRemaining(null)
      return
    }
    const target = new Date(data.targetIso).getTime()
    const tick = () => {
      const left = formatRemaining(target - Date.now())
      setRemaining(left)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [data?.targetIso])

  if (!data) return null

  return (
    <Card className="border border-border/60 bg-muted/30 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          {data.label}
        </CardTitle>
        {data.seasonName && <CardDescription>{data.seasonName}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">
        {data.targetIso && remaining ? (
          <p className="font-mono text-lg tabular-nums tracking-tight">{remaining}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Countdown appears when the league sets upcoming season dates in Supabase.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
