"use client"

import { RealtimeChat } from "@/components/realtime/realtime-chat"
import { PokeMnkyAssistant } from "@/components/ui/poke-mnky-avatar"

interface DraftChatProps {
  sessionId: string
}

export function DraftChat({ sessionId }: DraftChatProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <PokeMnkyAssistant size={24} className="shrink-0" />
        Draft Chat
      </h3>
      <RealtimeChat channel={`draft:${sessionId}:chat`} />
    </div>
  )
}
