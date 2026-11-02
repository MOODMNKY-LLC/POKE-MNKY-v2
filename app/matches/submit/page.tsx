import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchSubmitForm } from "@/components/matches/match-submit-form"
import { SheetSyncSubmitNotice } from "@/components/matches/sheet-sync-submit-notice"
import { createClient } from "@/lib/supabase/server"
import { getLiveSheetSyncWriteGate } from "@/lib/sheet-sync-write-gate"

export default async function SubmitResultPage() {
  const supabase = await createClient()
  const gate = await getLiveSheetSyncWriteGate(supabase)

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/matches">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Matches
        </Button>
      </Link>
      {gate.blocked ? (
        <SheetSyncSubmitNotice seasonName={gate.seasonName} backHref="/matches" />
      ) : (
        <MatchSubmitForm backHref="/matches" successRedirect="/matches" />
      )}
    </div>
  )
}
