import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Network, Settings, Award, Users } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function AdminPlayoffsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playoff Management</h1>
          <p className="text-muted-foreground">Manage playoff brackets and championship matches</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Hero Section */}
      <Card className="mb-8 bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Playoff Bracket Management Overview
          </CardTitle>
          <CardDescription>
            Comprehensive playoff administration and bracket management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Playoff Management system allows administrators to create and manage playoff brackets, 
            seed teams based on regular season performance, schedule playoff matches, and track progress 
            through rounds. Full functionality will be available here as we continue building out the 
            admin panel.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary" className="text-xs">
              <Network className="h-3 w-3 mr-1" />
              Bracket Creation
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Team Seeding
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Trophy className="h-3 w-3 mr-1" />
              Round Management
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Award className="h-3 w-3 mr-1" />
              Championship Tracking
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Bracket</CardTitle>
            <CardDescription>Generate playoff bracket from standings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Automatically generate playoff brackets based on regular season standings. Supports 
              multiple bracket formats and seeding methods.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seed Teams</CardTitle>
            <CardDescription>Assign playoff seeds to teams</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manually seed teams or use automatic seeding based on record, differential, and 
              strength of schedule. Support for tiebreakers.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage Rounds</CardTitle>
            <CardDescription>Schedule and track playoff rounds</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create matches for each playoff round, set deadlines, and track progress through 
              Round 1, Quarterfinals, Semifinals, and Finals.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bracket Visualization</CardTitle>
            <CardDescription>Interactive bracket display</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Visual bracket editor with drag-and-drop team placement, automatic advancement, 
              and real-time bracket updates.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Championship Tracking</CardTitle>
            <CardDescription>Track championship progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Monitor championship match progress, record results, and crown league champions. 
              Historical championship tracking.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Links</CardTitle>
            <CardDescription>Access related features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/playoffs">
                <Network className="h-4 w-4 mr-2" />
                View Playoff Bracket
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/standings">
                <Trophy className="h-4 w-4 mr-2" />
                View Standings
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/matches">
                <Trophy className="h-4 w-4 mr-2" />
                Manage Matches
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
