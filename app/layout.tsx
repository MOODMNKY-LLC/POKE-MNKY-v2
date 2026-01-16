import React from "react"
import type { Metadata, Viewport } from "next"
import { Fredoka, Permanent_Marker, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { PokepediaSyncProvider } from "@/components/pokepedia-sync-provider"
// Disable auto-start - sync should only be triggered manually by admins
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ConditionalHeader } from "@/components/conditional-header"
import { Suspense } from "react"
import "./globals.css"

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fredoka",
})
const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-marker",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Average at Best Battle League | Pokémon Competitive Platform",
  description:
    "Complete Pokémon Battle League platform with AI-powered insights, Discord integration, Showdown battle engine, and real-time analytics. Join the competitive scene today!",
  keywords: [
    "pokémon battle league",
    "competitive pokémon",
    "pokémon showdown",
    "battle league platform",
    "pokémon ai",
    "discord pokémon",
  ],
  openGraph: {
    title: "Average at Best Battle League",
    description: "Competitive Pokémon Battle League with AI insights and Discord integration",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Average at Best Battle League",
    description: "Competitive Pokémon Battle League platform",
  },
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AAB Battle League",
  },
  icons: {
    icon: [
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#CC0000" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  viewportFit: "cover", // Support for devices with notches
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth overflow-x-hidden" suppressHydrationWarning>
      <body
        className={`${fredoka.variable} ${permanentMarker.variable} ${geistMono.variable} font-sans antialiased overflow-x-hidden`}
      >
        {/* Branded background with dark/light mode support */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* Light mode background */}
          <div className="absolute inset-0 bg-[url('/league-bg-light.png')] bg-cover bg-center bg-no-repeat opacity-10 dark:hidden" />
          {/* Dark mode background */}
          <div className="absolute inset-0 hidden bg-[url('/league-bg-dark.png')] bg-cover bg-center bg-no-repeat opacity-15 dark:block" />
          {/* Overlay to maintain gray background and reduce gold hue from images */}
          <div className="absolute inset-0 bg-background/90 dark:bg-background/95" />
        </div>
        
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PokepediaSyncProvider autoStart={false}>
            <div className="flex min-h-screen flex-col relative">
              <ConditionalHeader />
              <main className="flex-1 w-full">{children}</main>
            </div>
          </PokepediaSyncProvider>
        </ThemeProvider>
        <Analytics />
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
      </body>
    </html>
  )
}
