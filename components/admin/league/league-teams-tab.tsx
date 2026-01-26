"use client"

import { CoachAssignmentSection } from "@/components/admin/coach-assignment-section"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Edit, Plus, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { QuickLinksCard } from "@/components/admin/quick-links-card"

export function LeagueTeamsTab() {
  return (
    <div className="space-y-6">
      {/* Coach Assignment Section */}
      <CoachAssignmentSection />

      {/* Coming Soon Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Teams
            </CardTitle>
            <CardDescription>Add new teams to the league</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create new teams with names, coaches, divisions, and conferences. Assign initial rosters 
              and draft picks.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Team Info
            </CardTitle>
            <CardDescription>Update team details and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Modify team names, coach assignments, division/conference placement, and team logos. 
              Update records and statistics.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Rosters
            </CardTitle>
            <CardDescription>Edit team rosters and draft picks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add or remove Pokémon from team rosters, update draft round assignments, and manage 
              draft point allocations.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <QuickLinksCard
          links={[
            { href: "/teams", label: "View All Teams", icon: Users },
            { href: "/standings", label: "View Standings", icon: Users },
            { href: "/admin/google-sheets", label: "Google Sheets Config", icon: FileSpreadsheet },
          ]}
        />
      </div>
    </div>
  )
}
