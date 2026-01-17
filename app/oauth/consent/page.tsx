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
  const [approved, setApproved] = useState(false) // Prevent double-click
  const [authorizationAge, setAuthorizationAge] = useState<number | null>(null) // Track age in minutes
  const [authorizationStartTime, setAuthorizationStartTime] = useState<number | null>(null) // Track when we first saw it

  // Check environment variables on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Missing Supabase configuration. Please check environment variables.")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return

    const id = searchParams.get("authorization_id")
    if (!id) {
      setError("Missing authorization_id parameter")
      setLoading(false)
      return
    }
    setAuthorizationId(id)
    setAuthorizationStartTime(Date.now()) // Track when we first see the authorization
    checkAuthAndFetchDetails(id)
    
    // Check authorization age periodically (every 30 seconds)
    const ageInterval = setInterval(() => {
      if (id && authorizationStartTime) {
        const ageMinutes = Math.floor((Date.now() - authorizationStartTime) / 60000)
        setAuthorizationAge(ageMinutes)
        
        // If authorization is getting old, re-validate it
        if (ageMinutes > 8) {
          checkAuthorizationAge(id)
        }
      }
    }, 30000)

    return () => clearInterval(ageInterval)
  }, [searchParams, authorizationStartTime])

  // Check authorization age/validity periodically
  const checkAuthorizationAge = async (id: string) => {
    try {
      const supabase = createClient()
      const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(id)
      
      if (detailsError || !data || !data.client) {
        setError("Authorization request expired. Please start the authorization flow again from the application.")
        setAuthDetails(null)
      }
    } catch (err) {
      // Ignore errors in age check - don't disrupt user experience
      console.warn("Authorization age check failed:", err)
    }
  }

  const checkAuthAndFetchDetails = async (id: string) => {
    try {
      const supabase = createClient()

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

      // Fetch authorization details using official Supabase SDK method
      // Reference: https://supabase.com/docs/reference/javascript/auth-admin-oauth-getauthorizationdetails
      const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(id)

      if (detailsError) {
        console.error("Authorization details error:", detailsError)
        console.error("Error code:", detailsError.status)
        console.error("Authorization ID:", id)
        console.error("Session user:", session?.user?.id)
        
        // Provide helpful error messages with diagnostics
        if (detailsError.message?.includes("not found") || detailsError.message?.includes("invalid")) {
          setError(
            "Invalid or expired authorization request. This could mean:\n" +
            "1. The authorization request expired (they expire after ~10 minutes)\n" +
            "2. OAuth Server is not enabled in Supabase Dashboard\n" +
            "3. Authorization path mismatch (check Supabase Dashboard → Auth → OAuth Server)\n" +
            "4. The authorization_id is invalid\n\n" +
            "Please start the authorization flow again from the application."
          )
        } else if (detailsError.status === 404) {
          setError(
            "Authorization request not found. Possible causes:\n" +
            "• OAuth Server not enabled in Supabase Dashboard\n" +
            "• Authorization path mismatch (should be '/oauth/consent')\n" +
            "• Authorization request expired\n\n" +
            "Check: Supabase Dashboard → Authentication → OAuth Server"
          )
        } else if (detailsError.status === 401) {
          setError("Authentication required. Please ensure you're logged in with a valid session.")
        } else {
          setError(
            `${detailsError.message || "Failed to fetch authorization details"}\n\n` +
            `Error code: ${detailsError.status || "unknown"}\n` +
            `Check browser console for more details.`
          )
        }
        setLoading(false)
        return
      }

      if (data) {
        setAuthDetails(data)
      } else {
        setError("No authorization details received. The authorization request may be invalid.")
        setLoading(false)
        return
      }

      setLoading(false)
    } catch (err) {
      console.error("Error in checkAuthAndFetchDetails:", err)
      if (err instanceof Error && err.message.includes("Supabase client")) {
        setError("Failed to initialize authentication. Please refresh the page.")
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!authorizationId) return

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/oauth/consent?authorization_id=${authorizationId}`
            : `/oauth/consent?authorization_id=${authorizationId}`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Failed to initiate login")
    }
  }

  const handleApprove = async () => {
    if (!authorizationId || approved) return // Prevent double-click

    setProcessing(true)
    setError(null)
    setApproved(true) // Disable button immediately to prevent double-click

    try {
      const supabase = createClient()
      
      // CRITICAL: Re-check session before approving
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !currentSession) {
        setError("Session expired. Please log in again.")
        setProcessing(false)
        setApproved(false) // Re-enable on error
        return
      }

      // CRITICAL: Re-verify authorization is still valid before approving
      const { data: details, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)

      if (detailsError || !details || !details.client) {
        setError("Authorization request expired or invalid. Please start the authorization flow again from the application.")
        setProcessing(false)
        setApproved(false) // Re-enable on error
        return
      }

      // Use official Supabase SDK method as per documentation
      // Reference: https://supabase.com/docs/reference/javascript/auth-admin-oauth-approveauthorization
      const { data, error: approveError } = await supabase.auth.oauth.approveAuthorization(authorizationId)

      if (approveError) {
        console.error("Approve authorization error:", approveError)
        
        // Enhanced error handling for common 400 errors
        if (approveError.message?.includes("cannot be processed")) {
          setError("Authorization request expired or already processed. Please start the authorization flow again from the application.")
        } else if (approveError.message?.includes("expired") || approveError.message?.includes("invalid")) {
          setError("Authorization request expired or invalid. Please start the authorization flow again from the application.")
        } else if (approveError.message?.includes("unauthorized") || approveError.message?.includes("session")) {
          setError("Your session has expired. Please sign in again.")
        } else {
          setError(approveError.message || "Failed to approve authorization. Please try again.")
        }
        setProcessing(false)
        setApproved(false) // Re-enable on error
        return
      }

      // The SDK method returns { data: { redirect_to: string } }
      // We must redirect the user to this URL to complete the OAuth flow
      if (data?.redirect_to && typeof window !== 'undefined') {
        window.location.href = data.redirect_to
      } else {
        // Fallback: if no redirect_to, show error
        setError("Authorization approved but no redirect URL received. Please contact support.")
        setProcessing(false)
        setApproved(false) // Re-enable on error
      }
    } catch (err) {
      console.error("Approve error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred while approving authorization")
      setProcessing(false)
      setApproved(false) // Re-enable on error
    }
  }

  const handleDeny = async () => {
    if (!authorizationId || approved) return // Prevent action if already approved

    setProcessing(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError("You must be logged in to deny authorization. Please sign in first.")
        setProcessing(false)
        return
      }

      // Use official Supabase SDK method as per documentation
      // Reference: https://supabase.com/docs/reference/javascript/auth-admin-oauth-denyauthorization
      const { data, error: denyError } = await supabase.auth.oauth.denyAuthorization(authorizationId)

      if (denyError) {
        console.error("Deny authorization error:", denyError)
        
        // Provide helpful error messages
        if (denyError.message?.includes("cannot be processed") || denyError.message?.includes("expired")) {
          setError("This authorization request has expired or is invalid.")
        } else {
          setError(denyError.message || "Failed to deny authorization. Please try again.")
        }
        setProcessing(false)
        return
      }

      // The SDK method returns { data: { redirect_to: string } }
      // We must redirect the user to this URL to complete the OAuth flow
      if (data?.redirect_to && typeof window !== 'undefined') {
        window.location.href = data.redirect_to
      } else {
        // Fallback: if no redirect_to, show success message
        setError("Authorization denied. You can close this window.")
        setProcessing(false)
      }
    } catch (err) {
      console.error("Deny error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred while denying authorization")
      setProcessing(false)
    }
  }

  const handleStartOver = () => {
    // Redirect to Open WebUI auth page to restart flow
    // Or redirect to home page if we don't know the client app
    if (typeof window !== 'undefined') {
      // Try to redirect to a common auth page, or home
      window.location.href = "https://aab-gpt.moodmnky.com/auth"
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
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium mb-1">Error</p>
                  <p className="whitespace-pre-line">{error}</p>
                  
                  {/* Show "Start Over" button for expired/invalid errors */}
                  {(error.includes("expired") || error.includes("invalid") || error.includes("not found") || error.includes("cannot be processed")) && (
                    <Button
                      onClick={handleStartOver}
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                    >
                      Start Over
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* App Information - Show if available */}
          {authDetails && authDetails.client && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Application</span>
                <span className="text-sm font-semibold">{authDetails.client?.name || "Unknown Application"}</span>
              </div>

              {/* Requested Permissions */}
              {authDetails.scopes && authDetails.scopes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Requested Permissions:</p>
                  <div className="space-y-2">
                    {authDetails.scopes.map((scope) => (
                      <div
                        key={scope}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm capitalize">
                          {scope === "openid" ? "OpenID Connect" : scope === "email" ? "Email Address" : scope === "profile" ? "Profile Information" : scope}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show message if details aren't loaded */}
          {!authDetails && !error && !loading && (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">Unable to load authorization details</p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleStartOver} variant="default" className="w-full">
                  Start Over
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Return to Home</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons - ALWAYS SHOW */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleApprove}
              disabled={processing || approved || !authorizationId || !isAuthenticated || !authDetails?.client}
              className="w-full"
              size="lg"
            >
              {approved ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : processing ? (
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
              disabled={processing || approved || !authorizationId}
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

          {/* Authorization age warning */}
          {authorizationAge !== null && authorizationAge > 8 && authDetails?.client && (
            <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm text-yellow-600 dark:text-yellow-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  ⚠️ This authorization request is getting old ({authorizationAge} minutes). 
                  Please approve soon to avoid expiration.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              By approving, you allow {authDetails?.client?.name || "this application"} to access your account information.
              You can revoke access at any time.
            </p>
          </div>

          {/* Error state with return button */}
          {error && !authorizationId && (
            <div className="text-center pt-4">
              <Button asChild variant="outline" className="w-full">
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
