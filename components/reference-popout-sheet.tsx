"use client"

import * as React from "react"
import Link from "next/link"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import ReactMarkdown from "react-markdown"
import { BookOpen, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type ReferencePopoutVariant = "league" | "dashboard" | null

interface ReferencePopoutSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: ReferencePopoutVariant
  onOpenLeagueInPopout?: () => void
}

export function ReferencePopoutSheet({
  open,
  onOpenChange,
  variant,
  onOpenLeagueInPopout,
}: ReferencePopoutSheetProps) {
  const [content, setContent] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || variant !== "league") {
      setContent(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    fetch("/api/guides/league-features-v3")
      .then((res) => res.json())
      .then((data) => {
        setContent(data?.content ?? "")
      })
      .catch(() => setError("Could not load guide."))
      .finally(() => setLoading(false))
  }, [open, variant])

  const isLeague = variant === "league"
  const isDashboard = variant === "dashboard"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col p-0 sm:max-w-sm",
          isLeague && "sm:max-w-xl md:max-w-2xl"
        )}
        aria-describedby={undefined}
      >
        {isLeague && (
          <>
            <SheetHeader className="shrink-0 border-b px-4 py-3 text-left">
              <SheetTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                League Features Guide (v3)
              </SheetTitle>
              <SheetDescription id="league-guide-desc">
                Trade Block, Trade Offers, Free Agency, Tera Captains, and more
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {error && (
                <p className="text-sm text-destructive py-4">{error}</p>
              )}
              {!loading && !error && content && (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-a:underline"
                  aria-labelledby="league-guide-desc"
                >
                  <ReactMarkdown
                    components={{
                      a: ({ href, children, ...props }) => {
                        if (href?.startsWith("/")) {
                          return (
                            <Link href={href} {...props}>
                              {children}
                            </Link>
                          )
                        }
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          >
                            {children}
                          </a>
                        )
                      },
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        )}
        {isDashboard && (
          <>
            <SheetHeader className="shrink-0 border-b px-4 py-3 text-left">
              <SheetTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Dashboard Guides &amp; References
              </SheetTitle>
              <SheetDescription>
                Quick links to guides and reference docs
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ul className="space-y-3 text-sm">
                <li>
                  {onOpenLeagueInPopout ? (
                    <button
                      type="button"
                      onClick={onOpenLeagueInPopout}
                      className="text-primary hover:underline font-medium"
                    >
                      League Features Guide (v3) — open in popout
                    </button>
                  ) : (
                    <Link
                      href="/dashboard/guides/league-features-v3"
                      className="text-primary hover:underline font-medium"
                    >
                      League Features Guide (v3)
                    </Link>
                  )}
                  <p className="text-muted-foreground mt-0.5">
                    Trade Block, Trade Offers, Free Agency, Tera Captains, midnight execution, weekly roster
                  </p>
                </li>
                <li>
                  <Link
                    href="/dashboard/guides/discord-integration"
                    className="text-primary hover:underline font-medium"
                  >
                    Discord Integration Guide
                  </Link>
                  <p className="text-muted-foreground mt-0.5">
                    Webhooks, bot commands, channel mapping, integration status
                  </p>
                </li>
                <li>
                  <Link
                    href="/dashboard/settings?tab=guides"
                    className="text-primary hover:underline font-medium"
                  >
                    Dashboard guide (Settings → Guides)
                  </Link>
                  <p className="text-muted-foreground mt-0.5">
                    Overview, sidebar, Teams, League, Draft, Weekly Matches
                  </p>
                </li>
              </ul>
              <p className="text-muted-foreground text-xs mt-4">
                In the repo: <code className="rounded bg-muted px-1">docs/LEAGUE-FEATURES-GUIDE-V3.md</code>,{" "}
                <code className="rounded bg-muted px-1">docs/DISCORD-INTEGRATION-GUIDE.md</code>,{" "}
                <code className="rounded bg-muted px-1">docs/DISCORD-SERVER-INTEGRATION-REPORT.md</code>,{" "}
                <code className="rounded bg-muted px-1">docs/DISCORD-SERVER-MAP.md</code>,{" "}
                <code className="rounded bg-muted px-1">CHATGPT-V3-UPDATE.md</code>
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
