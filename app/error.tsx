"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/states/error-state"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[App] Error:", error)
  }, [error])

  return (
    <ErrorState
      title="Something went wrong"
      description="We hit a snag loading this page. You can try again or go back home."
      primaryAction={<Button onClick={reset}>Try again</Button>}
      secondaryAction={
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      }
    />
  )
}
