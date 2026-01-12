"use client"

import { Card } from "@/components/ui/card"

export function SecretsTab({ projectRef }: { projectRef: string }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Environment Secrets</h3>
        <p className="text-sm text-muted-foreground">Secrets management coming soon</p>
      </Card>
    </div>
  )
}
