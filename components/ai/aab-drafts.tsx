"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

const KINDS = [
  { id: "pending", label: "Pending decisions" },
  { id: "points-call", label: "Points-call agenda" },
  { id: "recap", label: "Weekly recap draft" },
  { id: "clarification", label: "Rule clarification" },
] as const

export function AabDrafts() {
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("pending")
  const [question, setQuestion] = useState("")
  const [draft, setDraft] = useState("")
  const [sources, setSources] = useState<Array<{ title: string; source_url: string }>>([])
  const [state, setState] = useState<"idle" | "loading" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setState("loading")
    setError(null)
    setDraft("")
    setSources([])
    const response = await fetch("/api/ai/aab-drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, question }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setState("error")
      setError(body.error || "request_failed")
      return
    }
    const body = await response.json()
    setDraft(body.draft_text || "")
    setSources(Array.isArray(body.sources) ? body.sources : [])
    setState("idle")
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Commissioner drafts</h1>
        <p className="text-sm text-muted-foreground">
          Reviewable drafts only. Nothing here is published to Notion, Discord, or the league records.
        </p>
      </header>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Draft type">
        {KINDS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={kind === item.id ? "default" : "outline"}
            onClick={() => setKind(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm" htmlFor="aab-draft-question">
        Optional focus
        <textarea
          id="aab-draft-question"
          className="min-h-20 rounded-md border bg-background p-2"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>
      <Button type="button" onClick={generate} disabled={state === "loading"}>
        {state === "loading" ? "Drafting" : "Generate draft"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {draft ? (
        <article className="whitespace-pre-wrap rounded-md border p-3 text-sm" aria-live="polite">
          {draft}
        </article>
      ) : null}
      {sources.length ? (
        <ul className="space-y-1 text-xs">
          {sources.map((source) => (
            <li key={source.source_url}>
              <a className="underline" href={source.source_url}>{source.title}</a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
