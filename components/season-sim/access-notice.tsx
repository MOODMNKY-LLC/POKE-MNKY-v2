import Link from "next/link"
import { Ban, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { AccessIssue } from "@/lib/season-sim/client-api"

const SIGN_IN_HREF = "/auth/login?next=/demo/season-sim"

export function AccessNotice({
  issue,
  detail,
}: {
  issue: AccessIssue
  detail?: string | null
}) {
  if (issue === "disabled") {
    return (
      <Alert>
        <Ban aria-hidden="true" />
        <AlertTitle>Practice seasons are turned off here</AlertTitle>
        <AlertDescription>
          <p>
            This site cannot start or open a practice season right now. Ask whoever manages the site to turn practice
            seasons on, then try again.
          </p>
          <p className="mt-2 text-muted-foreground">Technical note: SIM_SANDBOX_V2_DISABLED</p>
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      <ShieldAlert aria-hidden="true" />
      <AlertTitle>You need access to practice seasons</AlertTitle>
      <AlertDescription>
        <p>
          Sign in with a league account that is allowed to run practice seasons. Being signed in is not always enough.
          This does not change your role.
        </p>
        {detail ? <p className="mt-2 text-pretty text-muted-foreground">Technical note: {detail}</p> : null}
        <Button asChild variant="outline" className="mt-2 h-11 sm:h-9">
          <Link href={SIGN_IN_HREF}>Sign in</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
