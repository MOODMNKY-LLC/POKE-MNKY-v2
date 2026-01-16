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

  // Validate and extract projectRef
  const getValidProjectRef = () => {
    // First, use the prop if it's valid
    if (projectRef && projectRef !== "default" && projectRef !== "") {
      return projectRef
    }
    
    // Fallback: try to extract from environment variable
    // Note: NEXT_PUBLIC_ vars are available at runtime in client components
    if (typeof window === 'undefined') return projectRef || "" // Skip during SSR
    
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const isLocal = envUrl.includes("localhost") || envUrl.includes("127.0.0.1")
    
    if (isLocal) {
      // For local development, check for explicit override
      const explicitRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF
      if (explicitRef) return explicitRef
      // Otherwise return "local" as marker (Management API won't work)
      return "local"
    }
    
    if (envUrl) {
      const ref = envUrl.split("//")[1]?.split(".")[0] || ""
      if (ref && ref !== "default") return ref
    }
    
    // Last resort: return the original prop (even if invalid, for error handling)
    return projectRef || ""
  }

  // Only call getValidProjectRef when needed (not during SSR)
  const validProjectRef = typeof window !== 'undefined' ? getValidProjectRef() : projectRef || ""

  // Clean SQL from markdown code blocks and extra whitespace
  const cleanSQL = (sql: string): string => {
    return sql
      .replace(/^```(?:sql)?\s*/i, "") // Remove opening ```sql or ```
      .replace(/\s*```$/i, "") // Remove closing ```
      .trim()
  }

  const runQuery = async () => {
    const cleanedQuery = cleanSQL(query)
    
    if (!cleanedQuery.trim()) {
      toast.error("Please enter a SQL query")
      return
    }

    if (!validProjectRef || validProjectRef === "default") {
      toast.error("Project reference not configured. Check NEXT_PUBLIC_SUPABASE_URL.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/supabase-proxy/v1/projects/${validProjectRef}/database/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: cleanedQuery,
          read_only: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || errorData.message || `Query failed: ${response.status}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Handle different response formats from Management API
      // Response might be: { result: [...] } or directly an array
      let queryResults = data
      if (data.result !== undefined) {
        queryResults = data.result
      } else if (data.data !== undefined) {
        queryResults = data.data
      } else if (Array.isArray(data)) {
        queryResults = data
      }
      
      setResults(queryResults)
      
      // Show appropriate message based on results
      if (Array.isArray(queryResults)) {
        if (queryResults.length === 0) {
          toast.info("Query executed successfully but returned no results")
        } else {
          toast.success(`Query executed successfully. Returned ${queryResults.length} row(s)`)
        }
      } else {
        toast.success("Query executed successfully")
      }
    } catch (error: any) {
      console.error("Query error:", error)
      const errorMessage = error.message || "Failed to run query"
      toast.error(errorMessage)
      setResults(null)
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
      if (!validProjectRef || validProjectRef === "default") {
        toast.error("Project reference not configured. Check NEXT_PUBLIC_SUPABASE_URL.")
        return
      }

      if (validProjectRef === "local") {
        toast.error("AI SQL generation requires Management API, which is not available for local Supabase. Set NEXT_PUBLIC_SUPABASE_PROJECT_REF to your production project ref.")
        return
      }

      const response = await fetch("/api/ai/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          projectRef: validProjectRef,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || errorData.message || "AI generation failed"
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Clean the SQL before setting it (in case API didn't clean it)
      const cleanedSQL = cleanSQL(data.sql || "")
      setQuery(cleanedSQL)
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

      {results !== null && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">
            Results
            {Array.isArray(results) && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({results.length} row{results.length !== 1 ? "s" : ""})
              </span>
            )}
          </h3>
          {Array.isArray(results) && results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <p>Query executed successfully but returned no results.</p>
              <p className="text-xs">Tip: Check table/column names. Common tables: <code className="bg-muted px-1 rounded">pokepedia_pokemon</code>, <code className="bg-muted px-1 rounded">pokemon</code>, <code className="bg-muted px-1 rounded">teams</code></p>
            </div>
          ) : (
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
              {JSON.stringify(results, null, 2)}
            </pre>
          )}
        </Card>
      )}
    </div>
  )
}
