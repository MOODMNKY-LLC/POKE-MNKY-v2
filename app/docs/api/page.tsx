"use client"

import { useEffect, useState } from "react"
import { Loader2, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export default function ApiDocsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Get docs URL from environment variable with fallback
  const docsUrl =
    process.env.NEXT_PUBLIC_POKEAPI_DOCS_URL || "https://pokeapi-docs.moodmnky.com"

  useEffect(() => {
    // Set a timeout to detect if iframe fails to load
    const timeout = setTimeout(() => {
      if (isLoading) {
        setHasError(true)
        setErrorMessage("Documentation failed to load. Please try again or visit the site directly.")
        setIsLoading(false)
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  const handleIframeLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setHasError(true)
    setErrorMessage("Unable to load documentation. Please check your connection.")
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full">
      {/* Header Bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-marker">PokéAPI Documentation</h1>
          <p className="text-sm text-muted-foreground">
            Complete API reference for Pokémon data endpoints
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="gap-2"
        >
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </a>
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative">
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to Load Documentation</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>{errorMessage}</p>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHasError(false)
                      setIsLoading(true)
                      // Force iframe reload by changing key
                      window.location.reload()
                    }}
                  >
                    Retry
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                      Open Directly
                    </a>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading documentation...</p>
              </div>
            )}
            <iframe
              src={docsUrl}
              className="w-full h-full border-0"
              title="PokéAPI Documentation"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              allow="fullscreen"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </>
        )}
      </div>
    </div>
  )
}
