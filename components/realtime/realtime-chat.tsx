"use client"

import { useEffect, useState, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"

interface Message {
  id: string
  user: string
  message: string
  timestamp: number
}

export function RealtimeChat({ channel }: { channel: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [user, setUser] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const chatChannel = supabase
      .channel(channel)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload])
      })
      .subscribe()

    return () => {
      chatChannel.unsubscribe()
    }
  }, [channel])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim() || !user) return

    const message: Message = {
      id: Math.random().toString(36),
      user: user.email || "Anonymous",
      message: newMessage,
      timestamp: Date.now(),
    }

    supabase.channel(channel).send({
      type: "broadcast",
      event: "message",
      payload: message,
    })

    setNewMessage("")
  }

  return (
    <Card className="p-4 h-96 flex flex-col">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="p-2 bg-muted rounded-lg">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm">{msg.user}</span>
                <span className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm mt-1">{msg.message}</p>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
