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
        <AlertTitle>Feature disabled in this environment</AlertTitle>
        <AlertDescription>
          The Season Simulator v2 sandbox is turned off here (SIM_SANDBOX_V2_DISABLED). Nothing can be created or loaded until it is enabled for this deployment.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      <ShieldAlert aria-hidden="true" />
      <AlertTitle>Cannot use the sandbox</AlertTitle>
      <AlertDescription>
        <p>
          This browser has no session, or the signed-in account is not allowed to run the sandbox (HTTP 401/403).
          Sign in with an allowed account and try again.
        </p>
        {detail ? <p className="mt-2 text-pretty">{detail}</p> : null}
        <Button asChild variant="outline" className="mt-2 h-11 sm:h-9">
          <Link href={SIGN_IN_HREF}>Sign in</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
