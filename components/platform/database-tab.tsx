"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface DatabaseTabProps {
  projectRef: string
}

export function DatabaseTab({ projectRef }: DatabaseTabProps) {
  const [query, setQuery] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const runQuery = async () => {
    if (!query.trim()) {
      toast.error("Please enter a SQL query")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/supabase-proxy/v1/projects/${projectRef}/database/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          read_only: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Query failed")
      }

      const data = await response.json()
      setResults(data)
      toast.success("Query executed successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to run query")
    } finally {
      setLoading(false)
    }
  }

  const generateSQL = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch("/api/ai/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          projectRef,
        }),
      })

      if (!response.ok) {
        throw new Error("AI generation failed")
      }

      const data = await response.json()
      setQuery(data.sql)
      toast.success("SQL generated successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to generate SQL")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">AI SQL Generator</h3>
        <div className="flex gap-2">
          <Textarea
            placeholder="Describe what you want to query (e.g., 'Show me all teams with win rates above 50%')"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
          />
          <Button onClick={generateSQL} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">SQL Query</h3>
        <Textarea
          placeholder="SELECT * FROM teams LIMIT 10;"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={8}
          className="font-mono text-sm"
        />
        <Button onClick={runQuery} disabled={loading} className="mt-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Run Query
        </Button>
      </Card>

      {results && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">Results</h3>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
            {JSON.stringify(results, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  )
}
