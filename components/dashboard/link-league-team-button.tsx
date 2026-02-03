"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Link2, Unlink, Swords, Loader2 } from "lucide-react"

interface LinkLeagueTeamButtonProps {
  showdownTeamId: string
  isLinked: boolean
  /** Optional: show "Use for match" link when linked */
  showUseForMatch?: boolean
}

/**
 * Coach-only action: link this Showdown team to your league team (for use in matches)
 * or unlink. When linked, optionally show "Use for match" link to weekly matches.
 */
export function LinkLeagueTeamButton({
  showdownTeamId,
  isLinked,
  showUseForMatch = true,
}: LinkLeagueTeamButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLink() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dashboard/showdown-teams/${showdownTeamId}/link-league-team`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unlink: false }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Failed to link team")
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleUnlink() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dashboard/showdown-teams/${showdownTeamId}/link-league-team`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unlink: true }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Failed to unlink team")
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (isLinked) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          Linked to league team
        </span>
        {showUseForMatch && (
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/weekly-matches">
              <Swords className="mr-1 h-3 w-3" />
              Use for match
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUnlink}
          disabled={loading}
          className="text-muted-foreground"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Unlink className="mr-1 h-3 w-3" />
              Unlink
            </>
          )}
        </Button>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleLink}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <Link2 className="mr-1 h-3 w-3" />
            Link to league team
          </>
        )}
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  )
}
