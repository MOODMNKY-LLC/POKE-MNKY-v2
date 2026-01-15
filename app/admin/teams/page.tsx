import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Edit, Plus, Trash2, RefreshCw, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function AdminTeamsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage league teams, rosters, and team information</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Hero Section */}
      <Card className="mb-8 bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Management Overview
          </CardTitle>
          <CardDescription>
            Comprehensive team administration and roster management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Team Management system allows administrators to create, update, and manage all league teams. 
            This includes editing team information, managing rosters, assigning coaches, updating divisions 
            and conferences, and tracking team statistics. Full functionality will be available here as we 
            continue building out the admin panel.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Roster Management
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Edit className="h-3 w-3 mr-1" />
              Team Editing
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Data Sync
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Google Sheets Import
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Teams</CardTitle>
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
            <CardTitle className="text-lg">Edit Team Info</CardTitle>
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
            <CardTitle className="text-lg">Manage Rosters</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Operations</CardTitle>
            <CardDescription>Manage multiple teams at once</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Import teams from Google Sheets, bulk update divisions/conferences, and synchronize 
              team data across systems.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Analytics</CardTitle>
            <CardDescription>View team statistics and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Analyze team performance, roster composition, draft efficiency, and identify trends 
              across divisions and conferences.
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
              <Link href="/teams">
                <Users className="h-4 w-4 mr-2" />
                View All Teams
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/standings">
                <Users className="h-4 w-4 mr-2" />
                View Standings
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/google-sheets">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Google Sheets Config
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
