import { Card, CardContent } from "@/components/ui/card"

interface BracketMatchProps {
  match?: {
    id: string
    team1?: { name: string }
    team2?: { name: string }
    team1_score?: number
    team2_score?: number
    winner_id?: string
    team1_id: string
    team2_id: string
  }
  placeholder?: string
  bye?: boolean
}

export function BracketMatch({ match, placeholder, bye = false }: BracketMatchProps) {
  if (!match) {
    return (
      <Card className="w-full min-w-[200px] bg-muted/20">
        <CardContent className="p-3">
          <div className="text-center text-sm text-muted-foreground">{placeholder || "TBD"}</div>
        </CardContent>
      </Card>
    )
  }

  const hasResult = match.winner_id !== null

  return (
    <Card className="w-full min-w-[200px] transition-all hover:border-primary">
      <CardContent className="p-3 space-y-2">
        <div
          className={`flex items-center justify-between ${hasResult && match.winner_id === match.team1_id ? "font-bold text-foreground" : "text-muted-foreground"}`}
        >
          <span className="truncate text-sm">{match.team1?.name || "TBD"}</span>
          {hasResult && !bye && <span className="ml-2 font-bold">{match.team1_score}</span>}
          {bye && match.team1?.name?.startsWith("Bye") ? <span className="ml-2 text-xs">Bye</span> : null}
        </div>
        <div className="h-px bg-border" />
        <div
          className={`flex items-center justify-between ${hasResult && match.winner_id === match.team2_id ? "font-bold text-foreground" : "text-muted-foreground"}`}
        >
          <span className="truncate text-sm">{match.team2?.name || "TBD"}</span>
          {hasResult && !bye && <span className="ml-2 font-bold">{match.team2_score}</span>}
          {bye && match.team2?.name?.startsWith("Bye") ? <span className="ml-2 text-xs">Bye</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
