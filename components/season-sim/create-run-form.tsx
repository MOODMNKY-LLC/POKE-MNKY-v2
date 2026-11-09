"use client"

import { ChevronDown, FlaskConical, History, Loader2 } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SimConsoleState } from "./sim-console"

const TOUCH = "h-11 sm:h-9"
const SELECT_TOUCH = "h-11 w-full sm:h-9 data-[size=default]:h-11 sm:data-[size=default]:h-9"

const NUMERIC_FIELDS = [
  { key: "team_count", label: "Team count" },
  { key: "total_rounds", label: "Draft rounds" },
  { key: "budget_total", label: "Budget per team" },
  { key: "schedule_weeks", label: "Schedule weeks" },
  { key: "playoff_size", label: "Playoff size" },
] as const

type NumericKey = (typeof NUMERIC_FIELDS)[number]["key"]
type CreateBody = Parameters<SimConsoleState["create"]>[0]

function messageOf(value: unknown): string {
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message
  return JSON.stringify(value)
}

export function CreateRunForm({ sim }: { sim: SimConsoleState }) {
  const [seed, setSeed] = useState("")
  const [numbers, setNumbers] = useState<Record<NumericKey, string>>({
    team_count: "",
    total_rounds: "",
    budget_total: "",
    schedule_weeks: "",
    playoff_size: "",
  })
  const [selector, setSelector] = useState("default")
  const [queueImmediately, setQueueImmediately] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<NumericKey, string>>>({})
  const [loadId, setLoadId] = useState("")

  function submitCreate(event: FormEvent) {
    event.preventDefault()
    const body: Record<string, unknown> = {}
    const nextErrors: Partial<Record<NumericKey, string>> = {}

    const trimmedSeed = seed.trim()
    if (trimmedSeed) body.master_seed = trimmedSeed
    for (const { key } of NUMERIC_FIELDS) {
      const raw = numbers[key].trim()
      if (!raw) continue
      const value = Number(raw)
      if (!Number.isInteger(value) || value < 1) nextErrors[key] = "Enter a whole number of 1 or more, or leave blank."
      else body[key] = value
    }
    if (selector !== "default") body.selector_draft = selector
    if (queueImmediately) body.queue_immediately = true

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    void sim.create(body as CreateBody)
  }

  function submitLoad(event: FormEvent) {
    event.preventDefault()
    const id = loadId.trim()
    if (id) void sim.loadRun(id)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-xl">No run loaded</CardTitle>
          <CardDescription className="text-pretty">
            Start a sandbox run with the server defaults, or open Run options to set the seed and counts. Blank fields
            use the server default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitCreate} className="space-y-4" noValidate>
            <Button type="submit" className="h-12 w-full text-base sm:h-11" disabled={sim.busy}>
              {sim.busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FlaskConical aria-hidden="true" />}
              Create run
            </Button>

            <div role="status" className="space-y-2 empty:hidden">
              {sim.createInfo ? <p className="text-sm text-foreground">{messageOf(sim.createInfo)}</p> : null}
            </div>
            {sim.createError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  <span className="font-medium">Could not create run. </span>
                  {sim.createError.error}
                </AlertDescription>
              </Alert>
            ) : null}

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="group h-11 w-full justify-between sm:h-9">
                  Run options
                  <ChevronDown
                    className="transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="opt-seed">Master seed</Label>
                  <Input
                    id="opt-seed"
                    value={seed}
                    placeholder="Server default"
                    autoComplete="off"
                    className={`${TOUCH} font-mono`}
                    onChange={(event) => setSeed(event.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {NUMERIC_FIELDS.map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`opt-${key}`}>{label}</Label>
                      <Input
                        id={`opt-${key}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={numbers[key]}
                        placeholder="Server default"
                        className={TOUCH}
                        aria-invalid={Boolean(errors[key])}
                        aria-describedby={errors[key] ? `opt-${key}-error` : undefined}
                        onChange={(event) => setNumbers((current) => ({ ...current, [key]: event.target.value }))}
                      />
                      {errors[key] ? (
                        <p id={`opt-${key}-error`} className="text-sm text-destructive">
                          {errors[key]}
                        </p>
                      ) : null}
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <Label htmlFor="opt-selector">Draft selector</Label>
                    <Select value={selector} onValueChange={setSelector}>
                      <SelectTrigger id="opt-selector" className={SELECT_TOUCH}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Server default</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                        <SelectItem value="heuristic">Heuristic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Label
                  htmlFor="sim-queue"
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 leading-snug"
                >
                  <Checkbox
                    id="sim-queue"
                    className="mt-0.5"
                    checked={queueImmediately}
                    onCheckedChange={(checked) => setQueueImmediately(checked === true)}
                  />
                  <span className="text-pretty">
                    Queue the first step immediately. It is still queued, not played, until you run it.
                  </span>
                </Label>
              </CollapsibleContent>
            </Collapsible>
          </form>
        </CardContent>
      </Card>

      <Card className="self-start lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-xl">Open an existing run</CardTitle>
          <CardDescription className="text-pretty">Paste a run id to load its current state.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitLoad} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="load-run-id">Run id</Label>
              <Input
                id="load-run-id"
                value={loadId}
                autoComplete="off"
                spellCheck={false}
                className={`${TOUCH} font-mono`}
                onChange={(event) => setLoadId(event.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" className={`${TOUCH} w-full`} disabled={sim.busy || !loadId.trim()}>
              Load run
            </Button>
            {sim.lastRunId ? (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left sm:min-h-9"
                disabled={sim.busy}
                onClick={() => void sim.loadRun(sim.lastRunId as string)}
              >
                <History aria-hidden="true" />
                <span className="min-w-0 break-all">
                  Resume last run · <span className="font-mono">{sim.lastRunId.slice(0, 8)}</span>
                </span>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
