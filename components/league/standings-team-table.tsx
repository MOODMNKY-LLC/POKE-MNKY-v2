import Link from "next/link"
import { PokeballIcon } from "@/components/ui/pokeball-icon"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Team } from "@/lib/types"

function formatDiff(value: number) {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value}`
}

function diffClassName(value: number) {
  if (value > 0) return "text-chart-2 font-medium"
  if (value < 0) return "text-destructive font-medium"
  return "text-muted-foreground"
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
        rank === 1 && "bg-primary text-primary-foreground",
        rank === 2 && "bg-primary/20 text-primary",
        rank === 3 && "bg-muted text-foreground",
        rank > 3 && "bg-muted/60 text-muted-foreground",
      )}
    >
      {rank}
    </span>
  )
}

function TeamMobileCard({ team, rank }: { team: Team; rank: number }) {
  const winPct =
    team.wins + team.losses > 0
      ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(0)
      : "—"

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <RankBadge rank={rank} />
          <div className="min-w-0">
            <Link
              href={`/teams/${team.id}`}
              className="block truncate font-semibold hover:text-primary transition-colors"
            >
              {team.name}
            </Link>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <PokeballIcon role="coach" size="xs" />
              <span className="truncate">{team.coach_name}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">
                {team.division}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {team.conference}
              </Badge>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums">
            {team.wins}-{team.losses}
          </p>
          <p className="text-xs text-muted-foreground">{winPct}% win</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Diff</dt>
          <dd className={cn("tabular-nums", diffClassName(team.differential))}>
            {formatDiff(team.differential)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">SoS</dt>
          <dd className="tabular-nums font-medium">
            {(team.strength_of_schedule ?? 0.5).toFixed(3)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function StandingsTeamTable({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No teams in this view yet.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-3 p-4 md:hidden">
        {teams.map((team, index) => (
          <TeamMobileCard key={team.id} team={team} rank={index + 1} />
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-14 pl-4">#</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="hidden lg:table-cell">Coach</TableHead>
              <TableHead className="text-center w-14">W</TableHead>
              <TableHead className="text-center w-14">L</TableHead>
              <TableHead className="text-center w-16">Diff</TableHead>
              <TableHead className="text-center w-20 pr-4">SoS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team, index) => (
              <TableRow key={team.id}>
                <TableCell className="pl-4">
                  <RankBadge rank={index + 1} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/teams/${team.id}`}
                    className="font-semibold hover:text-primary transition-colors"
                  >
                    {team.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground lg:hidden">
                    {team.coach_name}
                  </p>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <PokeballIcon role="coach" size="xs" />
                    {team.coach_name}
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold tabular-nums">
                  {team.wins}
                </TableCell>
                <TableCell className="text-center font-semibold tabular-nums">
                  {team.losses}
                </TableCell>
                <TableCell className={cn("text-center tabular-nums", diffClassName(team.differential))}>
                  {formatDiff(team.differential)}
                </TableCell>
                <TableCell className="text-center tabular-nums text-muted-foreground pr-4">
                  {(team.strength_of_schedule ?? 0.5).toFixed(3)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
