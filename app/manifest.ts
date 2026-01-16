import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Average at Best Battle League',
    short_name: 'AAB Battle League',
    description: 'Competitive Pokémon Battle League platform with AI-powered insights, Discord integration, and real-time analytics',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#CC0000',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['games', 'entertainment', 'sports'],
    screenshots: [
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Battle League Home',
      },
    ],
    shortcuts: [
      {
        name: 'Standings',
        short_name: 'Standings',
        description: 'View league standings',
        url: '/standings',
        icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Teams',
        short_name: 'Teams',
        description: 'View all teams',
        url: '/teams',
        icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Schedule',
        short_name: 'Schedule',
        description: 'View match schedule',
        url: '/schedule',
        icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192' }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  }
}
