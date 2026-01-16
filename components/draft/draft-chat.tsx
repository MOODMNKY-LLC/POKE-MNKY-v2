"use client"

import { RealtimeChat } from "@/components/realtime/realtime-chat"

interface DraftChatProps {
  sessionId: string
}

export function DraftChat({ sessionId }: DraftChatProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Draft Chat</h3>
      <RealtimeChat channel={`draft:${sessionId}:chat`} />
    </div>
  )
}
