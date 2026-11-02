import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SHEET_SYNC_WRITE_BLOCKED_MESSAGE } from "@/lib/sheet-sync-write-gate"

export function SheetSyncSubmitNotice({
  seasonName,
  backHref,
}: {
  seasonName?: string | null
  backHref: string
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {seasonName ? `${seasonName} results come from the sheet` : "Results come from the sheet"}
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{SHEET_SYNC_WRITE_BLOCKED_MESSAGE}</p>
          <p className="text-sm text-muted-foreground">
            Update the league Google Sheet (and post in Discord if you usually do). The app copies
            scores on the daily sync; Discord is checked for mismatches only.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>Back</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
