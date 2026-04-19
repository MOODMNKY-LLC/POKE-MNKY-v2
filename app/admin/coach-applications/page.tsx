"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { REJECTION_REASONS } from "@/lib/coach-applications/constants"
import { Loader2, ArrowLeft } from "lucide-react"

type Application = {
  id: string
  applicant_id: string
  team_name: string
  age: number
  is_age_21_plus: boolean
  liability_acknowledged: boolean
  discord_username: string | null
  status: string
  rejection_reason: string | null
  admin_notes: string | null
  spectator_only_offer: boolean
  created_at: string
}

export default function AdminCoachApplicationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Application[]>([])
  const [filter, setFilter] = useState<string>("pending")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [spectator, setSpectator] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)

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
      setLoading(false)
    })
  }, [router])

  const load = async () => {
    const q = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`
    const res = await fetch(`/api/coach-applications${q}`)
    if (!res.ok) return
    const json = await res.json()
    setRows(json.applications || [])
  }

  useEffect(() => {
    if (!loading) load()
  }, [loading, filter])

  async function patchStatus(id: string, status: string) {
    setSaving(id)
    try {
      const res = await fetch(`/api/coach-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          admin_notes: notes[id] || null,
          rejection_reason: status === "rejected" ? rejectReason[id] || "other" : null,
          spectator_only_offer: status === "rejected" ? !!spectator[id] : false,
        }),
      })
      if (res.ok) await load()
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Admin
        </Link>
      </Button>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Coach applications</h1>
      <p className="text-muted-foreground mb-6">Review submissions, approve coaches, or reject with spectator access.</p>

      <div className="mb-6 flex items-center gap-2">
        <Label>Filter</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="hold">Hold</SelectItem>
            <SelectItem value="follow_up">Follow up</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <CardTitle className="text-lg">{row.team_name}</CardTitle>
              <CardDescription>
                Discord: {row.discord_username ?? "—"} · Age {row.age}
                {row.is_age_21_plus ? " · 21+" : ""} · Submitted {new Date(row.created_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Status:</span> {row.status}
              </p>
              <div>
                <Label className="text-xs">Admin notes</Label>
                <Textarea
                  value={notes[row.id] ?? row.admin_notes ?? ""}
                  onChange={(e) => setNotes((m) => ({ ...m, [row.id]: e.target.value }))}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Label className="text-xs">Reject reason</Label>
                <Select
                  value={rejectReason[row.id] ?? "other"}
                  onValueChange={(v) => setRejectReason((m) => ({ ...m, [row.id]: v }))}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`sp-${row.id}`}
                  checked={spectator[row.id] ?? false}
                  onCheckedChange={(v) => setSpectator((m) => ({ ...m, [row.id]: v === true }))}
                />
                <Label htmlFor={`sp-${row.id}`} className="font-normal text-sm">
                  On reject: set profile to spectator-only
                </Label>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  disabled={saving === row.id}
                  onClick={() => patchStatus(row.id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={saving === row.id}
                  onClick={() => patchStatus(row.id, "rejected")}
                >
                  Reject
                </Button>
                <Button size="sm" variant="outline" disabled={saving === row.id} onClick={() => patchStatus(row.id, "hold")}>
                  Hold
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving === row.id}
                  onClick={() => patchStatus(row.id, "follow_up")}
                >
                  Follow up
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground text-sm">No applications in this filter.</p>}
      </div>
    </div>
  )
}
