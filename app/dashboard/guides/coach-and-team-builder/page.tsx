import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Hammer, ArrowRight, BookOpen } from "lucide-react"

export default function CoachAndTeamBuilderGuidePage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard/guides">Guides</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Coach & team builder</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex-1 space-y-8 p-4 md:p-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Register as a coach and use the Team Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            How to become a coach in the league and build battle teams in the dashboard.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Part 1: Registering as a coach
            </CardTitle>
            <CardDescription>
              Coach status and team assignment are managed by the league.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                <strong>Join the league Discord.</strong> The league runs communication and announcements through Discord. Make sure you are in the server and have the appropriate roles if the league uses them for coaches.
              </li>
              <li>
                <strong>Contact the commissioner or admin.</strong> To be assigned as a coach, you need to be given the coach role and linked to a team. Reach out to the league manager or commissioner (e.g. via Discord) to request coach access. They will assign your account the coach role and, when applicable, link you to a team.
              </li>
              <li>
                <strong>Confirm in the dashboard.</strong> Once assigned, log in to the dashboard. You should see your league team under <strong>My League Team</strong> in the sidebar, with access to Roster, Free Agency, Trade Block, and Team Stats.
              </li>
            </ol>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/onboarding">
                <BookOpen className="mr-2 h-4 w-4" />
                Run coach onboarding
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5" />
              Part 2: Using the Team Builder
            </CardTitle>
            <CardDescription>
              Build and export Pokémon Showdown–style teams for battles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                <strong>Open the Team Builder.</strong> From the dashboard, go to <strong>Teams → Team Builder</strong>, or use the Quick Actions card and click &quot;Team Builder&quot;. You can also go directly to{" "}
                <Link href="/dashboard/teams/builder" className="text-primary hover:underline">
                  /dashboard/teams/builder
                </Link>
                .
              </li>
              <li>
                <strong>Name your team and set budget.</strong> Enter a team name at the top. The default budget is 120 points (matching the league draft budget). You can change it if you are building for a different format.
              </li>
              <li>
                <strong>Search and add Pokémon.</strong> Use the search box to find Pokémon. Click a Pokémon from the available list to add it to your team. The builder enforces a maximum of 10 Pokémon and keeps the total point cost within your budget.
              </li>
              <li>
                <strong>Remove or adjust.</strong> Remove a Pokémon by clicking the trash icon next to it in your team list. Adjust the budget or roster until you are satisfied.
              </li>
              <li>
                <strong>Save or export.</strong> Save the team to your library (if the option is available) or use the export button to download a Pokémon Showdown–format team file for use in battles or simulators.
              </li>
            </ol>
            <Button asChild>
              <Link href="/dashboard/teams/builder">
                <Hammer className="mr-2 h-4 w-4" />
                Open Team Builder
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/teams">My teams</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/teams/create">Create team</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/league-team">My league team</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/guides">All guides</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
