"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchSubmitForm } from "@/components/matches/match-submit-form"

export default function SubmitResultPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/matches">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Matches
        </Button>
      </Link>
      <MatchSubmitForm backHref="/matches" successRedirect="/matches" />
    </div>
  )
}
