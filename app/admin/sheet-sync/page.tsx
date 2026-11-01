"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SheetSyncAdminPage() {
  const [message, setMessage] = useState<string>("")
  const [pending, setPending] = useState(false)

  async function run(dryRun: boolean) {
    setPending(true)
    setMessage("")
    try {
      const response = await fetch("/api/cron/sync-league-sheet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun }),
      })
      const body = await response.json()
      setMessage(response.ok ? JSON.stringify(body, null, 2) : body.error ?? "Sync failed")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <AdminLayout title="League sheet sync" description="Read the live season sheet into the database. The daily cron stays at 06:15 UTC.">
      <Card>
        <CardHeader>
          <CardTitle>Sync Season 7</CardTitle>
          <CardDescription>
            Dry run plans the diff and writes a log row. Sync now applies it. The job rolls back if the standings do not match the sheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(true)}>
            Dry run
          </Button>
          <Button type="button" disabled={pending} onClick={() => run(false)}>
            Sync now
          </Button>
        </CardContent>
      </Card>
      {message ? <pre className="mt-4 overflow-auto rounded-md border bg-muted/40 p-4 text-sm">{message}</pre> : null}
    </AdminLayout>
  )
}
