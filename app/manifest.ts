import type { MetadataRoute } from 'next'
import { PWA_THEME_COLORS } from '@/lib/pwa/theme-colors'

const shortcutIcons = [{ src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }]

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Average at Best Battle League',
    short_name: 'AAB League',
    description: 'Discord-first Pokémon draft league with standings, draft room, coach tools, and weekly match prep',
    start_url: '/dashboard?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: PWA_THEME_COLORS.light,
    theme_color: PWA_THEME_COLORS.light,
    icons: [
      { src: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { src: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    categories: ['games', 'entertainment', 'sports'],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Coach dashboard overview',
        url: '/dashboard',
        icons: shortcutIcons,
      },
      {
        name: 'My team',
        short_name: 'My team',
        description: 'Your league team and roster',
        url: '/dashboard/league-team',
        icons: shortcutIcons,
      },
      {
        name: 'This week',
        short_name: 'This week',
        description: 'Match prep and battle plan',
        url: '/dashboard/weekly-matches',
        icons: shortcutIcons,
      },
      {
        name: 'Damage calculator',
        short_name: 'Calc',
        description: 'Showdown damage calculator',
        url: '/dashboard/calc',
        icons: shortcutIcons,
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  }
}
