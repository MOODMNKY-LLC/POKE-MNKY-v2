import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MatchSubmitForm } from "@/components/matches/match-submit-form"
import { SheetSyncSubmitNotice } from "@/components/matches/sheet-sync-submit-notice"
import { getLiveSheetSyncWriteGate } from "@/lib/sheet-sync-write-gate"

export default async function WeeklyMatchesSubmitPage() {
  const supabase = await createClient()
  const {
    data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const gate = await getLiveSheetSyncWriteGate(supabase)

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {gate.blocked ? (
          <SheetSyncSubmitNotice
            seasonName={gate.seasonName}
            backHref="/dashboard/weekly-matches"
          />
        ) : (
          <MatchSubmitForm
            backHref="/dashboard/weekly-matches"
            successRedirect="/dashboard/weekly-matches/history"
          />
        )}
      </div>
    </>
  )
}
