"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export function ApplyCoachForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [existingStatus, setExistingStatus] = useState<string | null>(null)
  const [teamName, setTeamName] = useState("")
  const [age, setAge] = useState("")
  const [is21, setIs21] = useState(false)
  const [liability, setLiability] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.id)
      const res = await fetch("/api/coach-applications/me")
      if (res.ok) {
        const json = await res.json()
        const app = json.application
        if (app) {
          setExistingStatus(app.status)
          setTeamName(app.team_name ?? "")
          setAge(String(app.age ?? ""))
          setIs21(!!app.is_age_21_plus)
          setLiability(!!app.liability_acknowledged)
        }
      }
      setLoading(false)
    })
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!userId) {
      router.push("/auth/login")
      return
    }
    const ageNum = parseInt(age, 10)
    if (Number.isNaN(ageNum) || ageNum < 13) {
      setMessage({ type: "err", text: "Enter a valid age (13+)." })
      return
    }
    if (!liability) {
      setMessage({ type: "err", text: "You must acknowledge the liability statement." })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/coach-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_name: teamName,
          age: ageNum,
          is_age_21_plus: is21,
          liability_acknowledged: true,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: "err", text: json.error ?? res.statusText })
        return
      }
      setMessage({ type: "ok", text: "Application submitted. Staff will review in the admin queue." })
      setExistingStatus("pending")
    } catch {
      setMessage({ type: "err", text: "Network error" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
          <CardDescription>Connect Discord to apply as a coach.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/auth/login">Sign in with Discord</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const locked = existingStatus === "approved" || existingStatus === "rejected"

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {message && (
        <Alert variant={message.type === "err" ? "destructive" : "default"}>
          <AlertTitle>{message.type === "ok" ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {existingStatus && (
        <p className="text-sm text-muted-foreground">
          Status: <strong className="text-foreground">{existingStatus}</strong>
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="team">Preferred team name</Label>
        <Input
          id="team"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          required
          minLength={2}
          disabled={locked}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          type="number"
          min={13}
          max={120}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
          disabled={locked}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is21"
          checked={is21}
          onCheckedChange={(v) => setIs21(v === true)}
          disabled={locked}
        />
        <Label htmlFor="is21" className="font-normal">
          I am 21 or older
        </Label>
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="liability"
          checked={liability}
          onCheckedChange={(v) => setLiability(v === true)}
          disabled={locked}
        />
        <Label htmlFor="liability" className="font-normal leading-snug">
          I acknowledge league liability and conduct expectations (placeholder — replace with your legal text).
        </Label>
      </div>

      <Button type="submit" disabled={submitting || locked} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit application"
        )}
      </Button>
    </form>
  )
}
