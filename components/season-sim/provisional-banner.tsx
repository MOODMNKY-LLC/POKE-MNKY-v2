import { FlaskConical } from "lucide-react"

const WARNING =
  "Provisional and not league-approved. Results are statistical, not Pokémon Showdown battles, and the data is sandbox data, not live Season 7 or Season 8."

const WARNING_VOCABULARY =
  /\b(provisional|not|league|approved|statistical|sandbox|only|this|is|and|it|results?|data|simulation|pok[eé]mon|showdown|battles?|live|season|7|8|or|the|a|rules?|demo)\b/gi

function repeatsWarning(text: string) {
  if (text.includes("provisional_demo_v0")) return true
  const leftover = text.replace(WARNING_VOCABULARY, "").replace(/[^\p{L}\p{N}]+/gu, "")
  return leftover.length === 0
}

export function ProvisionalBanner({ disclaimer }: { disclaimer?: string | null }) {
  const extra = disclaimer && !repeatsWarning(disclaimer) ? disclaimer : null

  return (
    <div
      role="note"
      className="flex gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-pretty">{WARNING}</p>
        {extra ? <p className="text-pretty">{extra}</p> : null}
      </div>
    </div>
  )
}
