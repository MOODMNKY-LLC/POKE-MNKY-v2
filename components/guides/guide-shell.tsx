import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface GuideShellProps {
  title: string
  description?: string
  icon?: LucideIcon
  backHref?: string
  backLabel?: string
  children: React.ReactNode
  className?: string
}

/**
 * Shared chrome for dashboard guide pages.
 * Layout already provides DashboardHeader + breadcrumbs — do not add a second SidebarTrigger.
 */
export function GuideShell({
  title,
  description,
  icon: Icon,
  backHref = "/dashboard/settings?tab=guides",
  backLabel = "Back to Guides",
  children,
  className,
}: GuideShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6",
        className,
      )}
    >
      <header className="space-y-2">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-5" aria-hidden="true" />
            </div>
          ) : null}
          <div className="min-w-0 space-y-1">
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {description ? (
              <p className="text-pretty text-sm text-muted-foreground sm:text-base">{description}</p>
            ) : null}
          </div>
        </div>
      </header>
      <div className="min-w-0">{children}</div>
      <p className="pb-[max(0.5rem,env(safe-area-inset-bottom))] text-sm text-muted-foreground">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {backLabel}
        </Link>
      </p>
    </div>
  )
}
