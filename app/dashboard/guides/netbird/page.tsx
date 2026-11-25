import type { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Network, ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import {
  DNS_SUFFIX,
  DOCS_LINKS,
  GAME_NETWORK_NAME,
  GAME_SERVER_ADDRESS,
  GAME_SERVER_PORT,
  GAME_SERVER_PROTOCOL,
  GROUP_DISPLAY_NAME,
  INSTALL_LINKS,
  MANAGEMENT_URL,
  RYUBING_LDN_GUIDE_URL,
} from "@/lib/netbird/onboarding"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CopyCodeSnippet } from "@/components/dashboard/netbird/copy-code-snippet"
import { NetbirdChecklist } from "@/components/dashboard/netbird/netbird-checklist"
import { RequestAccessCard } from "@/components/dashboard/netbird/request-access-card"
import { NETBIRD_REQUEST_COLUMNS, type NetbirdAccessRequest } from "@/lib/netbird/access-requests"

export const dynamic = "force-dynamic"

const LOGIN_REDIRECT = "/auth/login?next=/dashboard/guides/netbird"

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {children}
    </a>
  )
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
}

function StepTitle({ step, children }: { step: number; children: ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2">
      <Badge variant="secondary" aria-hidden="true">
        {step}
      </Badge>
      <span>
        <span className="sr-only">Step {step}: </span>
        {children}
      </span>
    </CardTitle>
  )
}

function OsTabList() {
  return (
    <TabsList className="flex h-auto w-full flex-wrap justify-start">
      <TabsTrigger value="windows">Windows</TabsTrigger>
      <TabsTrigger value="macos">macOS</TabsTrigger>
      <TabsTrigger value="ios">iPhone &amp; iPad</TabsTrigger>
      <TabsTrigger value="android">Android</TabsTrigger>
    </TabsList>
  )
}

const TROUBLESHOOTING: ReadonlyArray<{ title: string; body: ReactNode }> = [
  {
    title: "No invite, or the link expired",
    body: (
      <>
        Invite links often expire after a few days. Ask Simeon to send a new one. Do not sign up on your own.
      </>
    ),
  },
  {
    title: "The app connects to NetBird Cloud instead of us",
    body: (
      <>
        Set the server URL again: choose Self-hosted on desktop, Change Server on a phone, or Settings → Profiles on
        desktop if the app is already set up. Use <Code>{MANAGEMENT_URL}</Code>.
      </>
    ),
  },
  {
    title: "The browser never opens, or sign-in loops",
    body: (
      <>
        Confirm the server URL is exactly <Code>{MANAGEMENT_URL}</Code>, then try Connect again. On the login page,
        choose Continue with Email and use the email address your invite was sent to.
      </>
    ),
  },
  {
    title: "My MFA code is rejected",
    body: (
      <>
        Use the same authenticator you enrolled. If you lost it, ask Simeon to reset MFA. Do not create a second
        account.
      </>
    ),
  },
  {
    title: "I am connected but battles do not work",
    body: (
      <>
        Confirm the app shows Connected and that you are using the league game server address{" "}
        <Code>{GAME_SERVER_ADDRESS}</Code> only. Then contact Simeon.
      </>
    ),
  },
  {
    title: "I already have NetBird",
    body: (
      <>
        Still switch this device to our server. Do not add a second account or profile on the same device.
      </>
    ),
  },
]

export default async function NetbirdGuidePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(LOGIN_REDIRECT)
  }

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) {
    redirect(LOGIN_REDIRECT)
  }

  const { data: latestRequest, error: requestError } = await supabase
    .from("netbird_access_requests")
    .select(NETBIRD_REQUEST_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

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
                <Link href="/dashboard/settings?tab=guides">Guides</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>NetBird</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex max-w-3xl flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-2">
          <Network className="mt-1 h-6 w-6 shrink-0 text-muted-foreground" />
          <div>
            <h1 className="text-balance text-2xl font-bold tracking-tight">
              Join the Average At Best battle network
            </h1>
            <p className="text-sm text-muted-foreground">
              Connect to the {GROUP_DISPLAY_NAME} private network with NetBird so you can reach the league game
              server for battles.
            </p>
          </div>
        </div>

        <Alert>
          <ShieldAlert />
          <AlertTitle>Please read before you start</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              <li>This private network is only for league battles.</li>
              <li>
                Simeon approves each member. After approval, your invite is sent to you personally (for example by
                Discord DM). There is no open sign-up.
              </li>
              <li>Do not share your invite, password, or authenticator codes.</li>
              <li>Do not turn on an exit node or route advertising.</li>
              <li>Do not add a second NetBird account or profile on the same device.</li>
              <li>
                You can reach only the league game server (address below):{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{GAME_SERVER_ADDRESS}</code>{" "}
                ({GAME_NETWORK_NAME}, {GAME_SERVER_PROTOCOL} {GAME_SERVER_PORT}).
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <RequestAccessCard
          initialRequest={(latestRequest as NetbirdAccessRequest | null) ?? null}
          unavailable={Boolean(requestError)}
        />

        <Card>
          <CardHeader>
            <CardTitle>Before you begin</CardTitle>
            <CardDescription>Have these ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                A personal invite from the league, sent to you after Simeon approves your request (for example by
                Discord DM), with a link to our NetBird server. The Request access button does not send it.
              </li>
              <li>An authenticator app (Google Authenticator, Authy, 1Password, or similar) for MFA.</li>
              <li>
                Admin rights on your computer to install the app, or the App Store / Google Play on your phone.
              </li>
              <li>
                Do not create an account on the login page yourself. If you were not invited, stop and contact
                Simeon.
              </li>
            </ul>
          </CardContent>
        </Card>

        <NetbirdChecklist />

        <Card>
          <CardHeader>
            <StepTitle step={1}>Accept your invite and set a password</StepTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Open the invite link from the league. It goes to <Code>{MANAGEMENT_URL}</Code> (the path looks like{" "}
                <Code>/invite?token=…</Code>).
              </li>
              <li>Set your own password (at least 8 characters). Save it in a password manager.</li>
              <li>
                If the NetBird login page asks how to sign in, choose <strong>Continue with Email</strong> and use the
                email address your invite was sent to.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <StepTitle step={2}>Set up MFA</StepTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            When asked, scan the MFA QR code with your authenticator app, enter the one-time code, and tap Verify.
            You will need that app on later sign-ins.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <StepTitle step={3}>Install NetBird</StepTitle>
            <CardDescription>Pick your device.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="windows">
              <OsTabList />
              <TabsContent value="windows" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  Download the{" "}
                  <ExternalLink href={INSTALL_LINKS.windows.exe}>EXE installer</ExternalLink> (or the{" "}
                  <ExternalLink href={INSTALL_LINKS.windows.msi}>MSI</ExternalLink>). Run it, then open a new
                  terminal if you use commands.
                </p>
                <p>
                  <ExternalLink href={DOCS_LINKS.windows}>Official Windows install docs</ExternalLink>
                </p>
              </TabsContent>
              <TabsContent value="macos" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  Download for{" "}
                  <ExternalLink href={INSTALL_LINKS.macos.appleSilicon}>Apple Silicon</ExternalLink> or{" "}
                  <ExternalLink href={INSTALL_LINKS.macos.intel}>Intel</ExternalLink>, or follow the macOS docs.
                  The app installs to <Code>/Applications</Code>.
                </p>
                <p>
                  <ExternalLink href={DOCS_LINKS.macos}>Official macOS install docs</ExternalLink>
                </p>
              </TabsContent>
              <TabsContent value="ios" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  Install NetBird from the{" "}
                  <ExternalLink href={INSTALL_LINKS.ios.appStore}>App Store</ExternalLink>.
                </p>
                <p>
                  <ExternalLink href={DOCS_LINKS.ios}>Official iOS install docs</ExternalLink>
                </p>
              </TabsContent>
              <TabsContent value="android" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  Android 8.0 or newer. Install NetBird on{" "}
                  <ExternalLink href={INSTALL_LINKS.android.playStore}>Google Play</ExternalLink>.
                </p>
                <p>
                  <ExternalLink href={DOCS_LINKS.android}>Official Android install docs</ExternalLink>
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <StepTitle step={4}>Connect to our server</StepTitle>
            <CardDescription>Point the app at the league server, then sign in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Server URL</p>
              <CopyCodeSnippet value={MANAGEMENT_URL} label="server URL" />
            </div>
            <Tabs defaultValue="windows">
              <OsTabList />
              <TabsContent value="windows" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <DesktopConnectSteps />
              </TabsContent>
              <TabsContent value="macos" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <DesktopConnectSteps />
              </TabsContent>
              <TabsContent value="ios" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Open <strong>Settings → Change Server</strong> and confirm if it warns that this erases the
                    current config.
                  </li>
                  <li>
                    Enter <Code>{MANAGEMENT_URL}</Code> and apply.
                  </li>
                  <li>Tap Connect. Allow the VPN permission when asked.</li>
                  <li>
                    When the NetBird login page opens, choose <strong>Continue with Email</strong> and use the email
                    address your invite was sent to. Then enter your password and authenticator code.
                  </li>
                </ol>
                <MnkyIdNote />
                <p className="text-xs">Menu names can differ slightly by app version.</p>
              </TabsContent>
              <TabsContent value="android" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    On first launch the app may say it is using the default server. Tap Continue, then open the
                    top-left menu and choose Change Server.
                  </li>
                  <li>
                    Confirm, enter <Code>{MANAGEMENT_URL}</Code>, and tap Change.
                  </li>
                  <li>Tap the NetBird logo to connect and allow the VPN.</li>
                  <li>
                    When the NetBird login page opens, choose <strong>Continue with Email</strong> and use the email
                    address your invite was sent to. Then enter your password and authenticator code.
                  </li>
                </ol>
                <MnkyIdNote />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <StepTitle step={5}>Verify you are in</StepTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                On desktop, the status shows Connected, the tray or menu-bar icon is green, and the app shows a
                NetBird IP. Optional: run <Code>netbird status</Code>.
              </li>
              <li>
                Your device name looks like <Code>something.{DNS_SUFFIX}</Code>.
              </li>
              <li>You do not need to wait for device approval.</li>
              <li>
                You should be able to reach the league game server ({GAME_NETWORK_NAME}) at{" "}
                <Code>{GAME_SERVER_ADDRESS}</Code> over {GAME_SERVER_PROTOCOL}. You should not have access to other
                private machines.
              </li>
              <li>Leave exit node unselected.</li>
              <li>
                In Ryujinx&apos;s multiplayer settings, set the LDN server to <Code>{GAME_SERVER_ADDRESS}</Code>. In
                Ryujinx (Ryubing), go to Options → Settings → Multiplayer and set Mode to RyuLDN (also labeled Ryujinx
                Ldn).{" "}
                <a
                  href={RYUBING_LDN_GUIDE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Ryubing LDN guide
                </a>
                . Menu names can differ slightly by app version.
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Troubleshooting</h2>
          <div className="grid gap-3">
            {TROUBLESHOOTING.map((item) => (
              <Card key={item.title} className="gap-2 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 text-sm text-muted-foreground">{item.body}</CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How to leave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              To disconnect for now, click Disconnect in the app, or run <Code>netbird down</Code>.
            </p>
            <p>
              To leave the league network, disconnect, then uninstall: Add/Remove Programs on Windows, remove
              NetBird from <Code>/Applications</Code> on macOS, or delete the app on your phone. Ask Simeon to
              remove your user and device. Logging out of the profile also removes that device from the account.
            </p>
            <p>Do not delete or change anything in the NetBird dashboard beyond your own password.</p>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          More about the desktop app:{" "}
          <ExternalLink href={DOCS_LINKS.desktopApp}>NetBird desktop app docs</ExternalLink>
        </p>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/settings?tab=guides" className="text-primary hover:underline">
            ← Back to Settings → Guides and References
          </Link>
        </p>
      </div>
    </>
  )
}

function MnkyIdNote() {
  return (
    <p className="text-xs">
      Don&apos;t use <strong>Continue with MNKY ID</strong> unless the league tells you to.
    </p>
  )
}

function DesktopConnectSteps() {
  return (
    <>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Open NetBird. On first launch choose <strong>Self-hosted</strong> and enter <Code>{MANAGEMENT_URL}</Code>.
        </li>
        <li>
          If the app is already set to NetBird Cloud, go to <strong>Settings → Profiles</strong>, add or edit a
          profile, and set that same URL.
        </li>
        <li>Click Connect.</li>
        <li>
          A browser window opens with the NetBird login page. Choose <strong>Continue with Email</strong> and use
          the email address your invite was sent to. Then enter your password and authenticator code.
        </li>
      </ol>
      <MnkyIdNote />
    </>
  )
}
