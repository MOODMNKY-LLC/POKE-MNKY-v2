import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClaimTeamForm } from "@/components/dashboard/claim-team-form"
import { createServerClient } from "@/lib/supabase/server"

export default async function ClaimTeamPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?next=/dashboard/claim-team")
  }

  return (
    <div className="container max-w-3xl py-8 px-4 space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Claim your league team</CardTitle>
          <CardDescription>
            Link your Discord account to the correct team slot for the current season. You must
            choose explicitly — the app no longer auto-assigns the first open team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClaimTeamForm />
        </CardContent>
      </Card>
    </div>
  )
}
