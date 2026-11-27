import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload } from "lucide-react"
import Link from "next/link"
import { UploadTeamForm } from "@/components/dashboard/upload-team-form"

export const dynamic = "force-dynamic"

export default async function UploadTeamPage() {
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
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/teams">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Teams
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Upload Team Export</h2>
            <p className="text-muted-foreground">
              Paste or upload a Pokémon Showdown team export to save it to your library
            </p>
          </div>
        </div>
        <UploadTeamForm />
      </div>
    </>
  )
}
