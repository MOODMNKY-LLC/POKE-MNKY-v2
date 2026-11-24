"use client"

import { useState } from "react"

const PROMPTS = [
  { tool: "aab_get_draft_rules", label: "Draft rules source" },
  { tool: "aab_get_battle_rules", label: "Battle rules source" },
  { tool: "aab_get_league_rules", label: "Constitution source" },
] as const

type Source = {
  title?: string
  classification?: string
  source_url?: string
  error?: string
  note?: string
}

export function AabKnowledgeCard({ enabled }: { enabled: boolean }) {
  const [source, setSource] = useState<Source | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!enabled) return null

  async function load(tool: string) {
    setError(null)
    const response = await fetch("/api/ai/aab-knowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool }),
    })
    const body = await response.json()
    if (!response.ok) {
      setSource(null)
      setError(body.error || "request_failed")
      return
    }
    setSource(body)
  }

  return (
    <section className="fixed bottom-24 right-4 z-40 w-72 rounded-md border bg-background p-3 text-sm shadow-md">
      <h2 className="font-medium">POKE MNKY sources</h2>
      <p className="mt-1 text-muted-foreground">Official pages are separate from recommendations. Nothing here is a ruling.</p>
      <div className="mt-2 flex flex-col gap-1">
        {PROMPTS.map((prompt) => (
          <button key={prompt.tool} className="rounded border px-2 py-1 text-left" type="button" onClick={() => load(prompt.tool)}>
            {prompt.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
      {source ? (
        <p className="mt-2">
          <span className="block">{source.title}</span>
          <span className="block text-muted-foreground">{source.classification}</span>
          {source.source_url ? <a className="underline" href={source.source_url}>{source.source_url}</a> : null}
          <span className="block text-muted-foreground">{source.note}</span>
        </p>
      ) : null}
    </section>
  )
}
