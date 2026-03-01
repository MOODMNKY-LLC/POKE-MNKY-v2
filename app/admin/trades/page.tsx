"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRightLeft, Check, X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"

interface TradeOffer {
  id: string
  offering_team_id: string
  receiving_team_id: string
  season_id: string
  offered_pokemon_ids: string[]
  requested_pokemon_ids: string[]
  status: string
  notes: string | null
  created_at: string
  processed_at: string | null
  offering_team?: { name: string }
  receiving_team?: { name: string }
}

export default function AdminTradesPage() {
  const router = useRouter()
  const [offers, setOffers] = useState<TradeOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login")
        return
      }
      supabase.from("profiles").select("role").eq("id", data.user.id).single().then(({ data: profile }) => {
        if (profile?.role !== "admin" && profile?.role !== "commissioner") {
          router.push("/admin")
          return
        }
        load()
      })
    })
  }, [router])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/league-trade-offers?status=accepted_pending_commissioner")
      if (!res.ok) return
      const data = await res.json()
      setOffers(data.offers ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function approveOrDeny(id: string, action: "approve" | "deny") {
    setActing(id)
    try {
      const res = await fetch(`/api/league-trade-offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setOffers((prev) => prev.filter((o) => o.id !== id))
      }
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade approval</h1>
          <p className="text-muted-foreground">
            Approve or deny trades awaiting commissioner approval. Trades execute at 12:00 AM Monday EST.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Pending approval
          </CardTitle>
          <CardDescription>
            Offers accepted by both coaches; one-click approve or deny.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : offers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No trades pending approval.</p>
          ) : (
            <ul className="space-y-4">
              {offers.map((offer) => (
                <li
                  key={offer.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{(offer as any).offering_team?.name ?? "Offering"}</span>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold">{(offer as any).receiving_team?.name ?? "Receiving"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {offer.offered_pokemon_ids?.length ?? 0} offered · {offer.requested_pokemon_ids?.length ?? 0} requested
                      {offer.notes && ` · ${offer.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveOrDeny(offer.id, "approve")}
                      disabled={acting !== null}
                    >
                      {acting === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => approveOrDeny(offer.id, "deny")}
                      disabled={acting !== null}
                    >
                      {acting === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                      Deny
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
