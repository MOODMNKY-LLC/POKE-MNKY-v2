import { DraftTabsSection } from "@/components/dashboard/draft-tabs-section"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import { redirect } from "next/navigation"

export default async function DraftPlanningPage() {
  const supabase = await createClient()
  const {
    data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getCurrentUserProfile(supabase)

  if (!profile) {
    redirect("/auth/login")
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 safe-area-padding">
        <DraftTabsSection />
      </div>
    </>
  )
}
