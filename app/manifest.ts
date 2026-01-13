import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Average at Best Battle League',
    short_name: 'AAB Battle League',
    description: 'Complete Pokémon Battle League platform with AI-powered insights, Discord integration, Showdown battle engine, and real-time analytics',
    start_url: '/',
    scope: '/',
    display: 'standalone', // Makes it feel like a native app (no browser UI)
    background_color: '#ffffff',
    theme_color: '#CC0000', // Pokémon Red
    orientation: 'portrait-primary',
    categories: ['games', 'entertainment'], // Helps with app store categorization
    shortcuts: [
      {
        name: 'Standings',
        short_name: 'Standings',
        description: 'View league standings',
        url: '/standings',
        icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Team Builder',
        short_name: 'Builder',
        description: 'Build your team',
        url: '/teams/builder',
        icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192' }],
      },
    ],
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
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
