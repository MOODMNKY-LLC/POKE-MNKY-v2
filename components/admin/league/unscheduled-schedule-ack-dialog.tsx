"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type UnscheduledScheduleAckDialogProps = {
  open: boolean
  onAcknowledge: () => void
  unscheduledCount: number
  matchesCreated: number
  stats?: {
    divisional: number
    conference: number
    crossConference: number
    maxByesPerTeam: number
  }
}

export function UnscheduledScheduleAckDialog({
  open,
  onAcknowledge,
  unscheduledCount,
  matchesCreated,
  stats,
}: UnscheduledScheduleAckDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onAcknowledge()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule generated with unscheduled matchups</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                {matchesCreated} regular-season matches were created.{" "}
                <strong className="text-foreground">{unscheduledCount} matchup(s)</strong> could not
                be placed within the configured regular-season weeks.
              </p>
              <p>
                This is expected when the league has more possible pairings than available weeks.
                You can add weeks to the season, accept a partial round-robin, or schedule those
                matchups manually.
              </p>
              {stats ? (
                <ul className="list-disc pl-5 space-y-1">
                  <li>Divisional: {stats.divisional}</li>
                  <li>Conference: {stats.conference}</li>
                  <li>Cross-conference: {stats.crossConference}</li>
                  <li>Max byes per team: {stats.maxByesPerTeam}</li>
                </ul>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onAcknowledge}>Acknowledged</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
