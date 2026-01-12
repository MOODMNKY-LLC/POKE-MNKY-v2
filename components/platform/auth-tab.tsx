"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function AuthTab({ projectRef }: { projectRef: string }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Authentication Status</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Email/Password</span>
            <Badge variant="default">Enabled</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Discord OAuth</span>
            <Badge variant="secondary">Available</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
