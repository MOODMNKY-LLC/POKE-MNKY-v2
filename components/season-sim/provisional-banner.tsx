import { FlaskConical } from "lucide-react"

export function ProvisionalBanner({ disclaimer }: { disclaimer?: string | null }) {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-pretty">
          Provisional statistical demo (provisional_demo_v0) — seeded statistical results, NOT Pokémon battle
          simulation; sandbox data only; rules not league-approved
        </p>
        {disclaimer ? <p className="text-pretty">{disclaimer}</p> : null}
      </div>
    </div>
  )
}
