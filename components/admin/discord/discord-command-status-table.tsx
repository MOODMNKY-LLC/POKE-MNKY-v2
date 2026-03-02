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

const COMMANDS = [
  { command: "/pick", api: "POST /api/discord/draft/pick", status: "working" },
  { command: "/search", api: "GET /api/discord/pokemon/search", status: "working" },
  { command: "/draftstatus", api: "In-process (getDraftStatusData)", status: "working" },
  { command: "/whoami", api: "In-process (getWhoamiData)", status: "working" },
  { command: "/setseason", api: "POST /api/discord/guild/config", status: "working" },
  { command: "/getseason", api: "GET /api/discord/guild/config", status: "working" },
  { command: "/coverage", api: "GET /api/draft/status + POST /api/discord/notify/coverage", status: "working" },
  { command: "/calc", api: "POST /api/calc", status: "working" },
  { command: "/free-agency-submit", api: "POST /api/discord/free-agency/submit", status: "working" },
  { command: "/free-agency-status", api: "GET /api/discord/free-agency/team-status", status: "working" },
] as const

export function DiscordCommandStatusTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Slash Command Inventory</CardTitle>
        <CardDescription>
          Canonical list of all 10 slash commands. See{" "}
          <Link href="/dashboard/guides/discord-slash-commands" className="text-primary hover:underline">
            Discord Slash Commands Reference
          </Link>{" "}
          for full details and E2E testing.
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
