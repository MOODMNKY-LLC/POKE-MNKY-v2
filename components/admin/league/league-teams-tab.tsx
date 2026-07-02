"use client"

import { CoachAssignmentSection } from "@/components/admin/coach-assignment-section"
import { LeagueTeamManagement } from "@/components/admin/league/league-team-management"
import { QuickLinksCard } from "@/components/admin/quick-links-card"
import { Users } from "lucide-react"

export function LeagueTeamsTab() {
  return (
    <div className="space-y-6">
      <LeagueTeamManagement />
      <CoachAssignmentSection />
      <QuickLinksCard
        links={[
          { href: "/teams", label: "View All Teams", icon: Users },
          { href: "/standings", label: "View Standings", icon: Users },
        ]}
      />
    </div>
  )
}
