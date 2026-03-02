import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import { redirect } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { User, Bell, Sliders, BookOpen } from "lucide-react"
import { RestartOnboardingButton } from "@/components/dashboard/restart-onboarding-button"
import { ThemeSwitcher } from "@/components/theme-switcher"

export const dynamic = "force-dynamic"

type SearchParams = { tab?: string }

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) {
    redirect("/auth/login")
  }

  const { tab } = await searchParams
  const defaultTab = ["account", "notifications", "preferences", "guides"].includes(tab ?? "")
    ? tab!
    : "account"

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
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Account, notifications, preferences, and guides</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account" className="gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Sliders className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="guides" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Guides
            </TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Manage your account and profile. Edit display name and details from your profile page.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/profile" className="text-sm text-primary hover:underline">
                  Go to Profile
                </Link>
              </CardContent>
            </Card>
            {profile.onboarding_completed && (
              <Card>
                <CardHeader>
                  <CardTitle>Coach onboarding</CardTitle>
                  <CardDescription>Run the coach onboarding flow again from the start.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RestartOnboardingButton />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="notifications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Notification preferences are coming soon. You will be able to choose how and when to receive match reminders and league updates.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Check back later.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="preferences" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Appearance and default views.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">Light, dark, or system</p>
                  </div>
                  <ThemeSwitcher />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="guides" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard guide</CardTitle>
                <CardDescription>
                  How to use the player and coach dashboard, teams, league features, and settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                <section>
                  <h3 className="font-semibold mb-2">Overview and sidebar</h3>
                  <p className="text-muted-foreground mb-2">
                    The dashboard <Link href="/dashboard" className="text-primary hover:underline">Overview</Link> shows your welcome message, role, and quick links. Use the sidebar to open <strong>Teams</strong> (Showdown and league), <strong>Draft</strong>, <strong>Weekly Matches</strong>, and <strong>Settings</strong>. Coaches also see <strong>My League Team</strong> with Roster, Free Agency, and Trade Block.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">Teams</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><strong>My Teams</strong> — Your saved Showdown-format teams. <Link href="/dashboard/teams" className="text-primary hover:underline">View</Link>.</li>
                    <li><strong>Team Library</strong> — Browse stock teams. <Link href="/dashboard/teams/library" className="text-primary hover:underline">Library</Link>.</li>
                    <li><strong>Create Team</strong> — Start a new team from scratch. <Link href="/dashboard/teams/create" className="text-primary hover:underline">Create</Link>.</li>
                    <li><strong>Upload Team</strong> — Paste or upload a Showdown export. <Link href="/dashboard/teams/upload" className="text-primary hover:underline">Upload</Link>.</li>
                    <li><strong>Team Builder</strong> — Build a team with point budget and save to your library. <Link href="/dashboard/teams/builder" className="text-primary hover:underline">Builder</Link>.</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">League (coaches)</h3>
                  <p className="text-muted-foreground mb-2">
                    Under <strong>My League Team</strong>: view your drafted roster, use the <strong>Roster</strong> page with the week selector to see the locked roster for the current week (and future weeks after trades/FA). <strong>Free Agency</strong> and <strong>Trade Block</strong> let you add/drop and propose trades. All trades and free agency moves execute at <strong>12:00 AM Monday EST</strong>; the current week&apos;s roster is locked until then.
                  </p>
                  <p className="text-muted-foreground">
                    <Link href="/dashboard/league-team" className="text-primary hover:underline">My League Team</Link> · <Link href="/dashboard/free-agency" className="text-primary hover:underline">Free Agency</Link> · <Link href="/dashboard/trade-block" className="text-primary hover:underline">Trade Block</Link>
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">Draft and weekly matches</h3>
                  <p className="text-muted-foreground mb-2">
                    <strong>Draft</strong>: use Draft Planning and Draft Board to prepare and follow the draft. <strong>Weekly Matches</strong>: view the schedule, submit match results, and see history.
                  </p>
                  <p className="text-muted-foreground">
                    <Link href="/dashboard/draft" className="text-primary hover:underline">Draft</Link> · <Link href="/dashboard/weekly-matches" className="text-primary hover:underline">Weekly Matches</Link>
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">Settings</h3>
                  <p className="text-muted-foreground">
                    Here you can manage your account, notifications (when available), theme and preferences, and restart coach onboarding. This Guides tab is the place for dashboard help.
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">References</h3>
                  <p className="text-muted-foreground mb-2">
                    Full guides and documentation you can open from the app:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      <Link href="/dashboard/guides/league-features-v3" className="text-primary hover:underline">
                        League Features Guide (v3)
                      </Link>
                      {" "}
                      — How to use Trade Block, Trade Offers, Free Agency, Tera Captains, midnight execution, and weekly roster view (all CHATGPT-V3 features built in app).
                    </li>
                    <li>
                      <Link href="/dashboard/guides/discord-integration" className="text-primary hover:underline">
                        Discord Integration Guide
                      </Link>
                      {" "}
                      — Webhooks, bot commands, channel mapping, what’s working vs. gaps, and how to configure the league Discord server.
                    </li>
                    <li>
                      Dashboard guide (above) — Overview, sidebar, Teams, League, Draft, Weekly Matches.
                    </li>
                  </ul>
                  <p className="text-muted-foreground mt-2 text-xs">
                    In the project repo: <code className="rounded bg-muted px-1">docs/LEAGUE-FEATURES-GUIDE-V3.md</code>, <code className="rounded bg-muted px-1">docs/DISCORD-INTEGRATION-GUIDE.md</code>, <code className="rounded bg-muted px-1">docs/DISCORD-SERVER-INTEGRATION-REPORT.md</code>, <code className="rounded bg-muted px-1">docs/DISCORD-SERVER-MAP.md</code>, <code className="rounded bg-muted px-1">CHATGPT-V3-UPDATE.md</code>.
                  </p>
                </section>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
