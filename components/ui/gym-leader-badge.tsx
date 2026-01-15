import Image from 'next/image'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/rbac'

interface GymLeaderBadgeProps {
  role?: UserRole | string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showOnlyFor?: UserRole[]
}

const sizeMap = {
  xs: 20,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

/**
 * Gym Leader Badge Component
 * 
 * Displays the gym leader badge for coaches and commissioners/admins.
 * Used to identify league leaders and coaches.
 * 
 * @param showOnlyFor - Array of roles that should display the badge (default: coach, commissioner, admin)
 */
export function GymLeaderBadge({ 
  role, 
  size = 'md', 
  className,
  showOnlyFor = [UserRole.COACH, UserRole.COMMISSIONER, UserRole.ADMIN]
}: GymLeaderBadgeProps) {
  const iconSize = sizeMap[size]
  
  // Only show badge for specified roles
  if (!role || !showOnlyFor.includes(role as UserRole)) {
    return null
  }
  
  return (
    <Image
      src="/gym-leader-badge.webp"
      alt="Gym Leader Badge"
      width={iconSize}
      height={iconSize}
      className={cn('inline-block', className)}
      unoptimized
    />
  )
}
