"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Radio, CheckCircle2, Loader2, Send } from "lucide-react"

export function RealtimeStatus() {
  const [connected, setConnected] = useState(false)
  const [lastBroadcast, setLastBroadcast] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    // Subscribe to Realtime channel to test connection
    const channel = supabase
      .channel("draft-board-updates-test")
      .on(
        "broadcast",
        { event: "draft_board_synced" },
        (payload) => {
          setLastBroadcast(new Date().toISOString())
          setConnected(true)
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true)
        } else if (status === "CHANNEL_ERROR") {
          setConnected(false)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [supabase])

  async function testBroadcast() {
    setTesting(true)
    try {
      const response = await fetch("/api/admin/test-realtime-broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send test broadcast")
      }

      toast({
        title: "Success",
        description: "Test broadcast sent",
      })

      // Wait a moment for broadcast to arrive
      setTimeout(() => {
        setLastBroadcast(new Date().toISOString())
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test broadcast",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Realtime Status
        </CardTitle>
        <CardDescription>
          Supabase Realtime connection and broadcast status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status</span>
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Connecting...
                </>
              )}
            </Badge>
          </div>

          {lastBroadcast && (
            <div className="text-xs text-muted-foreground">
              Last broadcast: {new Date(lastBroadcast).toLocaleString()}
            </div>
          )}

          {!connected && (
            <Alert>
              <AlertDescription className="text-xs">
                Realtime connection not established. Check Supabase configuration.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Button
          onClick={testBroadcast}
          disabled={testing || !connected}
          variant="outline"
          className="w-full"
          size="sm"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Test Broadcast
            </>
          )}
        </Button>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>
            Realtime broadcasts notify all connected clients when draft board sync completes.
            Clients automatically update their UI without page refresh.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
