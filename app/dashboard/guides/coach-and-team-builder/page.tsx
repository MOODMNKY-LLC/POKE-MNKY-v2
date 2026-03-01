import { redirect } from "next/navigation"

/**
 * Coach and team builder guide content is now in Settings > Guides. Redirect.
 */
export default function CoachAndTeamBuilderGuidePage() {
  redirect("/dashboard/settings?tab=guides")
}
