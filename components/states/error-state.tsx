import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title: string
  description: string
  primaryAction?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
}

export function ErrorState({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center",
        className,
      )}
    >
      <h1 className="font-marker text-3xl text-foreground sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{primaryAction}{secondaryAction}</div>
      )}
    </div>
  )
}

export function NotFoundRecoveryLinks() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button asChild>
        <Link href="/">Home</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/standings">Standings</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/draft/board">Draft board</Link>
      </Button>
    </div>
  )
}
