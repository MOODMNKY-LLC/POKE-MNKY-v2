"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Database, LayoutGrid, BarChart3 } from "lucide-react"

const NOTION_DRAFT_BOARD_URL = "https://www.notion.so/5e58ccd73ceb44ed83de826b51cf5c36"

export function NotionIntegrationPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Notion Draft Board
        </CardTitle>
        <CardDescription>
          Primary management interface for draft board configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Use Notion for comprehensive draft board management:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li>Visual organization (Gallery/Kanban views)</li>
            <li>Bulk operations (check/uncheck "Added to Draft Board")</li>
            <li>Rich filtering and grouping</li>
            <li>Collaborative editing</li>
            <li>Version history</li>
          </ul>
        </div>

        <div className="grid gap-2">
          <Button asChild variant="default" className="w-full">
            <a
              href={NOTION_DRAFT_BOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Notion Draft Board
            </a>
          </Button>
        </div>

        <div className="pt-4 border-t space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Recommended Views:
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-3 w-3" />
              <span>Gallery View - Visual browsing with artwork</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3 w-3" />
              <span>Kanban View - Grouped by Point Value (1-20)</span>
            </div>
          </div>
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          <strong>Note:</strong> Changes in Notion automatically sync to Supabase via webhook
          automation. Manual sync is also available below.
        </div>
      </CardContent>
    </Card>
  )
}
