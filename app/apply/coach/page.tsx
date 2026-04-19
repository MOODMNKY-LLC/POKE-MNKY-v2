import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { homepageLeague } from "@/lib/homepage-config"
import { ApplyCoachForm } from "./apply-coach-form"

export default function ApplyCoachPage() {
  return (
    <div className="container mx-auto max-w-lg py-16 px-4">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Apply to coach</CardTitle>
          <CardDescription>
            {homepageLeague.fullName} — submit once per account. Staff review runs in the admin queue with Discord
            context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplyCoachForm />
        </CardContent>
      </Card>
    </div>
  )
}
