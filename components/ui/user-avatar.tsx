'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GymLeaderBadge } from '@/components/ui/gym-leader-badge'
import { PokeballIcon } from '@/components/ui/pokeball-icon'
import { UserRole } from '@/lib/rbac'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  src?: string | null
  alt?: string
  fallback?: string
  role?: UserRole | string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showBadge?: boolean
  showPokeball?: boolean
  className?: string
}

const sizeMap = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
}

const badgeSizeMap = {
  xs: 'xs' as const,
  sm: 'xs' as const,
  md: 'sm' as const,
  lg: 'md' as const,
  xl: 'lg' as const,
}

/**
 * Enhanced User Avatar Component
 * 
 * Displays user avatar with optional:
 * - Gym Leader Badge (for coaches/commissioners/admins)
 * - Pokeball icon overlay (role indicator)
 */
export function UserAvatar({
  src,
  alt,
  fallback,
  role,
  size = 'md',
  showBadge = true,
  showPokeball = false,
  className,
}: UserAvatarProps) {
  const avatarSize = sizeMap[size]
  const badgeSize = badgeSizeMap[size]
  
  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={avatarSize}>
        <AvatarImage src={src || undefined} alt={alt} />
        <AvatarFallback className="text-xs">
          {fallback || 'U'}
        </AvatarFallback>
      </Avatar>
      
      {/* Gym Leader Badge - positioned bottom-right */}
      {showBadge && (
        <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
          <GymLeaderBadge role={role} size={badgeSize} />
        </div>
      )}
      
      {/* Pokeball Role Indicator - positioned top-right */}
      {showPokeball && (
        <div className="absolute -top-1 -right-1 rounded-full bg-background p-0.5">
          <PokeballIcon role={role} size={badgeSize} />
        </div>
      )}
    </div>
  )
}
