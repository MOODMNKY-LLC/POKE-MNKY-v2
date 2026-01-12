import type React from "react"
import type { Metadata } from "next"
import { Fredoka, Permanent_Marker, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
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
  title: "Average at Best Draft League | Pokémon Competitive Platform",
  description:
    "Complete Pokémon Draft League platform with AI-powered insights, Discord integration, Showdown battle engine, and real-time analytics. Join the competitive scene today!",
  keywords: [
    "pokémon draft league",
    "competitive pokémon",
    "pokémon showdown",
    "draft league platform",
    "pokémon ai",
    "discord pokémon",
  ],
  openGraph: {
    title: "Average at Best Draft League",
    description: "Competitive Pokémon Draft League with AI insights and Discord integration",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Average at Best Draft League",
    description: "Competitive Pokémon Draft League platform",
  },
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${fredoka.variable} ${permanentMarker.variable} ${geistMono.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="relative flex min-h-screen flex-col">{children}</div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
