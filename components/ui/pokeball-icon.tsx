import Image from 'next/image'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/rbac'

interface PokeballIconProps {
  role?: UserRole | string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  variant?: 'normal' | 'ultra' | 'master' | 'auto'
}

const sizeMap = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
}

/**
 * Pokeball Icon Component
 * 
 * Displays pokeball icons based on user role:
 * - Viewer: Normal Pokeball
 * - Coach: Ultra Ball
 * - Commissioner/Admin: Master Ball
 * 
 * Can also be used with explicit variant prop
 */
export function PokeballIcon({ 
  role, 
  size = 'md', 
  className,
  variant = 'auto'
}: PokeballIconProps) {
  const iconSize = sizeMap[size]
  
  // Determine pokeball type based on role or variant
  let pokeballType: 'normal' | 'ultra' | 'master'
  
  if (variant !== 'auto') {
    pokeballType = variant
  } else if (role === UserRole.ADMIN || role === UserRole.COMMISSIONER) {
    pokeballType = 'master'
  } else if (role === UserRole.COACH) {
    pokeballType = 'ultra'
  } else {
    pokeballType = 'normal'
  }
  
  const src = `/pokeball-${pokeballType}.svg`
  
  return (
    <Image
      src={src}
      alt={`${pokeballType} pokeball`}
      width={iconSize}
      height={iconSize}
      className={cn('inline-block', className)}
      unoptimized
    />
  )
}
