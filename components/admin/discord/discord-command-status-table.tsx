"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"

/** Mirrors getAllCommands() — keep in sync with lib/discord-commands/index.ts */
const COMMANDS = [
  { command: "/pick", api: "POST /api/discord/draft/pick", status: "working" as const },
  { command: "/search", api: "GET /api/discord/pokemon/search", status: "working" as const },
  { command: "/draftstatus", api: "In-process (getDraftStatusData)", status: "working" as const },
  { command: "/whoami", api: "In-process (getWhoamiData)", status: "working" as const },
  { command: "/setseason", api: "POST /api/discord/guild/config", status: "working" as const },
  { command: "/getseason", api: "GET /api/discord/guild/config", status: "working" as const },
  { command: "/coverage", api: "Draft status + notify/coverage", status: "working" as const },
  { command: "/calc", api: "POST /api/calc", status: "working" as const },
  { command: "/free-agency-submit", api: "POST /api/discord/free-agency/submit", status: "working" as const },
  { command: "/free-agency-status", api: "GET /api/discord/free-agency/team-status", status: "working" as const },
  {
    command: "/join-battles",
    api: "NetBird interactions (guild-only)",
    status: "working" as const,
  },
]

export function DiscordCommandStatusTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Slash Command Inventory</CardTitle>
        <CardDescription>
          Canonical list of all {COMMANDS.length} app-registered slash commands from{" "}
          <code className="text-xs">getAllCommands()</code>. See{" "}
          <Link href="/dashboard/guides/discord-slash-commands" className="text-primary hover:underline">
            Discord Slash Commands Reference
          </Link>{" "}
          for coach-facing details. Live Discord guild inventory requires a read-only Bot GET — not shown
          here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Command</TableHead>
              <TableHead>API</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMMANDS.map((row) => (
              <TableRow key={row.command}>
                <TableCell className="font-mono text-sm">{row.command}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.api}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.status === "working" ? "default" : "destructive"}
                    className="gap-1"
                  >
                    {row.status === "working" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {row.status === "working" ? "Working" : "Broken"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
