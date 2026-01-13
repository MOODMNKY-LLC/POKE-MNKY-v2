/**
 * Pokeball Icon Component
 * Custom SVG pokeball icon
 */

import { cn } from "@/lib/utils"

interface PokeballIconProps {
  className?: string
  size?: number
}

export function PokeballIcon({ className, size = 24 }: PokeballIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("stroke-current", className)}
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path d="M12 2v20" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M7 12h10" strokeWidth="2" />
    </svg>
  )
}
