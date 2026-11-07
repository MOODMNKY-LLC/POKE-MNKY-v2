"use client"

import { useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { shortRunId } from "@/lib/season-sim/client-api"

interface ResetDialogProps {
  runId: string
  disabled: boolean
  resetting: boolean
  onConfirm: () => Promise<boolean>
}

export function ResetDialog({ runId, disabled, resetting, onConfirm }: ResetDialogProps) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const expected = shortRunId(runId)
  const matches = typed.trim().toLowerCase() === expected.toLowerCase()

  async function handleConfirm() {
    const ok = await onConfirm()
    if (ok) {
      setOpen(false)
      setTyped("")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTyped("")
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className="h-11 sm:h-9">
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset sandbox domain?</DialogTitle>
          <DialogDescription className="text-pretty">
            This clears only the sim_* sandbox domain tables for this run and replays it from the start with the
            same seed. Nothing outside the sandbox is touched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="sim-reset-confirm">
            Type <span className="font-mono font-semibold">{expected}</span> to confirm
          </Label>
          <Input
            id="sim-reset-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="h-11 font-mono sm:h-9"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={resetting} className="h-11 sm:h-9">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!matches || resetting}
            className="h-11 sm:h-9"
          >
            {resetting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Reset run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
