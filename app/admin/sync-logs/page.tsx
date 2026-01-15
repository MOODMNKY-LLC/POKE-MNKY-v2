import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, FileText, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function AdminSyncLogsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sync Logs</h1>
          <p className="text-muted-foreground">View data synchronization history and logs</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Hero Section */}
      <Card className="mb-8 bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Synchronization Logs Overview
          </CardTitle>
          <CardDescription>
            Track all data synchronization operations and their results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Sync Logs system provides detailed history of all data synchronization operations, 
            including Google Sheets imports, Poképedia syncs, and manual data updates. View sync 
            status, errors, records processed, and timestamps. Full functionality will be available 
            here as we continue building out the admin panel.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Detailed Logs
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Timestamp Tracking
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Success Monitoring
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              Error Tracking
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sync History</CardTitle>
            <CardDescription>View all synchronization operations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Browse complete history of sync operations with filters by date, type, status, and 
              source. Search and pagination support.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Error Details</CardTitle>
            <CardDescription>Detailed error information and debugging</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View detailed error messages, stack traces, and debugging information for failed 
              sync operations. Retry failed syncs.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sync Statistics</CardTitle>
            <CardDescription>Performance metrics and analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View sync performance metrics, average processing times, success rates, and 
              identify patterns in sync operations.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter & Search</CardTitle>
            <CardDescription>Advanced log filtering capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Filter logs by sync type (Google Sheets, Poképedia), status (success, error, 
              in-progress), date range, and search by keywords.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export Logs</CardTitle>
            <CardDescription>Download sync logs for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export sync logs to CSV or JSON format for external analysis, reporting, or 
              archival purposes.
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
              <Link href="/admin/google-sheets">
                <RefreshCw className="h-4 w-4 mr-2" />
                Google Sheets Config
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/pokepedia-dashboard">
                <RefreshCw className="h-4 w-4 mr-2" />
                Poképedia Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin">
                <RefreshCw className="h-4 w-4 mr-2" />
                Admin Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
