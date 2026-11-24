"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

const ACTIONS = [
  { label: "Draft budget", prompt: "What is the draft point budget?", tool: "aab_get_draft_rules" },
  { label: "Species clause", prompt: "Explain the species clause.", tool: "aab_search_rulebook" },
  { label: "Tera rules", prompt: "Explain the Tera Captain rules.", tool: "aab_get_battle_rules" },
  { label: "Constitution", prompt: "Summarize the league constitution.", tool: "aab_get_league_rules" },
] as const

type Packet = {
  title?: string
  classification?: string
  source_url?: string
  note?: string
  error?: string
  sources?: Array<{ title?: string; source_url?: string }>
}

export function AabKnowledgePanel({ enabled }: { enabled: boolean }) {
  const [prompt, setPrompt] = useState("")
  const [answer, setAnswer] = useState("")
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
    const response = await fetch("/api/ai/aab-knowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: nextPrompt, tool }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setState("error")
      setError(body.error || "request_failed")
      return
    }
    const type = response.headers.get("content-type") || ""
    if (type.includes("application/json")) {
      const body = await response.json()
      setPacket(body.packet || null)
      setAnswer(body.answer || "")
      setState("idle")
      return
    }
    const reader = response.body?.getReader()
    if (!reader) {
      setState("error")
      setError("empty_response")
      return
    }
    const decoder = new TextDecoder()
    let text = ""
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      text += decoder.decode(chunk.value, { stream: true })
      setAnswer(text)
    }
    setState("idle")
  }

  const links = [
    packet?.source_url ? { title: packet.title || "Source", url: packet.source_url } : null,
    ...(packet?.sources || []).map((source) =>
      source.source_url ? { title: source.title || "Source", url: source.source_url } : null,
    ),
  ].filter((link): link is { title: string; url: string } => Boolean(link))

  return (
    <section className="border-b px-3 py-2" aria-label="League knowledge">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.tool}
            type="button"
            size="sm"
            variant="outline"
            disabled={state === "loading"}
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
          className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about a league rule"
        />
        <Button type="submit" size="sm" disabled={state === "loading" || !prompt.trim()}>
          {state === "loading" ? "Looking up" : "Ask"}
        </Button>
      </form>
      {state === "loading" ? <p className="mt-2 text-sm text-muted-foreground">Checking approved sources…</p> : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {packet?.error === "not_configured" ? (
        <p className="mt-2 text-sm text-muted-foreground">Official page text is not loaded. This is not a ruling.</p>
      ) : null}
      {answer ? <p className="mt-2 whitespace-pre-wrap text-sm">{answer}</p> : null}
      {links.length ? (
        <ul className="mt-2 space-y-1 text-xs">
          {links.map((link) => (
            <li key={link.url}>
              <a className="underline" href={link.url}>{link.title}</a>
              {packet?.classification ? <span className="text-muted-foreground"> · {packet.classification}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
