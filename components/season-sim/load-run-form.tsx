"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { shortRunId, type ApiFailure } from "@/lib/season-sim/client-api"

interface LoadRunFormProps {
  busy: boolean
  loading: boolean
  lastRunId: string | null
  error: ApiFailure | null
  onLoad: (runId: string) => Promise<boolean>
}

export function LoadRunForm({ busy, loading, lastRunId, error, onLoad }: LoadRunFormProps) {
  const [value, setValue] = useState("")

  return (
    <div className="space-y-4">
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          void onLoad(value)
        }}
      >
        <Label htmlFor="sim-load-id">Run ID</Label>
        <div className="flex gap-2">
          <Input
            id="sim-load-id"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a run ID"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "sim-load-error" : undefined}
            className="h-11 font-mono sm:h-9"
          />
          <Button type="submit" variant="secondary" disabled={busy || !value.trim()} className="h-11 sm:h-9">
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Load
          </Button>
        </div>
        {error ? (
          <p id="sim-load-error" role="alert" className="text-sm text-destructive">
            {error.status === 404 ? "Run not found." : error.error}
            {error.code ? ` (${error.code})` : ""}
          </p>
        ) : null}
      </form>

      {lastRunId ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setValue(lastRunId)
            void onLoad(lastRunId)
          }}
          className="h-11 w-full justify-start font-mono sm:h-9"
        >
          Resume last run · {shortRunId(lastRunId)}
        </Button>
      ) : null}

      <p className="text-xs text-muted-foreground text-pretty">
        There is no run list endpoint. The most recent run ID is remembered in this browser only.
      </p>
    </div>
  )
}
