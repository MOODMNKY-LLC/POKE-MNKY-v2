"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[App] Global error:", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>Something went wrong</h1>
          <p style={{ color: "#a3a3a3", marginBottom: "1.5rem" }}>
            We hit a snag loading the app. You can try again or go back home.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "none",
                borderRadius: "0.375rem",
                background: "#cc0000",
                color: "#fff",
                padding: "0.625rem 1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                borderRadius: "0.375rem",
                border: "1px solid #404040",
                color: "#fafafa",
                padding: "0.625rem 1rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
