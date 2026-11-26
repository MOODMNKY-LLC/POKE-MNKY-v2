"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

const ACTIONS = [
  { label: "Draft budget", prompt: "What is the draft point budget?", tool: "aab_get_draft_rules" },
  { label: "Species clause", prompt: "Explain the species clause.", tool: "aab_search_rulebook" },
  { label: "Tera rules", prompt: "Explain the Tera Captain rules.", tool: "aab_get_battle_rules" },
  { label: "Constitution", prompt: "Summarize the league constitution.", tool: "aab_get_league_rules" },
] as const

type Excerpt = { text: string; source_title: string | null; source_url: string | null }
type SourceLink = { title: string; source_url: string; classification: string | null }

type Packet = {
  title?: string
  classification?: string
  source_url?: string
  note?: string
  error?: string
  sources?: Array<{ title?: string; source_url?: string }>
}

function plainLookupError(error: string) {
  if (!error.trim() || !error.includes(" ")) {
    return "Could not look that up. Please try again."
  }
  return error
}

export function AabKnowledgePanel({ enabled }: { enabled: boolean }) {
  const [prompt, setPrompt] = useState("")
  const [answer, setAnswer] = useState("")
  const [excerpts, setExcerpts] = useState<Excerpt[]>([])
  const [sources, setSources] = useState<SourceLink[]>([])
  const [packet, setPacket] = useState<Packet | null>(null)
  const [state, setState] = useState<"idle" | "loading" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [commissioner, setCommissioner] = useState(false)

  useEffect(() => {
    if (!enabled) return
    fetch("/api/ai/aab-knowledge")
      .then((response) => response.ok ? response.json() : null)
      .then((body) => setCommissioner(body?.role === "maus"))
      .catch(() => setCommissioner(false))
  }, [enabled])

  if (!enabled) return null

  async function ask(nextPrompt: string, tool?: string) {
    setState("loading")
    setError(null)
    setAnswer("")
    setPacket(null)
    setExcerpts([])
    setSources([])
    const response = await fetch("/api/ai/aab-knowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: nextPrompt, tool }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setState("error")
      setError(typeof body.error === "string" ? body.error : "request_failed")
      return
    }
    const body = await response.json()
    setPacket(body.packet || null)
    setAnswer(body.answer || "")
    setExcerpts(Array.isArray(body.excerpts) ? body.excerpts : [])
    setSources(Array.isArray(body.sources) ? body.sources : [])
    setState("idle")
  }

  return (
    <section className="border-b px-3 py-2" aria-label="League knowledge">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {ACTIONS.map((action) => (
          <Button
            key={action.tool}
            type="button"
            variant="outline"
            disabled={state === "loading"}
            className="h-11 min-h-11 shrink-0 rounded-full px-4"
            onClick={() => ask(action.prompt, action.tool)}
          >
            {action.label}
          </Button>
        ))}
      </div>
      {commissioner ? (
        <p className="pb-2 text-xs">
          <a className="underline" href="/dashboard/aab-drafts">Commissioner drafts</a>
        </p>
      ) : null}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (prompt.trim()) ask(prompt.trim())
        }}
      >
        <label className="sr-only" htmlFor="aab-knowledge-prompt">League question</label>
        <input
          id="aab-knowledge-prompt"
          className="min-h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about a league rule"
        />
        <Button type="submit" className="h-11 min-h-11" disabled={state === "loading" || !prompt.trim()}>
          {state === "loading" ? "Looking up" : "Ask"}
        </Button>
      </form>
      {state === "loading" ? <p className="mt-2 text-sm text-muted-foreground">Checking approved sources…</p> : null}
      {error ? <p className="mt-2 text-sm text-destructive">{plainLookupError(error)}</p> : null}
      {packet?.error === "not_configured" ? (
        <p className="mt-2 text-sm text-muted-foreground">Official page text is not loaded. This is not a ruling.</p>
      ) : null}
      {answer ? <p className="mt-2 whitespace-pre-wrap text-sm">{answer}</p> : null}
      {excerpts.length ? (
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {excerpts.map((excerpt, index) => (
            <li key={`${index}-${excerpt.text.slice(0, 24)}`}>
              <HoverCard>
                <HoverCardTrigger asChild>
                  {excerpt.source_url ? (
                    <a className="inline-flex min-h-11 items-center rounded-full border px-3 text-xs underline" href={excerpt.source_url}>
                      {excerpt.source_title || "Source"}
                    </a>
                  ) : (
                    <button type="button" className="inline-flex min-h-11 items-center rounded-full border px-3 text-xs">
                      {excerpt.source_title || "Source"}
                    </button>
                  )}
                </HoverCardTrigger>
                <HoverCardContent className="text-sm">
                  <p className="whitespace-pre-wrap">{excerpt.text}</p>
                </HoverCardContent>
              </HoverCard>
            </li>
          ))}
        </ul>
      ) : null}
      {sources.length ? (
        <ul className="mt-2 space-y-1 text-xs">
          {sources.map((source) => (
            <li key={source.source_url}>
              <a className="underline" href={source.source_url}>{source.title}</a>
              {source.classification ? <span className="text-muted-foreground"> · {source.classification}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
