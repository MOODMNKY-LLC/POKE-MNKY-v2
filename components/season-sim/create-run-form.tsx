"use client"

import { useState } from "react"
import { Dices, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { randomSeed, type ApiFailure, type CreateRunBody, type SelectorDraft } from "@/lib/season-sim/client-api"

type NumericField = "team_count" | "total_rounds" | "budget_total" | "schedule_weeks" | "playoff_size"

const NUMERIC_FIELDS: { key: NumericField; label: string }[] = [
  { key: "team_count", label: "Team count" },
  { key: "total_rounds", label: "Draft rounds" },
  { key: "budget_total", label: "Budget per team" },
  { key: "schedule_weeks", label: "Schedule weeks" },
  { key: "playoff_size", label: "Playoff size" },
]

interface CreateRunFormProps {
  busy: boolean
  creating: boolean
  error: ApiFailure | null
  onCreate: (body: CreateRunBody) => Promise<boolean>
}

export function CreateRunForm({ busy, creating, error, onCreate }: CreateRunFormProps) {
  const [seed, setSeed] = useState("")
  const [numbers, setNumbers] = useState<Record<NumericField, string>>({
    team_count: "",
    total_rounds: "",
    budget_total: "",
    schedule_weeks: "",
    playoff_size: "",
  })
  const [selector, setSelector] = useState<SelectorDraft | "default">("default")
  const [queueImmediately, setQueueImmediately] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<NumericField, string>>>({})

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const body: CreateRunBody = { queue_immediately: queueImmediately }
    const problems: Partial<Record<NumericField, string>> = {}

    if (seed.trim()) body.master_seed = seed.trim()
    if (selector !== "default") body.selector_draft = selector

    for (const { key } of NUMERIC_FIELDS) {
      const raw = numbers[key].trim()
      if (!raw) continue
      const value = Number(raw)
      if (!Number.isInteger(value) || value < 1) {
        problems[key] = "Enter a whole number of 1 or more."
      } else {
        body[key] = value
      }
    }

    setFieldErrors(problems)
    if (Object.keys(problems).length > 0) return
    await onCreate(body)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground text-pretty">
        Leave a field blank to use the server default.
      </p>

      <div className="space-y-2">
        <Label htmlFor="sim-seed">Master seed</Label>
        <div className="flex gap-2">
          <Input
            id="sim-seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="server default"
            autoComplete="off"
            className="h-11 sm:h-9"
          />
          <Button
            type="button"
            variant="outline"
            className="size-11 shrink-0 sm:size-9"
            onClick={() => setSeed(randomSeed())}
            disabled={busy}
            aria-label="Generate random seed"
          >
            <Dices aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {NUMERIC_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`sim-${key}`}>{label}</Label>
            <Input
              id={`sim-${key}`}
              inputMode="numeric"
              value={numbers[key]}
              onChange={(e) => setNumbers((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder="default"
              aria-invalid={fieldErrors[key] ? true : undefined}
              aria-describedby={fieldErrors[key] ? `sim-${key}-error` : undefined}
              className="h-11 sm:h-9"
            />
            {fieldErrors[key] ? (
              <p id={`sim-${key}-error`} className="text-xs text-destructive">
                {fieldErrors[key]}
              </p>
            ) : null}
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="sim-selector">Draft selector</Label>
          <Select value={selector} onValueChange={(v) => setSelector(v as SelectorDraft | "default")}>
            <SelectTrigger id="sim-selector" className="h-11 w-full sm:h-9">
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

      <div className="flex min-h-11 items-center gap-3">
        <Switch id="sim-queue" checked={queueImmediately} onCheckedChange={setQueueImmediately} />
        <Label htmlFor="sim-queue">Queue immediately</Label>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>
            Could not create run{error.code ? ` (${error.code})` : ""}
          </AlertTitle>
          <AlertDescription>{error.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={busy} className="h-11 w-full sm:h-9 sm:w-auto">
        {creating ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Create run
      </Button>
    </form>
  )
}
