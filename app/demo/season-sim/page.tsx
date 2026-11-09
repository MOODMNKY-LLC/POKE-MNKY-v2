"use client"

/**
 * Demo operator console — NOT the full league admin surface.
 * Auth: session + SIM_DEMO_OPERATOR_ALLOWLIST (when gate ON).
 * Hidden when SIM_SANDBOX_V2 is off (API returns 503).
 */

import { SimConsole } from "@/components/season-sim/sim-console"

export default function DemoSeasonSimPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SimConsole />
    </div>
  )
}
