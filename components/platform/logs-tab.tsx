"use client"

import { Card } from "@/components/ui/card"

export function LogsTab({ projectRef }: { projectRef: string }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">System Logs</h3>
        <p className="text-sm text-muted-foreground">Logs viewing coming soon</p>
      </Card>
    </div>
  )
}
