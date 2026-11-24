"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

type CopyCodeSnippetProps = {
  value: string
  label: string
}

export function CopyCodeSnippet({ value, label }: CopyCodeSnippetProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle")

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setStatus("copied")
    } catch {
      setStatus("failed")
    }
    window.setTimeout(() => setStatus("idle"), 2000)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 break-all rounded bg-muted px-2 py-1 font-mono text-sm">{value}</code>
      <Button type="button" variant="outline" size="sm" onClick={handleCopy} aria-label={`Copy ${label}`}>
        {status === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy"}
      </Button>
      <span className="sr-only" role="status">
        {status === "copied" ? `${label} copied to clipboard` : ""}
      </span>
    </div>
  )
}
