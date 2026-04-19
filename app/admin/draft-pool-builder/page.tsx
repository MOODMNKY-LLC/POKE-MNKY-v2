"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"

type AuditRow = {
  id: string
  draft_pool_id: string
  action: string
  payload: Record<string, unknown>
  created_at: string
}

export default function DraftPoolBuilderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AuditRow[]>([])
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login")
        return
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      if (profile?.role !== "admin" && profile?.role !== "commissioner") {
        router.push("/admin")
        return
      }
      const res = await fetch("/api/admin/draft-pool-audit")
      const json = await res.json()
      setRows(json.entries ?? [])
      setNote(json.note ?? null)
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Admin
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Draft Pool Builder</h1>
        <p className="text-muted-foreground">
          Use Draft pool &amp; rules for bulk generation and filters; this page surfaces the change history (audit
          log). Copy-forward between seasons stays a data migration task — keep pool stable when rules unchanged.
        </p>
      </div>

      {note && <p className="text-sm text-amber-600 dark:text-amber-400">{note}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Recent pool edits</CardTitle>
          <CardDescription>Who changed what (payload JSON). Wire writes to audit from pool save actions next.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="border-b border-border/50 pb-2">
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span> —{" "}
                {r.action} — pool {r.draft_pool_id.slice(0, 8)}…
                <pre className="mt-1 text-xs overflow-x-auto max-h-24 bg-muted/30 p-2 rounded">
                  {JSON.stringify(r.payload, null, 2)}
                </pre>
              </li>
            ))}
            {rows.length === 0 && !note && <li className="text-muted-foreground">No audit entries yet.</li>}
          </ul>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/admin/draft-pool-rules">Open draft pool &amp; rules</Link>
      </Button>
    </div>
  )
}
