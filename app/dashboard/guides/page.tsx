import { redirect } from "next/navigation"

/**
 * Guides have been moved to Settings. Redirect to the Guides tab.
 */
export default function GuidesPage() {
  redirect("/dashboard/settings?tab=guides")
}
