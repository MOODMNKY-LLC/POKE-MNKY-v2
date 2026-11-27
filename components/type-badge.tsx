import { POKEMON_TYPE_COLORS } from "@/lib/pokemon-type-colors"
import { cn } from "@/lib/utils"

interface TypeBadgeProps extends React.ComponentProps<"span"> {
  type: string
}

/** Pokemon type pill using the contrast-checked palette (text >= 4.5:1 on background). */
export function TypeBadge({ type, className, style, children, ...props }: TypeBadgeProps) {
  const colors = POKEMON_TYPE_COLORS[type.toLowerCase()] ?? POKEMON_TYPE_COLORS.normal
  return (
    <span
      data-slot="type-badge"
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize",
        className,
      )}
      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, ...style }}
      {...props}
    >
      {children ?? type}
    </span>
  )
}
