import type { Metadata } from "next"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Damage Calculator",
}

const CALC_URL = "https://aab-calc.moodmnky.com"

export default function DashboardCalcPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Damage Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Full-featured calculator with all generations, items, abilities and field effects.
          </p>
        </div>
        <Button variant="outline" asChild className="max-md:h-11">
          <a href={CALC_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden="true" />
            Open in new tab
          </a>
        </Button>
      </div>
      <div className="min-h-[600px] flex-1 overflow-hidden rounded-lg border">
        <iframe
          src={CALC_URL}
          title="Pokémon Damage Calculator"
          allow="fullscreen"
          className="size-full min-h-[600px] border-0"
        />
      </div>
    </div>
  )
}
