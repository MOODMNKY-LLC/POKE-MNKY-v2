import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, Award, Target, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function AdminStatsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistics Management</h1>
          <p className="text-muted-foreground">Manage Pokémon performance statistics and analytics</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Hero Section */}
      <Card className="mb-8 bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Statistics Management Overview
          </CardTitle>
          <CardDescription>
            Comprehensive statistics administration and performance tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Statistics Management system allows administrators to view, update, and manage all 
            Pokémon performance statistics. This includes tracking KOs, match participation, average 
            performance, and generating analytics reports. Full functionality will be available here 
            as we continue building out the admin panel.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Performance Tracking
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Analytics
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Award className="h-3 w-3 mr-1" />
              MVP Calculations
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Data Refresh
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">View Statistics</CardTitle>
            <CardDescription>Browse all Pokémon performance stats</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View comprehensive statistics for all Pokémon including total KOs, matches played, 
              average KOs per match, and team associations.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Update Stats</CardTitle>
            <CardDescription>Manually update or correct statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manually update Pokémon statistics, correct errors, and adjust KO counts or match 
              participation records.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recalculate Stats</CardTitle>
            <CardDescription>Rebuild statistics from match data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Recalculate all statistics from match results, ensuring accuracy and consistency 
              across the database.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">MVP Leaderboard</CardTitle>
            <CardDescription>Manage MVP race calculations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View and manage MVP leaderboard calculations, track top performers, and generate 
              MVP race reports.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics Reports</CardTitle>
            <CardDescription>Generate statistical reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate detailed analytics reports on Pokémon performance, team statistics, and 
              league-wide trends.
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
              <Link href="/mvp">
                <Award className="h-4 w-4 mr-2" />
                View MVP Leaderboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/insights">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Insights
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/matches">
                <Target className="h-4 w-4 mr-2" />
                View Matches
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
