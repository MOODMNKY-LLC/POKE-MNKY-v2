"use client"

import { TeamDisplayShowdown } from "@/components/showdown/team-display-showdown"
import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import { toast } from "sonner"
import type { ParsedPokemon } from "@/lib/team-parser"

interface TeamDisplayShowdownClientProps {
  team: {
    id: string
    team_name: string
    format?: string
    generation?: number
    canonical_text: string
    team_text: string
    pokemon_data: unknown[]
  }
  isStock: boolean
}

export function TeamDisplayShowdownClient({ team, isStock }: TeamDisplayShowdownClientProps) {
  const pokemon = (team.pokemon_data || []) as ParsedPokemon[]
  const hasPokemonData = Array.isArray(pokemon) && pokemon.length > 0

  const handleCopy = () => {
    const text = team.canonical_text || team.team_text
    if (text) {
      navigator.clipboard.writeText(text)
      toast.success("Team copied to clipboard")
    } else {
      toast.error("No team text to copy")
    }
  }

  const handleDownload = () => {
    const text = team.canonical_text || team.team_text
    if (text) {
      const blob = new Blob([text], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${(team.team_name || "team").replace(/\s+/g, "-")}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Team file downloaded")
    } else {
      toast.error("No team text to download")
    }
  }

  return (
    <div className="space-y-4">
      {hasPokemonData ? (
        <TeamDisplayShowdown
          pokemon={pokemon}
          format={team.format ?? "ou"}
          generation={team.generation ?? 9}
          teamName={team.team_name}
          readOnly={true}
        />
      ) : (
        <div className="rounded-lg border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap text-sm font-mono overflow-x-auto">
            {team.team_text || team.canonical_text || "No team export text available."}
          </pre>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy export
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download .txt
        </Button>
        {!isStock && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/dashboard/teams/builder?load=${team.id}`}>Use in Builder</a>
          </Button>
        )}
      </div>
    </div>
  )
}
