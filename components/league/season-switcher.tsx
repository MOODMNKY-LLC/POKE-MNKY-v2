import type { StandingsSeasonRow } from "@/lib/standings-season"

export function SeasonSwitcher({
  seasons,
  selectedId,
  action,
  inputId,
}: {
  seasons: StandingsSeasonRow[]
  selectedId: string | null
  action: string
  inputId: string
}) {
  if (seasons.length === 0) return null

  return (
    <form action={action} className="flex items-center gap-2">
      <label htmlFor={inputId} className="sr-only">
        Season
      </label>
      <select
        id={inputId}
        name="season"
        defaultValue={selectedId ?? ""}
        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
      >
        {seasons.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
            {option.is_live_competitive ? " (live)" : ""}
            {option.is_current ? " (current)" : ""}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="h-8 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
      >
        Show
      </button>
    </form>
  )
}
