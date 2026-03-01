"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface RestartOnboardingButtonProps {
  className?: string
}

export function RestartOnboardingButton({ className }: RestartOnboardingButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRestart = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/coach-onboarding/reset", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Failed to reset onboarding")
        return
      }
      toast.success("Onboarding reset. Redirecting…")
      router.push("/dashboard/onboarding")
      router.refresh()
    } catch {
      toast.error("Failed to reset onboarding. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRestart}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4" />
      )}
      <span className="ml-2 shrink-0">{loading ? "Resetting…" : "Restart coach onboarding"}</span>
    </Button>
  )
}
