"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

interface AuthorizationDetails {
  client: {
    name: string
    id: string
  }
  scopes: string[]
}

function ConsentScreenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authorizationId, setAuthorizationId] = useState<string | null>(null)
  const [authDetails, setAuthDetails] = useState<AuthorizationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const id = searchParams.get("authorization_id")
    if (!id) {
      setError("Missing authorization_id parameter")
      setLoading(false)
      return
    }
    setAuthorizationId(id)
    checkAuthAndFetchDetails(id)
  }, [searchParams])

  const checkAuthAndFetchDetails = async (id: string) => {
    const supabase = createClient()

    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Session check error:", sessionError)
        setError("Failed to check authentication status")
        setLoading(false)
        return
      }

      if (!session) {
        // User not logged in - redirect to login with return URL
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      setIsAuthenticated(true)

      // Fetch authorization details
      // Note: These methods may need to be called via REST API if not available in JS client
      // Using type assertion to handle potential missing methods
      const authClient = supabase.auth as any

      if (authClient.oauth?.getAuthorizationDetails) {
        const { data, error: detailsError } = await authClient.oauth.getAuthorizationDetails(id)

        if (detailsError) {
          console.error("Authorization details error:", detailsError)
          setError(detailsError.message || "Failed to fetch authorization details")
          setLoading(false)
          return
        }

        if (data) {
          setAuthDetails(data)
        }
      } else {
        // Fallback: Try REST API call if methods don't exist
        console.warn("OAuth methods not available in client, trying REST API")
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorization/${id}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error_description || "Failed to fetch authorization details")
          setLoading(false)
          return
        }

        const data = await response.json()
        setAuthDetails(data)
      }

      setLoading(false)
    } catch (err) {
      console.error("Error in checkAuthAndFetchDetails:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!authorizationId) return

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/oauth/consent?authorization_id=${authorizationId}`,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  const handleApprove = async () => {
    if (!authorizationId) return

    setProcessing(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError("You must be logged in to approve authorization")
        setProcessing(false)
        return
      }

      const authClient = supabase.auth as any

      if (authClient.oauth?.approveAuthorization) {
        const { error: approveError } = await authClient.oauth.approveAuthorization(authorizationId)

        if (approveError) {
          console.error("Approve error:", approveError)
          setError(approveError.message || "Failed to approve authorization")
          setProcessing(false)
          return
        }

        // Success - Supabase will redirect automatically
        // No need to manually redirect
      } else {
        // Fallback: REST API call
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorization/${authorizationId}/approve`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              "Content-Type": "application/json",
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error_description || "Failed to approve authorization")
          setProcessing(false)
          return
        }

        // Redirect will be handled by Supabase
        const data = await response.json()
        if (data.redirect_uri) {
          window.location.href = data.redirect_uri
        }
      }
    } catch (err) {
      console.error("Approve error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setProcessing(false)
    }
  }

  const handleDeny = async () => {
    if (!authorizationId) return

    setProcessing(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError("You must be logged in to deny authorization")
        setProcessing(false)
        return
      }

      const authClient = supabase.auth as any

      if (authClient.oauth?.denyAuthorization) {
        const { error: denyError } = await authClient.oauth.denyAuthorization(authorizationId)

        if (denyError) {
          console.error("Deny error:", denyError)
          setError(denyError.message || "Failed to deny authorization")
          setProcessing(false)
          return
        }

        // Success - Supabase will redirect automatically
      } else {
        // Fallback: REST API call
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorization/${authorizationId}/deny`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              "Content-Type": "application/json",
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error_description || "Failed to deny authorization")
          setProcessing(false)
          return
        }

        // Redirect will be handled by Supabase
        const data = await response.json()
        if (data.redirect_uri) {
          window.location.href = data.redirect_uri
        }
      }
    } catch (err) {
      console.error("Deny error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading authorization request...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !authorizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-2 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Authorization Error
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not authenticated - show login prompt
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-2">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Sign In Required
            </CardTitle>
            <CardDescription>
              You need to sign in to authorize this application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}
            <Button onClick={handleLogin} className="w-full" size="lg">
              Sign In with Discord
            </Button>
            <div className="text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Return to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show consent screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Authorize Application
          </CardTitle>
          <CardDescription>
            {authDetails?.client?.name || "An application"} wants to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
              {error}
            </div>
          )}

          {authDetails && (
            <>
              {/* App Information */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Application</span>
                  <span className="text-sm font-semibold">{authDetails.client.name}</span>
                </div>

                {/* Requested Permissions */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Requested Permissions:</p>
                  <div className="space-y-2">
                    {authDetails.scopes && authDetails.scopes.length > 0 ? (
                      authDetails.scopes.map((scope) => (
                        <div
                          key={scope}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
                        >
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm capitalize">
                            {scope === "openid" ? "OpenID Connect" : scope === "email" ? "Email Address" : scope === "profile" ? "Profile Information" : scope}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific permissions requested</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDeny}
                  disabled={processing}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Deny
                    </>
                  )}
                </Button>
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  By approving, you allow {authDetails.client.name} to access your account information.
                  You can revoke access at any time.
                </p>
              </div>
            </>
          )}

          {!authDetails && !error && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Unable to load authorization details</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ConsentScreenContent />
    </Suspense>
  )
}
