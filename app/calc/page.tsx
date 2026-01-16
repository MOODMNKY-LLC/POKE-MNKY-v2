"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import Link from "next/link"

export default function CalcPage() {
  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Damage Calculator</h1>
          <p className="text-muted-foreground">
            Calculate damage between Pokémon with full customization options
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href="https://aab-calc.moodmnky.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </a>
        </Button>
      </div>

      {/* Calculator Embed */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Pokémon Damage Calculator</CardTitle>
          <CardDescription>
            Full-featured damage calculator with support for all generations, items, abilities, and field effects
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full" style={{ height: "calc(100vh - 300px)", minHeight: "800px" }}>
            <iframe
              src="https://aab-calc.moodmnky.com"
              width="100%"
              height="100%"
              title="Pokémon Damage Calculator"
              allow="fullscreen"
              className="border-0"
              style={{ minHeight: "800px" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Builder</CardTitle>
            <CardDescription>Build and analyze your team</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/teams/builder">Go to Team Builder</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Free Agency</CardTitle>
            <CardDescription>Manage your roster</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard/free-agency">Go to Free Agency</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Team</CardTitle>
            <CardDescription>View your team details</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard/team">Go to My Team</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
