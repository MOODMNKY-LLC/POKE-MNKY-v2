import { Ban, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { AccessIssue } from "@/lib/season-sim/client-api"

export function AccessNotice({ issue }: { issue: AccessIssue }) {
  if (issue === "disabled") {
    return (
      <Alert>
        <Ban aria-hidden="true" />
        <AlertTitle>Feature disabled in this environment</AlertTitle>
        <AlertDescription>
          The Season Simulator v2 sandbox is turned off here (SIM_SANDBOX_V2_DISABLED). Nothing can be created or
          loaded until it is enabled for this deployment.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive">
      <ShieldAlert aria-hidden="true" />
      <AlertTitle>Not authorized for demo</AlertTitle>
      <AlertDescription>
        Your session is not allowed to use the simulator (HTTP 401/403). Sign in with an admin account and try
        again.
      </AlertDescription>
    </Alert>
  )
}
