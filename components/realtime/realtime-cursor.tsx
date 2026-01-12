"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"

interface Cursor {
  x: number
  y: number
  user: string
  color: string
}

export function RealtimeCursor({ channel }: { channel: string }) {
  const [cursors, setCursors] = useState<Record<string, Cursor>>({})
  const supabase = createBrowserClient()

  useEffect(() => {
    const cursorChannel = supabase
      .channel(channel)
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        setCursors((prev) => ({
          ...prev,
          [payload.id]: payload,
        }))
      })
      .subscribe()

    const handleMouseMove = (e: MouseEvent) => {
      cursorChannel.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          id: supabase.auth.getUser().then(({ data }) => data.user?.id),
          x: e.clientX,
          y: e.clientY,
          user: "User",
          color: "#3b82f6",
        },
      })
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cursorChannel.unsubscribe()
    }
  }, [channel])

  return (
    <>
      {Object.values(cursors).map((cursor) => (
        <div
          key={cursor.user}
          className="pointer-events-none fixed z-50 transition-all"
          style={{
            left: cursor.x,
            top: cursor.y,
            color: cursor.color,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" />
          </svg>
          <span className="ml-2 text-xs font-medium">{cursor.user}</span>
        </div>
      ))}
    </>
  )
}
